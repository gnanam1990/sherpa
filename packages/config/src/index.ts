/**
 * @sherpa/config — chain + environment config (M3 ownership).
 *
 * Single source of truth for chain IDs, RPC endpoints, and feature flags.
 * Do NOT read `process.env` anywhere else — go through `loadConfig()`.
 */

import { z } from 'zod';

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
  /** Coinbase Paymaster service URL (EIP-5792 capabilities.paymasterService.url). */
  paymasterUrl?: string;
  /** Whether to use real Postgres-backed memory stores (audit_log, llm_usage, ...). */
  useRealDb: boolean;
  /** Supabase pooler connection string. Required when `useRealDb` is true. */
  databaseUrl?: string;
  /** Supabase service role key (server-side only). */
  supabaseServiceKey?: string;
  /** Neynar API key for Farcaster username resolution. */
  neynarApiKey?: string;
  /** Override the Neynar base URL (defaults to https://api.neynar.com). */
  neynarBaseUrl: string;
  /** Ethereum mainnet RPC for ENS reads. Falls back to a public node when unset. */
  ethMainnetRpcUrl: string;
  /** Vercel KV REST endpoint. KV layer is disabled when unset. */
  kvRestApiUrl?: string;
  /** Vercel KV REST bearer token. */
  kvRestApiToken?: string;
};

/**
 * Onchain addresses Sherpa needs to know about. Hardcoded here rather than
 * env-supplied because they're stable contract deployments. Source comments
 * are required.
 */
export const ONCHAIN_ADDRESSES = Object.freeze({
  /**
   * Basenames L2Resolver on Base mainnet (chainId 8453).
   *
   * Source: github.com/base-org/basenames (PublicResolver deployment).
   * Used directly via `readContract({functionName: 'addr', args: [namehash]})`
   * because Base mainnet does not deploy a Universal Resolver — viem's
   * `getEnsAddress` is therefore not applicable for `.base.eth` names.
   */
  basenamesL2Resolver: '0xC6d566A56A1aFf6508b41f6c90ff131615583BCD' as const,
});

/** Public Ethereum mainnet RPC used when ALCHEMY_ETH_MAINNET_RPC is unset. */
export const PUBLIC_ETH_MAINNET_RPC = 'https://ethereum.publicnode.com';

function pickChain(name: string | undefined): ChainConfig {
  if (name === 'base-mainnet') return CHAINS['base-mainnet'];
  return CHAINS['base-sepolia'];
}

// `process.env` exposes unset values as `undefined`, but a `.env` file with
// `DATABASE_URL=` produces an empty string. `.optional()` only treats
// `undefined` as absent, so the empty string is fed into `.url()` /
// `.min(1)` and crashes `loadConfig()` even when SHERPA_USE_REAL_DB=false.
// Coerce '' → undefined before validating.
const emptyToUndefined = (v: unknown) => (v === '' ? undefined : v);

const DbEnvSchema = z
  .object({
    SHERPA_USE_REAL_DB: z.enum(['true', 'false']).default('false'),
    DATABASE_URL: z.preprocess(emptyToUndefined, z.string().url().optional()),
    SUPABASE_SERVICE_KEY: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  })
  .superRefine((env, ctx) => {
    if (env.SHERPA_USE_REAL_DB === 'true' && !env.DATABASE_URL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'DATABASE_URL is required when SHERPA_USE_REAL_DB=true',
        path: ['DATABASE_URL'],
      });
    }
  });

const IdentityEnvSchema = z.object({
  NEYNAR_API_KEY: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  NEYNAR_BASE_URL: z.preprocess(emptyToUndefined, z.string().url().optional()),
  ALCHEMY_ETH_MAINNET_RPC: z.preprocess(emptyToUndefined, z.string().url().optional()),
  KV_REST_API_URL: z.preprocess(emptyToUndefined, z.string().url().optional()),
  KV_REST_API_TOKEN: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
});

export function loadConfig(env: NodeJS.ProcessEnv = process.env): SherpaConfig {
  const chain = pickChain(env.SHERPA_CHAIN);
  const dbEnv = DbEnvSchema.parse({
    SHERPA_USE_REAL_DB: env.SHERPA_USE_REAL_DB,
    DATABASE_URL: env.DATABASE_URL,
    SUPABASE_SERVICE_KEY: env.SUPABASE_SERVICE_KEY,
  });
  const idEnv = IdentityEnvSchema.parse({
    NEYNAR_API_KEY: env.NEYNAR_API_KEY,
    NEYNAR_BASE_URL: env.NEYNAR_BASE_URL,
    ALCHEMY_ETH_MAINNET_RPC: env.ALCHEMY_ETH_MAINNET_RPC,
    KV_REST_API_URL: env.KV_REST_API_URL,
    KV_REST_API_TOKEN: env.KV_REST_API_TOKEN,
  });
  return {
    chain,
    rpcUrl: env.SHERPA_RPC_URL ?? chain.rpcUrl,
    basescanApiKey: env.BASESCAN_API_KEY,
    openaiApiKey: env.OPENAI_API_KEY,
    anthropicApiKey: env.ANTHROPIC_API_KEY,
    groqApiKey: env.GROQ_API_KEY,
    useRealRpc: env.SHERPA_USE_REAL_RPC !== 'false',
    paymasterUrl: env.SHERPA_PAYMASTER_URL,
    useRealDb: dbEnv.SHERPA_USE_REAL_DB === 'true',
    databaseUrl: dbEnv.DATABASE_URL,
    supabaseServiceKey: dbEnv.SUPABASE_SERVICE_KEY,
    neynarApiKey: idEnv.NEYNAR_API_KEY,
    neynarBaseUrl: idEnv.NEYNAR_BASE_URL ?? 'https://api.neynar.com',
    ethMainnetRpcUrl: idEnv.ALCHEMY_ETH_MAINNET_RPC ?? PUBLIC_ETH_MAINNET_RPC,
    kvRestApiUrl: idEnv.KV_REST_API_URL,
    kvRestApiToken: idEnv.KV_REST_API_TOKEN,
  };
}

export { getPool, query, resetPool, type DbPool, type QueryResult } from './db.js';
