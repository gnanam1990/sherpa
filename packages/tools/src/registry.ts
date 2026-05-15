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
const ARBITRUM_CHAIN_ID = 42161;
const OPTIMISM_CHAIN_ID = 10;
const POLYGON_CHAIN_ID = 137;
const AVALANCHE_CHAIN_ID = 43114;

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

const ARBITRUM_TOKENS: readonly TokenInfo[] = [
  {
    symbol: 'USDC',
    address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    decimals: 6,
    chainId: ARBITRUM_CHAIN_ID,
  },
  {
    symbol: 'ETH',
    address: 'native',
    decimals: 18,
    chainId: ARBITRUM_CHAIN_ID,
  },
  {
    symbol: 'WETH',
    address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    decimals: 18,
    chainId: ARBITRUM_CHAIN_ID,
  },
  {
    symbol: 'ARB',
    address: '0x912CE59144191C1204E64559FE8253a0e49E6548',
    decimals: 18,
    chainId: ARBITRUM_CHAIN_ID,
  },
  {
    symbol: 'USDT',
    address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    decimals: 6,
    chainId: ARBITRUM_CHAIN_ID,
  },
  {
    symbol: 'WBTC',
    address: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f',
    decimals: 8,
    chainId: ARBITRUM_CHAIN_ID,
  },
];

const OPTIMISM_TOKENS: readonly TokenInfo[] = [
  {
    symbol: 'USDC',
    address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
    decimals: 6,
    chainId: OPTIMISM_CHAIN_ID,
  },
  {
    symbol: 'ETH',
    address: 'native',
    decimals: 18,
    chainId: OPTIMISM_CHAIN_ID,
  },
  {
    symbol: 'WETH',
    address: '0x4200000000000000000000000000000000000006',
    decimals: 18,
    chainId: OPTIMISM_CHAIN_ID,
  },
  {
    symbol: 'OP',
    address: '0x4200000000000000000000000000000000000042',
    decimals: 18,
    chainId: OPTIMISM_CHAIN_ID,
  },
  {
    symbol: 'USDT',
    address: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
    decimals: 6,
    chainId: OPTIMISM_CHAIN_ID,
  },
];

const POLYGON_TOKENS: readonly TokenInfo[] = [
  {
    symbol: 'USDC',
    address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
    decimals: 6,
    chainId: POLYGON_CHAIN_ID,
  },
  {
    symbol: 'WMATIC',
    address: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
    decimals: 18,
    chainId: POLYGON_CHAIN_ID,
  },
  {
    symbol: 'WETH',
    address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
    decimals: 18,
    chainId: POLYGON_CHAIN_ID,
  },
  {
    symbol: 'USDT',
    address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    decimals: 6,
    chainId: POLYGON_CHAIN_ID,
  },
  {
    symbol: 'MATIC',
    address: 'native',
    decimals: 18,
    chainId: POLYGON_CHAIN_ID,
  },
];

const AVALANCHE_TOKENS: readonly TokenInfo[] = [
  {
    symbol: 'USDC',
    address: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
    decimals: 6,
    chainId: AVALANCHE_CHAIN_ID,
  },
  {
    symbol: 'WAVAX',
    address: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7',
    decimals: 18,
    chainId: AVALANCHE_CHAIN_ID,
  },
  {
    symbol: 'WETH',
    address: '0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB',
    decimals: 18,
    chainId: AVALANCHE_CHAIN_ID,
  },
  {
    symbol: 'USDT',
    address: '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7',
    decimals: 6,
    chainId: AVALANCHE_CHAIN_ID,
  },
  {
    symbol: 'AVAX',
    address: 'native',
    decimals: 18,
    chainId: AVALANCHE_CHAIN_ID,
  },
];

/** Returns the token list for a given chain. */
export function getTokensForChain(chainId: number): readonly TokenInfo[] {
  if (chainId === MAINNET_CHAIN_ID) return MAINNET_TOKENS;
  if (chainId === ARBITRUM_CHAIN_ID) return ARBITRUM_TOKENS;
  if (chainId === OPTIMISM_CHAIN_ID) return OPTIMISM_TOKENS;
  if (chainId === POLYGON_CHAIN_ID) return POLYGON_TOKENS;
  if (chainId === AVALANCHE_CHAIN_ID) return AVALANCHE_TOKENS;
  return SEPOLIA_TOKENS;
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
const ARBITRUM_BY_SYMBOL = buildSymbolMap(ARBITRUM_TOKENS);
const OPTIMISM_BY_SYMBOL = buildSymbolMap(OPTIMISM_TOKENS);
const POLYGON_BY_SYMBOL = buildSymbolMap(POLYGON_TOKENS);
const AVALANCHE_BY_SYMBOL = buildSymbolMap(AVALANCHE_TOKENS);

/**
 * Look up a token by symbol (case-insensitive) and optional chainId.
 * Defaults to Base Sepolia (84532) for backward compatibility.
 * Returns undefined if the token is not in the registry.
 */
export function resolveToken(symbol: string, chainId: number = SEPOLIA_CHAIN_ID): TokenInfo | undefined {
  let map: Map<string, TokenInfo>;
  if (chainId === MAINNET_CHAIN_ID) map = MAINNET_BY_SYMBOL;
  else if (chainId === ARBITRUM_CHAIN_ID) map = ARBITRUM_BY_SYMBOL;
  else if (chainId === OPTIMISM_CHAIN_ID) map = OPTIMISM_BY_SYMBOL;
  else if (chainId === POLYGON_CHAIN_ID) map = POLYGON_BY_SYMBOL;
  else if (chainId === AVALANCHE_CHAIN_ID) map = AVALANCHE_BY_SYMBOL;
  else map = SEPOLIA_BY_SYMBOL;
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
