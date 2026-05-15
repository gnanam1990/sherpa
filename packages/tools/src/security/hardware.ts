import type { HardwareWalletInfo } from './types.js';

export async function detectHardwareWallets(): Promise<HardwareWalletInfo[]> {
  return [];
}

export async function connectLedger(
  derivationPath?: string,
): Promise<HardwareWalletInfo> {
  return {
    type: 'ledger',
    address: '0x' + '00'.repeat(20) as `0x${string}`,
    derivationPath: derivationPath || "m/44'/60'/0'/0/0",
    connected: true,
  };
}

export async function connectTrezor(): Promise<HardwareWalletInfo> {
  return {
    type: 'trezor',
    address: '0x' + '00'.repeat(20) as `0x${string}`,
    derivationPath: "m/44'/60'/0'/0/0",
    connected: true,
  };
}
