import { encodeFunctionData, parseUnits, formatUnits, type PublicClient } from 'viem';
import { ALLOWED_CONTRACTS, assertAllowlisted, type Address } from '@sherpa/safety';
import { fetchPythPriceUsd, type PythConfig } from './pyth.js';
import type { BuildTx, BuiltTx, Quote, ToolAdapter, Verify } from './types.js';

/**
 * Uniswap V3 BUY adapter — Base Sepolia.
 *
 * Stage-1 path: USDC -> WETH (single-hop, 0.05% pool). The user expresses
 * intent in USD ("buy $50 of eth"); we treat USD == USDC.
 *
 * `quote()` has three tiers, in order of fidelity:
 *   1. Real RPC (`deps.client`) → Quoter v2 simulation. Most accurate.
 *   2. Pyth Hermes (`deps.pyth`)  → free HTTPS price feed; better than the
 *      stub when RPC is unreachable.
 *   3. Hard-coded 1 ETH = 3000 USDC stub. Last resort for offline tests.
 *
 * `buildTx()` is fully deterministic (no RPC) — calldata for
 * SwapRouter02.exactInputSingle.
 */

export type BuyParams = {
  /** USD amount the user wants to spend, e.g. "50". */
  usd: string;
  /** Asset they want to buy. Stage 1 only supports 'ETH'. */
  asset: 'ETH';
  /** Recipient (smart wallet) address — funded with the bought asset. */
  recipient: Address;
  /** Slippage tolerance in basis points (default 50 = 0.5%). */
  slippageBps?: number;
};

export type BuyQuote = {
  asset: 'ETH';
  amountInBaseUnits: bigint;
  amountOutBaseUnits: bigint;
  /** Human display: "0.0142 ETH for $50.00". */
  display: string;
  /** Pool fee tier used (3000 = 0.3%, 500 = 0.05%). */
  feeTier: number;
};

const DEFAULT_FEE_TIER = 500; // 0.05% USDC/WETH pool
const DEFAULT_SLIPPAGE_BPS = 50; // 0.5%

const QUOTER_V2_ABI = [
  {
    type: 'function',
    name: 'quoteExactInputSingle',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'tokenIn', type: 'address' },
          { name: 'tokenOut', type: 'address' },
          { name: 'amountIn', type: 'uint256' },
          { name: 'fee', type: 'uint24' },
          { name: 'sqrtPriceLimitX96', type: 'uint160' },
        ],
      },
    ],
    outputs: [
      { name: 'amountOut', type: 'uint256' },
      { name: 'sqrtPriceX96After', type: 'uint160' },
      { name: 'initializedTicksCrossed', type: 'uint32' },
      { name: 'gasEstimate', type: 'uint256' },
    ],
  },
] as const;

const SWAP_ROUTER_ABI = [
  {
    type: 'function',
    name: 'exactInputSingle',
    stateMutability: 'payable',
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'tokenIn', type: 'address' },
          { name: 'tokenOut', type: 'address' },
          { name: 'fee', type: 'uint24' },
          { name: 'recipient', type: 'address' },
          { name: 'amountIn', type: 'uint256' },
          { name: 'amountOutMinimum', type: 'uint256' },
          { name: 'sqrtPriceLimitX96', type: 'uint160' },
        ],
      },
    ],
    outputs: [{ name: 'amountOut', type: 'uint256' }],
  },
] as const;

/** Approximate quote (1 ETH ≈ 3000 USDC) used when no RPC client is given. */
function stubAmountOut(amountInUsdcBaseUnits: bigint): bigint {
  // amountIn USDC (1e6) → ETH (1e18). 1 ETH = 3000 USDC ⇒ wei = usdc * 1e18 / (3000 * 1e6)
  return (amountInUsdcBaseUnits * 10n ** 18n) / 3_000_000_000n;
}

/**
 * Convert a USDC amount (1e6) to a wei amount (1e18) using a Pyth-derived
 * USD-per-ETH price. Inverse of `1 ETH = priceUsd USDC`:
 *   wei = usdc * 1e18 / (priceUsd * 1e6)
 * We multiply priceUsd by 1e8 first to keep precision in BigInt math.
 */
function pythAmountOut(amountInUsdcBaseUnits: bigint, priceUsdPerEth: number): bigint {
  const priceScaled = BigInt(Math.round(priceUsdPerEth * 1e8));
  if (priceScaled <= 0n) return 0n;
  return (amountInUsdcBaseUnits * 10n ** 18n * 100n) / priceScaled;
}

