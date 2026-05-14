/**
 * Token registry for Base Sepolia.
 *
 * To add a token: confirm address on basescan-sepolia.org. Never use
 * placeholder addresses — they cause false reverts at execute time.
 */

export type TokenInfo = {
  symbol: string;
  /** Contract address, or 'native' for ETH. */
  address: `0x${string}` | 'native';
  decimals: number;
  chainId: number;
};

const BASE_SEPOLIA_CHAIN_ID = 84532;

const TOKENS: readonly TokenInfo[] = [
  {
    symbol: 'USDC',
    address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    decimals: 6,
    chainId: BASE_SEPOLIA_CHAIN_ID,
  },
  {
    symbol: 'ETH',
    address: 'native',
    decimals: 18,
    chainId: BASE_SEPOLIA_CHAIN_ID,
  },
  {
    symbol: 'WETH',
    address: '0x4200000000000000000000000000000000000006',
    decimals: 18,
    chainId: BASE_SEPOLIA_CHAIN_ID,
  },
];

const BY_SYMBOL = new Map<string, TokenInfo>(
  TOKENS.flatMap((t) => [
    [t.symbol.toUpperCase(), t],
    // Alias: ETH → WETH for lookup, WETH → WETH
    ...(t.symbol === 'WETH' ? [['ETH', t] as const] : []),
  ]),
);

/**
 * Look up a token by symbol (case-insensitive).
 * Returns undefined if the token is not in the registry.
 */
export function resolveToken(symbol: string): TokenInfo | undefined {
  return BY_SYMBOL.get(symbol.toUpperCase());
}

/** All registered tokens. */
export function allTokens(): readonly TokenInfo[] {
  return TOKENS;
}
