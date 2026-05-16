import { NextResponse } from 'next/server';

const CHAINS = [
  {
    chainId: 8453,
    name: 'Base',
    shortName: 'base',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrl: 'https://mainnet.base.org',
    explorerUrl: 'https://basescan.org',
    dex: { name: 'Aerodrome', routerAddress: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43' },
    aave: { poolAddress: '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5' },
    bridgeProtocols: ['across'],
  },
  {
    chainId: 137,
    name: 'Polygon',
    shortName: 'polygon',
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
    rpcUrl: 'https://polygon-rpc.com',
    explorerUrl: 'https://polygonscan.com',
    dex: { name: 'QuickSwap', routerAddress: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff' },
    aave: { poolAddress: '0x794a61358D6845594F94dc1DB02A252b5b4814aD' },
    bridgeProtocols: ['across', 'layerzero'],
  },
  {
    chainId: 10,
    name: 'Optimism',
    shortName: 'optimism',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrl: 'https://mainnet.optimism.io',
    explorerUrl: 'https://optimistic.etherscan.io',
    dex: { name: 'Velodrome', routerAddress: '0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858' },
    aave: { poolAddress: '0x794a61358D6845594F94dc1DB02A252b5b4814aD' },
    bridgeProtocols: ['across', 'layerzero'],
  },
  {
    chainId: 42161,
    name: 'Arbitrum One',
    shortName: 'arbitrum',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    explorerUrl: 'https://arbiscan.io',
    dex: { name: 'Camelot', routerAddress: '0xc873fEcbd354f5A56E00E710B90EF4201db2448d' },
    aave: { poolAddress: '0x794a61358D6845594F94dc1DB02A252b5b4814aD' },
    bridgeProtocols: ['across', 'layerzero'],
  },
];

export async function GET() {
  return NextResponse.json({ chains: CHAINS });
}
