import { erc20Abi, formatUnits, type PublicClient } from 'viem';
import { ALLOWED_CONTRACTS, type Address } from '@sherpa/safety';

export type BalanceSnapshot = {
  address: Address;
  ethWei: bigint;
  ethDisplay: string;
  usdcBaseUnits: bigint;
  usdcDisplay: string;
};

/**
 * Read native + USDC balance for `address` using viem's multicall.
 *
 * Separating the tool from @sherpa/tools' direct exports keeps this file
 * opt-in: callers who don't need live RPC (tests, `pnpm build` in CI with no
 * network) can skip it.
 */
export async function fetchBalance(
  client: PublicClient,
  address: Address,
): Promise<BalanceSnapshot> {
  const [ethWei, usdcBaseUnits] = await Promise.all([
    client.getBalance({ address }),
    client.readContract({
      address: ALLOWED_CONTRACTS.USDC,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [address],
    }),
  ]);

  return {
    address,
    ethWei,
    ethDisplay: `${formatUnits(ethWei, 18)} ETH`,
    usdcBaseUnits,
    usdcDisplay: `$${formatUnits(usdcBaseUnits, 6)}`,
  };
}
