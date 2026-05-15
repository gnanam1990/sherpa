import { encodeFunctionData, decodeAbiParameters, type Address } from 'viem';
import type { UserAccountData } from './health-factor.js';

export const USER_ACCOUNT_DATA_ABI = [
  {
    name: 'getUserAccountData',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [
      { name: 'totalCollateralBase', type: 'uint256' },
      { name: 'totalDebtBase', type: 'uint256' },
      { name: 'availableBorrowsBase', type: 'uint256' },
      { name: 'currentLiquidationThreshold', type: 'uint256' },
      { name: 'ltv', type: 'uint256' },
      { name: 'healthFactor', type: 'uint256' },
    ],
  },
] as const;

export function encodeGetUserAccountData(userAddress: Address): `0x${string}` {
  return encodeFunctionData({
    abi: USER_ACCOUNT_DATA_ABI,
    functionName: 'getUserAccountData',
    args: [userAddress],
  });
}

export function parseUserAccountData(data: `0x${string}`): UserAccountData {
  const [totalCollateralBase, totalDebtBase, availableBorrowsBase, currentLiquidationThreshold, ltv, healthFactor] =
    decodeAbiParameters(
      [
        { name: 'totalCollateralBase', type: 'uint256' },
        { name: 'totalDebtBase', type: 'uint256' },
        { name: 'availableBorrowsBase', type: 'uint256' },
        { name: 'currentLiquidationThreshold', type: 'uint256' },
        { name: 'ltv', type: 'uint256' },
        { name: 'healthFactor', type: 'uint256' },
      ],
      data,
    );

  return {
    totalCollateralBase,
    totalDebtBase,
    availableBorrowsBase,
    currentLiquidationThreshold: Number(currentLiquidationThreshold),
    ltv: Number(ltv),
    healthFactor,
  };
}
