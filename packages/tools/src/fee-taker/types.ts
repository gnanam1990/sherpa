export type FeeConfig = {
  treasury: `0x${string}`;
  feeBps: number;
  chainId: number;
};

export type FeeCalculation = {
  inputAmount: bigint;
  feeAmount: bigint;
  feeBps: number;
  treasury: `0x${string}`;
};

export type FeeTransfer = {
  token: `0x${string}`;
  amount: bigint;
  recipient: `0x${string}`;
};

export type FeeDeps = {
  chainId: number;
};
