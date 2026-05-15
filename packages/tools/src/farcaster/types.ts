export type NeynarDeps = {
  neynarApiKey?: string;
  fetchImpl?: typeof fetch;
};

export type TipParams = {
  recipientUsername: string;
  amount: bigint;
  asset: string;
};

export type TipQuote = {
  recipientAddress: `0x${string}` | null;
  amount: bigint;
  asset: string;
};
