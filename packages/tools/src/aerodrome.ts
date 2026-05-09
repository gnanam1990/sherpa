import { encodeFunctionData, formatUnits, parseUnits, toFunctionSelector } from 'viem';
import {
  AERODROME_ROUTER_ADDRESS,
  ALLOWED_CONTRACTS,
  assertAllowlisted,
  type Address,
} from '@sherpa/safety';
import { fetchPythPriceUsd, type PythConfig } from './pyth.js';
import type { BuildTx, BuiltTx, Quote, ToolAdapter, Verify } from './types.js';

/**
 * Aerodrome SWAP adapter — Base. Stage-2 prep, NOT wired into the
 * executor for Stage 1 launch.
 *
 * Pattern matches `uniswap.ts`: `quote/buildTx/verify` shape with a
 * configured `routerAddress` exposed on the adapter so the executor (or a
 * future SWAP planner) can gate on it. Until `AERODROME_ROUTER_ADDRESS` is
 * set in @sherpa/safety, every code path that builds an Aerodrome tx
 * throws `AerodromeNotConfiguredError`.
 *
 * Stage-1 SWAP target is USDC ↔ ETH only; the param shape is general
 * enough to extend (arbitrary `fromAsset`/`toAsset`) when LP / multi-hop
 * lands in Stage 3+.
 *
 * Quote tier order is the same as Uniswap's:
 *   1. Real RPC (not yet — Stage 2 wires the Aerodrome quoter view fn)
 *   2. Pyth Hermes for ETH/USD  → infer the other side from amountIn
 *   3. Hard-coded 1 ETH ≈ 3000 USDC stub
 */

export class AerodromeNotConfiguredError extends Error {
  constructor() {
    super('Aerodrome router address not yet configured for this chain');
    this.name = 'AerodromeNotConfiguredError';
  }
}

export type SwapAsset = 'USDC' | 'ETH';

export type SwapParams = {
  /** Amount of `fromAsset` to spend, in display units ("100" = 100 USDC). */
  amountIn: string;
  fromAsset: SwapAsset;
  toAsset: SwapAsset;
  recipient: Address;
  /** Slippage tolerance in basis points (default 50 = 0.5%). */
  slippageBps?: number;
  /** Unix-seconds deadline (default now + 600s). */
  deadline?: number;
};

export type SwapQuote = {
  fromAsset: SwapAsset;
  toAsset: SwapAsset;
  amountInBaseUnits: bigint;
  amountOutBaseUnits: bigint;
  /** Human display: "0.025 ETH for 100 USDC". */
  display: string;
  /** Routing description, e.g. "USDC->WETH (volatile)". */
  route: string;
};

const DEFAULT_SLIPPAGE_BPS = 50;
const DEFAULT_DEADLINE_SECONDS = 600;
const STUB_ETH_USD_PRICE = 3000;

/** Aerodrome Router.swapExactTokensForTokens. `Route[]` is `(from, to, stable, factory)`. */
const AERODROME_ROUTER_ABI = [
  {
    type: 'function',
    name: 'swapExactTokensForTokens',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'amountOutMin', type: 'uint256' },
      {
        name: 'routes',
        type: 'tuple[]',
        components: [
          { name: 'from', type: 'address' },
          { name: 'to', type: 'address' },
          { name: 'stable', type: 'bool' },
          { name: 'factory', type: 'address' },
        ],
      },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' },
    ],
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
  },
] as const;

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as Address;
const SWAP_EXACT_TOKENS_SELECTOR = toFunctionSelector(AERODROME_ROUTER_ABI[0]);

function decimalsFor(asset: SwapAsset): number {
  return asset === 'USDC' ? 6 : 18;
}

function tokenAddressFor(asset: SwapAsset): Address {
  return asset === 'USDC' ? ALLOWED_CONTRACTS.USDC : ALLOWED_CONTRACTS.WETH;
}

/** Convert amountIn to amountOut using a USD-per-ETH price. */
function priceConvert(
  amountInBaseUnits: bigint,
  fromAsset: SwapAsset,
  toAsset: SwapAsset,
  ethUsd: number,
): bigint {
  const priceScaled = BigInt(Math.round(ethUsd * 1e8));
  if (priceScaled <= 0n) return 0n;
  if (fromAsset === toAsset) return amountInBaseUnits;
  if (fromAsset === 'USDC' && toAsset === 'ETH') {
    // usdc(1e6) → wei(1e18): wei = usdc * 1e18 * 1e8 / (price * 1e6 * 1e8) = usdc * 1e20 / priceScaled
    return (amountInBaseUnits * 10n ** 20n) / priceScaled;
  }
  // ETH → USDC: usdc = wei * price * 1e6 / (1e18 * 1e8). Pre-scale: usdc = wei * priceScaled / 1e20
  return (amountInBaseUnits * priceScaled) / 10n ** 20n;
}

