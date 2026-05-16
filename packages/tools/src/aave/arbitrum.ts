/**
 * Aave V3 adapter for Arbitrum (Stage 8).
 *
 * Chain-specific asset lists and pool configuration for Arbitrum.
 */

import type { Address } from '@sherpa/safety';
import { resolveToken } from '../registry.js';
import type { AaveDeps } from './types.js';
import { STUB_SUPPLY_APY_BPS } from './types.js';
import { buildSupplyCall, buildWithdrawCall } from './supply-builder.js';
import { buildBorrowCall, buildRepayCall } from './borrow-builder.js';
import { parseUnits } from 'viem';
import type { BuiltTx } from '../types.js';

const ARBITRUM_CHAIN_ID = 42161;

const ARBITRUM_AAVE_POOL: Address = '0x794a61358D6845594F94dc1DB02A252b5b4814aD';
const ARBITRUM_DATA_PROVIDER: Address = '0x69FA688f1Dc4704B157E6E1cB65E3aD2f67A822C';

export const ARBITRUM_AAVE_ASSETS: readonly string[] = ['USDC', 'USDT', 'WETH', 'WBTC', 'ARB'];

export function getArbitrumAaveAssets(): readonly string[] {
  return ARBITRUM_AAVE_ASSETS;
}

export function isArbitrumAaveAsset(asset: string): boolean {
  return ARBITRUM_AAVE_ASSETS.includes(asset.toUpperCase());
}

export function getArbitrumAaveDeps(overrides: Partial<AaveDeps> = {}): AaveDeps {
  return {
    poolAddress: overrides.poolAddress ?? ARBITRUM_AAVE_POOL,
    dataProviderAddress: overrides.dataProviderAddress ?? ARBITRUM_DATA_PROVIDER,
    stubSupplyApyBps: overrides.stubSupplyApyBps ?? STUB_SUPPLY_APY_BPS,
    ...overrides,
  };
}

export async function arbitrumSupply(
  asset: string,
  amount: string,
  recipient: Address,
  deps: AaveDeps = {},
): Promise<BuiltTx> {
  const token = resolveToken(asset, ARBITRUM_CHAIN_ID);
  if (!token) throw new Error(`Asset ${asset} not found on Arbitrum`);
  const amountBase = parseUnits(amount, token.decimals);
  const poolDeps = getArbitrumAaveDeps(deps);
  const result = await buildSupplyCall(token.address as Address, amountBase, recipient, 0, poolDeps);
  return { to: result.to, data: result.data, value: result.value, sponsorable: result.sponsorable };
}

export async function arbitrumWithdraw(
  asset: string,
  amount: string,
  recipient: Address,
  deps: AaveDeps = {},
): Promise<BuiltTx> {
  const token = resolveToken(asset, ARBITRUM_CHAIN_ID);
  if (!token) throw new Error(`Asset ${asset} not found on Arbitrum`);
  const amountBase = parseUnits(amount, token.decimals);
  const poolDeps = getArbitrumAaveDeps(deps);
  const result = await buildWithdrawCall(token.address as Address, amountBase, recipient, poolDeps);
  return { to: result.to, data: result.data, value: result.value, sponsorable: result.sponsorable };
}

export async function arbitrumBorrow(
  asset: string,
  amount: string,
  onBehalfOf: Address,
  interestMode: 'variable' | 'stable' = 'variable',
  deps: AaveDeps = {},
): Promise<BuiltTx> {
  const token = resolveToken(asset, ARBITRUM_CHAIN_ID);
  if (!token) throw new Error(`Asset ${asset} not found on Arbitrum`);
  const amountBase = parseUnits(amount, token.decimals);
  const poolDeps = getArbitrumAaveDeps(deps);
  const result = await buildBorrowCall(
    { asset: token.address as Address, amount: amountBase, interestRateMode: interestMode === 'stable' ? 1 : 2, onBehalfOf },
    poolDeps,
  );
  return { to: result.to, data: result.data, value: result.value, sponsorable: result.sponsorable };
}

export async function arbitrumRepay(
  asset: string,
  amount: string,
  onBehalfOf: Address,
  interestMode: 'variable' | 'stable' = 'variable',
  deps: AaveDeps = {},
): Promise<BuiltTx> {
  const token = resolveToken(asset, ARBITRUM_CHAIN_ID);
  if (!token) throw new Error(`Asset ${asset} not found on Arbitrum`);
  const amountBase = parseUnits(amount, token.decimals);
  const poolDeps = getArbitrumAaveDeps(deps);
  const result = await buildRepayCall(
    token.address as Address,
    amountBase,
    interestMode === 'stable' ? 1 : 2,
    onBehalfOf,
    poolDeps,
  );
  return { to: result.to, data: result.data, value: result.value, sponsorable: result.sponsorable };
}
