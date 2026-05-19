/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import type { HardwareWalletInfo } from './types.js';

export async function detectHardwareWallets(): Promise<HardwareWalletInfo[]> {
  return [];
}

export async function connectLedger(
  _derivationPath?: string,
): Promise<HardwareWalletInfo> {
  throw new Error('ledger_connection_not_available_server_side');
}

export async function connectTrezor(): Promise<HardwareWalletInfo> {
  throw new Error('trezor_connection_not_available_server_side');
}
