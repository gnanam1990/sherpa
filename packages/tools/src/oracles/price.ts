export type PriceOracleConfig = {
  /** Future: inject Pyth config, RPC client, etc. */
};

export async function getPrice(
  _symbol: string,
  _config?: PriceOracleConfig,
): Promise<number> {
  // Stub: real implementation queries Pyth or on-chain oracle
  return 0;
}
