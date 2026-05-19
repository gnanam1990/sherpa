/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

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
