export type BalanceOracleConfig = Record<string, never>;

export async function getBalance(
  _address: string,
  _asset: string,
  _config?: BalanceOracleConfig,
): Promise<bigint> {
  // Stub: real implementation queries on-chain balance via viem
  return 0n;
}
