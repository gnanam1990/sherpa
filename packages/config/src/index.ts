/**
 * @sherpa/config — chain + environment config (M3 ownership).
 *
 * Single source of truth for chain IDs, RPC endpoints, and feature flags.
 * Do NOT read `process.env` anywhere else — go through `loadConfig()`.
 */

export type ChainName = 'base-sepolia' | 'base-mainnet';

export type ChainConfig = {
  name: ChainName;
  chainId: number;
  rpcUrl: string;
  basescanUrl: string;
  explorerTxPrefix: string;
};

export const CHAINS: Readonly<Record<ChainName, ChainConfig>> = Object.freeze({
  'base-sepolia': {
    name: 'base-sepolia',
    chainId: 84532,
    rpcUrl: 'https://sepolia.base.org',
    basescanUrl: 'https://api-sepolia.basescan.org/api',
    explorerTxPrefix: 'https://sepolia.basescan.org/tx/',
  },
  'base-mainnet': {
    name: 'base-mainnet',
    chainId: 8453,
    rpcUrl: 'https://mainnet.base.org',
    basescanUrl: 'https://api.basescan.org/api',
    explorerTxPrefix: 'https://basescan.org/tx/',
  },
});

export type SherpaConfig = {
  chain: ChainConfig;
  /** Override RPC if provided (e.g. Alchemy/Infura URL). */
  rpcUrl: string;
  /** Optional Basescan API key. */
  basescanApiKey?: string;
  /** Optional OpenAI/Claude keys for the LLM router. */
  openaiApiKey?: string;
  anthropicApiKey?: string;
  groqApiKey?: string;
  /** Whether to attempt real RPC lookups (disabled in unit tests). */
  useRealRpc: boolean;
};

function pickChain(name: string | undefined): ChainConfig {
  if (name === 'base-mainnet') return CHAINS['base-mainnet'];
  return CHAINS['base-sepolia'];
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): SherpaConfig {
  const chain = pickChain(env.SHERPA_CHAIN);
  return {
    chain,
    rpcUrl: env.SHERPA_RPC_URL ?? chain.rpcUrl,
    basescanApiKey: env.BASESCAN_API_KEY,
    openaiApiKey: env.OPENAI_API_KEY,
    anthropicApiKey: env.ANTHROPIC_API_KEY,
    groqApiKey: env.GROQ_API_KEY,
    useRealRpc: env.SHERPA_USE_REAL_RPC !== 'false',
  };
}
