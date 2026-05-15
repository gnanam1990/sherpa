export type MultisigConfig = {
  threshold: number;
  signers: `0x${string}`[];
  chainId: number;
};

export type MultisigTransaction = {
  id: string;
  to: `0x${string}`;
  value: bigint;
  data: `0x${string}`;
  confirmations: `0x${string}`[];
  status: 'pending' | 'confirmed' | 'executed' | 'rejected';
  createdAt: number;
};

export type HardwareWalletInfo = {
  type: 'ledger' | 'trezor';
  address: `0x${string}`;
  derivationPath: string;
  connected: boolean;
};

export type SecurityDeps = {
  chainId: number;
};
