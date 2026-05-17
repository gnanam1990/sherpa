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