export type AerodromeDeps = {
  /** Override the safety constant — used by tests to spin up a configured adapter. */
  routerAddress?: Address;
  /** Pyth tier config; pass `false` to disable and force the stub. */
  pyth?: PythConfig | false;
  /** Stub deadline clock for tests. */
  now?: () => number;
};

export type AerodromeAdapter = ToolAdapter<SwapParams, SwapQuote, SwapParams> & {
  routerAddress: Address | undefined;
};

export function createAerodrome(deps: AerodromeDeps = {}): AerodromeAdapter {
  const routerAddress = deps.routerAddress ?? AERODROME_ROUTER_ADDRESS;
  const now = deps.now ?? (() => Math.floor(Date.now() / 1000));
  const extras: readonly Address[] = routerAddress ? [routerAddress] : [];

  function requireRouter(): Address {
    if (!routerAddress) throw new AerodromeNotConfiguredError();
    return routerAddress;
  }

  const quote: Quote<SwapParams, SwapQuote> = async (params) => {
    if (params.fromAsset === params.toAsset) {
      throw new Error('[aerodrome] fromAsset and toAsset must differ');
    }
    const inDecimals = decimalsFor(params.fromAsset);
    const outDecimals = decimalsFor(params.toAsset);
    const amountInBaseUnits = parseUnits(params.amountIn, inDecimals);

    let ethUsd = STUB_ETH_USD_PRICE;
    if (deps.pyth !== false) {
      const fromPyth = await fetchPythPriceUsd('ETH/USD', deps.pyth ?? {});
      if (fromPyth !== null) ethUsd = fromPyth;
    }
    const amountOutBaseUnits = priceConvert(
      amountInBaseUnits,
      params.fromAsset,
      params.toAsset,
      ethUsd,
    );
    const display = `${formatUnits(amountOutBaseUnits, outDecimals).slice(0, 8)} ${params.toAsset} for ${params.amountIn} ${params.fromAsset}`;

    return {
      fromAsset: params.fromAsset,
      toAsset: params.toAsset,
      amountInBaseUnits,
      amountOutBaseUnits,
      display,
      route: `${params.fromAsset}->${params.toAsset} (volatile)`,
    };
  };

  const buildTx: BuildTx<SwapParams> = async (params) => {
    const router = requireRouter();
    const q = await quote(params);
    const slippageBps = BigInt(params.slippageBps ?? DEFAULT_SLIPPAGE_BPS);
    const amountOutMin = (q.amountOutBaseUnits * (10_000n - slippageBps)) / 10_000n;
    const deadline = BigInt(params.deadline ?? now() + DEFAULT_DEADLINE_SECONDS);

    const data = encodeFunctionData({
      abi: AERODROME_ROUTER_ABI,
      functionName: 'swapExactTokensForTokens',
      args: [
        q.amountInBaseUnits,
        amountOutMin,
        [
          {
            from: tokenAddressFor(params.fromAsset),
            to: tokenAddressFor(params.toAsset),
            stable: false,
            factory: ZERO_ADDRESS, // router uses the default factory when zero
          },
        ],
        params.recipient,
        deadline,
      ],
    });

    const tx: BuiltTx = {
      to: router,
      data,
      value: 0n,
      sponsorable: true,
    };
    assertAllowlisted(tx.to, extras);
    return tx;
  };

  const verify: Verify = async (tx) => {
    if (!routerAddress) {
      return { ok: false, reason: 'Aerodrome router not configured' };
    }
    if (tx.to.toLowerCase() !== routerAddress.toLowerCase()) {
      return { ok: false, reason: 'target is not Aerodrome router' };
    }
    if (tx.value !== 0n) {
      return { ok: false, reason: 'SWAP via ERC-20 must have value=0' };
    }
    if (!tx.data.startsWith(SWAP_EXACT_TOKENS_SELECTOR)) {
      return { ok: false, reason: 'calldata is not swapExactTokensForTokens' };
    }
    return { ok: true };
  };

  return { name: 'aerodrome', quote, buildTx, verify, routerAddress };
}

export const aerodrome = createAerodrome();
