/**
 * @sherpa/config — env validation and chain configs (M3 ownership).
 */

export type ChainConfig = {
  id: number;
  name: string;
  rpcUrl: string;
};

export const BASE_SEPOLIA: ChainConfig = {
  id: 84_532,
  name: 'base-sepolia',
  rpcUrl: 'https://sepolia.base.org',
};

export const BASE_MAINNET: ChainConfig = {
  id: 8_453,
  name: 'base',
  rpcUrl: 'https://mainnet.base.org',
};

/** Reads a required env var or throws a helpful error. */
export function requireEnv(name: string, env: NodeJS.ProcessEnv = process.env): string {
  const value = env[name];
  if (value === undefined || value === '') {
    throw new Error(`[config] missing required env var: ${name}`);
  }
  return value;
}
