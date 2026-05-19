/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

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
