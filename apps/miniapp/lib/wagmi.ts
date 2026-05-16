import { createConfig, http } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';
import { coinbaseWallet } from 'wagmi/connectors';
import { getBuilderDataSuffix } from './builder.js';

// Builder code passed as dataSuffix on every on-chain transaction for Coinbase attribution.
export const BUILDER_DATA_SUFFIX = getBuilderDataSuffix();

export const config = createConfig({
  chains: [base, baseSepolia],
  connectors: [coinbaseWallet({ preference: 'smartWalletOnly' })],
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
  },
});
