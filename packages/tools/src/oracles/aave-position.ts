export type AavePositionConfig = Record<string, never>;

export async function getHealthFactor(
  address: string,
  _config?: AavePositionConfig,
): Promise<number> {
  throw new Error(`aave_position_oracle_not_configured:${address}`);
}
