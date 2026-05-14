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
  /**
   * Coinbase Paymaster RPC URL (server-side only). Forwarded to by the
   * `/api/paymaster` proxy; never proxied through NEXT_PUBLIC_*.
   */
  paymasterRpcUrl?: string;
  /** Base URL used by human-run M3 smoke checks. */
  smokeApiUrl: string;
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
  /**
   * Bearer token guarding `/admin/*` routes. 64-char lowercase hex.
   * When unset, admin endpoints respond 503 (not 401) — they're disabled,
   * not mis-authed.
   */
  adminApiKey?: string;
  /** Sentry DSN. When unset, error reporting is a no-op. */
  sentryDsn?: string;
  /** Sentry environment tag (e.g. `production`, `staging`, `development`). */
  sentryEnvironment: string;
  /**
   * Bearer token for `/api/cron/*`. 64-char lowercase hex (same shape as
   * ADMIN_API_KEY). When unset, cron routes respond 503 — disabled.
   */
  cronSecret?: string;
  /** Tenderly API key for transaction simulation (Stage 2). */
  tenderlyApiKey?: string;
  /** Tenderly account user/org slug. */
  tenderlyUser?: string;
  /** Tenderly project slug. */
  tenderlyProject?: string;
  /** Whether transaction simulation is enabled (default: true). */
  simulationEnabled: boolean;
  /** Whether the current chain is mainnet (derived from chain config). */
  isMainnet: boolean;
  /** Aave V3 Pool address (optional — LEND gated on this). */
  aavePoolAddress?: `0x${string}`;
  /** Aave V3 Data Provider address (optional — for reserve data). */
  aaveDataProviderAddress?: `0x${string}`;
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

// 64 lowercase hex chars = 32 bytes = `openssl rand -hex 32`. Enforcing the
// shape (rather than a free-form min-length string) means a typo'd / partial
// paste fails fast at boot rather than silently letting requests through.
const HexBearer = z
  .string()
  .regex(/^[0-9a-f]{64}$/, 'must be 64 lowercase hex chars (openssl rand -hex 32)');

const AdminEnvSchema = z.object({
  ADMIN_API_KEY: z.preprocess(emptyToUndefined, HexBearer.optional()),
});

const ObservabilityEnvSchema = z.object({
  SENTRY_DSN: z.preprocess(emptyToUndefined, z.string().url().optional()),
  SENTRY_ENVIRONMENT: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  CRON_SECRET: z.preprocess(emptyToUndefined, HexBearer.optional()),
});

const SmokeEnvSchema = z.object({
  SMOKE_API_URL: z.preprocess(emptyToUndefined, z.string().url().optional()),
});

const PaymasterEnvSchema = z.object({
  SHERPA_PAYMASTER_RPC: z.preprocess(emptyToUndefined, z.string().url().optional()),
});

const TenderlyEnvSchema = z.object({
  TENDERLY_API_KEY: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  TENDERLY_USER: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  TENDERLY_PROJECT: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  SHERPA_SIMULATION_ENABLED: z.preprocess(emptyToUndefined, z.enum(['true', 'false']).optional()),
});

const AaveEnvSchema = z.object({
  AAVE_POOL_ADDRESS: z.preprocess(emptyToUndefined, z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional()),
  AAVE_DATA_PROVIDER_ADDRESS: z.preprocess(emptyToUndefined, z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional()),
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
  const adminEnv = AdminEnvSchema.parse({ ADMIN_API_KEY: env.ADMIN_API_KEY });
  const obsEnv = ObservabilityEnvSchema.parse({
    SENTRY_DSN: env.SENTRY_DSN,
    SENTRY_ENVIRONMENT: env.SENTRY_ENVIRONMENT,
    CRON_SECRET: env.CRON_SECRET,
  });
  const smokeEnv = SmokeEnvSchema.parse({ SMOKE_API_URL: env.SMOKE_API_URL });
  const paymasterEnv = PaymasterEnvSchema.parse({
    SHERPA_PAYMASTER_RPC: env.SHERPA_PAYMASTER_RPC,
  });
  const tenderlyEnv = TenderlyEnvSchema.parse({
    TENDERLY_API_KEY: env.TENDERLY_API_KEY,
    TENDERLY_USER: env.TENDERLY_USER,
    TENDERLY_PROJECT: env.TENDERLY_PROJECT,
    SHERPA_SIMULATION_ENABLED: env.SHERPA_SIMULATION_ENABLED,
  });
  const aaveEnv = AaveEnvSchema.parse({
    AAVE_POOL_ADDRESS: env.AAVE_POOL_ADDRESS,
    AAVE_DATA_PROVIDER_ADDRESS: env.AAVE_DATA_PROVIDER_ADDRESS,
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
    paymasterRpcUrl: paymasterEnv.SHERPA_PAYMASTER_RPC,
    smokeApiUrl: smokeEnv.SMOKE_API_URL ?? 'http://localhost:3001',
    useRealDb: dbEnv.SHERPA_USE_REAL_DB === 'true',
    databaseUrl: dbEnv.DATABASE_URL,
    supabaseServiceKey: dbEnv.SUPABASE_SERVICE_KEY,
    neynarApiKey: idEnv.NEYNAR_API_KEY,
    neynarBaseUrl: idEnv.NEYNAR_BASE_URL ?? 'https://api.neynar.com',
    ethMainnetRpcUrl: idEnv.ALCHEMY_ETH_MAINNET_RPC ?? PUBLIC_ETH_MAINNET_RPC,
    kvRestApiUrl: idEnv.KV_REST_API_URL,
    kvRestApiToken: idEnv.KV_REST_API_TOKEN,
    adminApiKey: adminEnv.ADMIN_API_KEY,
    sentryDsn: obsEnv.SENTRY_DSN,
    sentryEnvironment: obsEnv.SENTRY_ENVIRONMENT ?? 'development',
    cronSecret: obsEnv.CRON_SECRET,
    tenderlyApiKey: tenderlyEnv.TENDERLY_API_KEY,
    tenderlyUser: tenderlyEnv.TENDERLY_USER,
    tenderlyProject: tenderlyEnv.TENDERLY_PROJECT,
    simulationEnabled: tenderlyEnv.SHERPA_SIMULATION_ENABLED !== 'false',
    isMainnet: chain.name === 'base-mainnet',
    aavePoolAddress: aaveEnv.AAVE_POOL_ADDRESS as `0x${string}` | undefined,
    aaveDataProviderAddress: aaveEnv.AAVE_DATA_PROVIDER_ADDRESS as `0x${string}` | undefined,
  };
}

export { getPool, query, resetPool, type DbPool, type QueryResult } from './db.js';
