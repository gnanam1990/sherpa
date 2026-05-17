export type BalanceOracleConfig = Record<string, never>;

export async function getBalance(
  address: string,
  asset: string,
  _config?: BalanceOracleConfig,
): Promise<bigint> {
  throw new Error(`balance_oracle_not_configured:${address}:${asset}`);
}
