import { encodeFunctionData } from 'viem';
import { assertAllowlisted, type Address } from '@sherpa/safety';
import { LidoNotConfiguredError } from './index.js';
import { STETH_ABI, SUBMIT_SELECTOR } from './steth.js';
import type { LidoDeps } from './types.js';
import { LIDO_STETH_ADDRESS } from './types.js';

export type StakeBuildResult = {
  to: Address;
  data: `0x${string}`;
  value: bigint;
  sponsorable: boolean;
};

export async function buildStakeCall(
  amount: bigint,
  deps: LidoDeps = {},
): Promise<StakeBuildResult> {
  const stethAddress = deps.stethAddress ?? (deps.chainId != null ? LIDO_STETH_ADDRESS[deps.chainId] : undefined);
  if (!stethAddress) {
    throw new LidoNotConfiguredError();
  }

  const extras: readonly Address[] = [stethAddress];

  const data = encodeFunctionData({
    abi: STETH_ABI,
    functionName: 'submit',
    args: ['0x0000000000000000000000000000000000000000'],
  });

  assertAllowlisted(stethAddress, extras);

  return {
    to: stethAddress,
    data,
    value: amount,
    sponsorable: true,
  };
}