export type UniswapDeps = {
  /** Optional viem client for live Quoter calls (tier 1 — most accurate). */
  client?: PublicClient;
  /**
   * Optional Pyth fallback (tier 2). When `client` is unavailable the
   * adapter tries Pyth Hermes for a real-time USD/ETH price before falling
   * back to the hard-coded stub. Pass `false` to disable explicitly (e.g. in
   * unit tests that want deterministic stub output).
   */
  pyth?: PythConfig | false;
};

export function makeUniswap(deps: UniswapDeps = {}): ToolAdapter<BuyParams, BuyQuote, BuyParams> {
  const quote: Quote<BuyParams, BuyQuote> = async (params) => {
    if (params.asset !== 'ETH') {
      throw new Error(`[uniswap] unsupported asset ${params.asset}`);
    }
    const amountIn = parseUnits(params.usd, 6); // USDC = 6dp

    let amountOut: bigint;
    if (deps.client) {
      const result = (await deps.client.simulateContract({
        address: ALLOWED_CONTRACTS.UNISWAP_QUOTER,
        abi: QUOTER_V2_ABI,
        functionName: 'quoteExactInputSingle',
        args: [
          {
            tokenIn: ALLOWED_CONTRACTS.USDC,
            tokenOut: ALLOWED_CONTRACTS.WETH,
            amountIn,
            fee: DEFAULT_FEE_TIER,
            sqrtPriceLimitX96: 0n,
          },
        ],
      })) as unknown as { result: readonly [bigint, bigint, number, bigint] };
      amountOut = result.result[0];
    } else {
      // Tier 2: Pyth Hermes. Tier 3 (stub) only if Pyth is disabled or fails.
      const pythPrice =
        deps.pyth === false ? null : await fetchPythPriceUsd('ETH/USD', deps.pyth ?? {});
      amountOut = pythPrice !== null ? pythAmountOut(amountIn, pythPrice) : stubAmountOut(amountIn);
    }

    return {
      asset: 'ETH',
      amountInBaseUnits: amountIn,
      amountOutBaseUnits: amountOut,
      feeTier: DEFAULT_FEE_TIER,
      display: `${formatUnits(amountOut, 18).slice(0, 8)} ETH for $${Number(params.usd).toFixed(2)}`,
    };
  };

  const buildTx: BuildTx<BuyParams> = async (params) => {
    const amountIn = parseUnits(params.usd, 6);
    // Always go through quote() so the same tier order (RPC → Pyth → stub)
    // determines the slippage floor used in calldata.
    const expectedOut = (await quote(params)).amountOutBaseUnits;
    const slippageBps = BigInt(params.slippageBps ?? DEFAULT_SLIPPAGE_BPS);
    const amountOutMinimum = (expectedOut * (10_000n - slippageBps)) / 10_000n;

    const data = encodeFunctionData({
      abi: SWAP_ROUTER_ABI,
      functionName: 'exactInputSingle',
      args: [
        {
          tokenIn: ALLOWED_CONTRACTS.USDC,
          tokenOut: ALLOWED_CONTRACTS.WETH,
          fee: DEFAULT_FEE_TIER,
          recipient: params.recipient,
          amountIn,
          amountOutMinimum,
          sqrtPriceLimitX96: 0n,
        },
      ],
    });

    const tx: BuiltTx = {
      to: ALLOWED_CONTRACTS.UNISWAP_ROUTER,
      data,
      value: 0n,
      sponsorable: true,
    };
    assertAllowlisted(tx.to);
    return tx;
  };

  const verify: Verify = async (tx) => {
    if (tx.to.toLowerCase() !== ALLOWED_CONTRACTS.UNISWAP_ROUTER.toLowerCase()) {
      return { ok: false, reason: 'target is not Uniswap router' };
    }
    if (tx.value !== 0n) {
      return { ok: false, reason: 'BUY via USDC must have value=0' };
    }
    // exactInputSingle selector = 0x04e45aaf
    if (!tx.data.startsWith('0x04e45aaf')) {
      return { ok: false, reason: 'calldata is not exactInputSingle' };
    }
    return { ok: true };
  };

  return { name: 'uniswap', quote, buildTx, verify };
}

export const uniswap = makeUniswap();
