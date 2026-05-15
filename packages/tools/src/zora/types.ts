export type ZoraCollection = {
  address: `0x${string}`;
  name: string;
  description: string;
  image: string;
  chainId: number;
  mintPrice: bigint;
  maxSupply: number;
  currentSupply: number;
};

export type ZoraMintParams = {
  collection: `0x${string}`;
  quantity: number;
  recipient: `0x${string}`;
  comment?: string;
};

export type ZoraMintQuote = {
  pricePerUnit: bigint;
  totalPrice: bigint;
  gasEstimate: bigint;
};

export type ZoraDeps = {
  apiUrl?: string;
  apiKey?: string;
};
