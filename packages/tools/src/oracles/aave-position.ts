export type AavePositionConfig = Record<string, never>;

export async function getHealthFactor(
  _address: string,
  _config?: AavePositionConfig,
): Promise<number> {
  // Stub: real implementation queries Aave pool.getUserAccountData()
  return 0;
}
