export type AavePositionConfig = {
  /** Future: inject pool address, RPC client, etc. */
};

export async function getHealthFactor(
  _address: string,
  _config?: AavePositionConfig,
): Promise<number> {
  // Stub: real implementation queries Aave pool.getUserAccountData()
  return 0;
}
