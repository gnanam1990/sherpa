export type PriceOracleConfig = Record<string, never>;

export async function getPrice(
  symbol: string,
  _config?: PriceOracleConfig,
): Promise<number> {
  throw new Error(`price_oracle_not_configured:${symbol}`);
}
