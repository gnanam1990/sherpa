export type SessionKeyConfig = {
  owner: `0x${string}`;
  chainId: number;
  spendLimit: bigint;
  validDuration: number; // seconds
  permissions: SessionKeyPermission[];
};

export type SessionKeyPermission = {
  target: `0x${string}`;
  selector: `0x${string}`;
  maxValue: bigint;
};

export type SessionKeyDeployment = {
  sessionKeyAddress: `0x${string}`;
  deploymentTx: `0x${string}`;
  validFrom: number;
  validUntil: number;
};

export type SessionKeyDeps = {
  chainId: number;
  bundlerUrl?: string;
};
