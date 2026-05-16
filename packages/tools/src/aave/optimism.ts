/**
 * Aave V3 adapter for Optimism (Stage 8).
 *
 * Chain-specific asset lists and pool configuration for Optimism.
 */

import type { Address } from '@sherpa/safety';
import { resolveToken } from '../registry.js';
import type { AaveDeps } from './types.js';
import { STUB_SUPPLY_APY_BPS } from './types.js';
import { buildSupplyCall, buildWithdrawCall } from './supply-builder.js';
import { buildBorrowCall, buildRepayCall } from './borrow-builder.js';
import { parseUnits } from 'viem';
import type { BuiltTx } from '../types.js';

const OPTIMISM_CHAIN_ID = 10;

const OPTIMISM_AAVE_POOL: Address = '0x794a61358D6845594F94dc1DB02A252b5b4814aD';
const OPTIMISM_DATA_PROVIDER: Address = '0x69FA688f1Dc4704B157E6E1cB65E3aD2f67A822C';

export const OPTIMISM_AAVE_ASSETS: readonly string[] = ['USDC', 'USDT', 'WETH', 'OP'];

export function getOptimismAaveAssets(): readonly string[] {
  return OPTIMISM_AAVE_ASSETS;
}

export function isOptimismAaveAsset(asset: string): boolean {
  return OPTIMISM_AAVE_ASSETS.includes(asset.toUpperCase());
}

export function getOptimismAaveDeps(overrides: Partial<AaveDeps> = {}): AaveDeps {
  return {
    poolAddress: overrides.poolAddress ?? OPTIMISM_AAVE_POOL,
    dataProviderAddress: overrides.dataProviderAddress ?? OPTIMISM_DATA_PROVIDER,
    stubSupplyApyBps: overrides.stubSupplyApyBps ?? STUB_SUPPLY_APY_BPS,
    ...overrides,
  };
}

export async function optimismSupply(
  asset: string,
  amount: string,
  recipient: Address,
  deps: AaveDeps = {},
): Promise<BuiltTx> {
  const token = resolveToken(asset, OPTIMISM_CHAIN_ID);
  if (!token) throw new Error(`Asset ${asset} not found on Optimism`);
  const amountBase = parseUnits(amount, token.decimals);
  const poolDeps = getOptimismAaveDeps(deps);
  const result = await buildSupplyCall(token.address as Address, amountBase, recipient, 0, poolDeps);
  return { to: result.to, data: result.data, value: result.value, sponsorable: result.sponsorable };
}

export async function optimismWithdraw(
  asset: string,
  amount: string,
  recipient: Address,
  deps: AaveDeps = {},
): Promise<BuiltTx> {
  const token = resolveToken(asset, OPTIMISM_CHAIN_ID);
  if (!token) throw new Error(`Asset ${asset} not found on Optimism`);
  const amountBase = parseUnits(amount, token.decimals);
  const poolDeps = getOptimismAaveDeps(deps);
  const result = await buildWithdrawCall(token.address as Address, amountBase, recipient, poolDeps);
  return { to: result.to, data: result.data, value: result.value, sponsorable: result.sponsorable };
}

export async function optimismBorrow(
  asset: string,
  amount: string,
  onBehalfOf: Address,
  interestMode: 'variable' | 'stable' = 'variable',
  deps: AaveDeps = {},
): Promise<BuiltTx> {
  const token = resolveToken(asset, OPTIMISM_CHAIN_ID);
  if (!token) throw new Error(`Asset ${asset} not found on Optimism`);
  const amountBase = parseUnits(amount, token.decimals);
  const poolDeps = getOptimismAaveDeps(deps);
  const result = await buildBorrowCall(
    { asset: token.address as Address, amount: amountBase, interestRateMode: interestMode === 'stable' ? 1 : 2, onBehalfOf },
    poolDeps,
  );
  return { to: result.to, data: result.data, value: result.value, sponsorable: result.sponsorable };
}

export async function optimismRepay(
  asset: string,
  amount: string,
  onBehalfOf: Address,
  interestMode: 'variable' | 'stable' = 'variable',
  deps: AaveDeps = {},
): Promise<BuiltTx> {
  const token = resolveToken(asset, OPTIMISM_CHAIN_ID);
  if (!token) throw new Error(`Asset ${asset} not found on Optimism`);
  const amountBase = parseUnits(amount, token.decimals);
  const poolDeps = getOptimismAaveDeps(deps);
  const result = await buildRepayCall(
    token.address as Address,
    amountBase,
    interestMode === 'stable' ? 1 : 2,
    onBehalfOf,
    poolDeps,
  );
  return { to: result.to, data: result.data, value: result.value, sponsorable: result.sponsorable };
}
