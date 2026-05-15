/**
 * Token registry for Base Sepolia and Base Mainnet.
 *
 * To add a token: confirm address on basescan.org (mainnet) or
 * basescan-sepolia.org (testnet). Never use placeholder addresses —
 * they cause false reverts at execute time.
 */

export type TokenInfo = {
  symbol: string;
  /** Contract address, or 'native' for ETH. */
  address: `0x${string}` | 'native';
  decimals: number;
  chainId: number;
};

const SEPOLIA_CHAIN_ID = 84532;
const MAINNET_CHAIN_ID = 8453;

const SEPOLIA_TOKENS: readonly TokenInfo[] = [
  {
    symbol: 'USDC',
    address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    decimals: 6,
    chainId: SEPOLIA_CHAIN_ID,
  },
  {
    symbol: 'ETH',
    address: 'native',
    decimals: 18,
    chainId: SEPOLIA_CHAIN_ID,
  },
  {
    symbol: 'WETH',
    address: '0x4200000000000000000000000000000000000006',
    decimals: 18,
    chainId: SEPOLIA_CHAIN_ID,
  },
];

const MAINNET_TOKENS: readonly TokenInfo[] = [
  {
    symbol: 'USDC',
    address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    decimals: 6,
    chainId: MAINNET_CHAIN_ID,
  },
  {
    symbol: 'ETH',
    address: 'native',
    decimals: 18,
    chainId: MAINNET_CHAIN_ID,
  },
  {
    symbol: 'WETH',
    address: '0x4200000000000000000000000000000000000006',
    decimals: 18,
    chainId: MAINNET_CHAIN_ID,
  },
  {
    symbol: 'USDT',
    address: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2',
    decimals: 6,
    chainId: MAINNET_CHAIN_ID,
  },
  {
    symbol: 'cbBTC',
    address: '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf',
    decimals: 8,
    chainId: MAINNET_CHAIN_ID,
  },
];

/** Returns the token list for a given chain. */
export function getTokensForChain(chainId: number): readonly TokenInfo[] {
  return chainId === MAINNET_CHAIN_ID ? MAINNET_TOKENS : SEPOLIA_TOKENS;
}

function buildSymbolMap(tokens: readonly TokenInfo[]): Map<string, TokenInfo> {
  return new Map(
    tokens.flatMap((t) => [
      [t.symbol.toUpperCase(), t],
      ...(t.symbol === 'WETH' ? [['ETH', t] as const] : []),
    ]),
  );
}

const SEPOLIA_BY_SYMBOL = buildSymbolMap(SEPOLIA_TOKENS);
const MAINNET_BY_SYMBOL = buildSymbolMap(MAINNET_TOKENS);

/**
 * Look up a token by symbol (case-insensitive) and optional chainId.
 * Defaults to Base Sepolia (84532) for backward compatibility.
 * Returns undefined if the token is not in the registry.
 */
export function resolveToken(symbol: string, chainId: number = SEPOLIA_CHAIN_ID): TokenInfo | undefined {
  const map = chainId === MAINNET_CHAIN_ID ? MAINNET_BY_SYMBOL : SEPOLIA_BY_SYMBOL;
  return map.get(symbol.toUpperCase());
}

/**
 * Receipt tokens (aTokens) are NOT registered here for Stage 2 P3.
 * When BORROW (P4) adds health factor tracking, aUSDC will be added
 * with isReceiptToken: true to prevent it from appearing in SWAP/LEND
 * input token lists.
 *
 * Future:
 * {
 *   symbol: 'aUSDC',
 *   address: '<aave-ausdc-address>',
 *   decimals: 6,
 *   chainId: SEPOLIA_CHAIN_ID,
 *   isReceiptToken: true,
 * }
 */

/** All registered tokens (Sepolia, for backward compatibility). */
export function allTokens(): readonly TokenInfo[] {
  return SEPOLIA_TOKENS;
}
