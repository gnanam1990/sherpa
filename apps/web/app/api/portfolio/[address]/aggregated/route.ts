import { NextResponse } from 'next/server';

type TokenBalance = {
  symbol: string;
  balance: string;
  balanceUsd: string;
  chainId: number;
  chainName: string;
};

type ChainPortfolio = {
  chainId: number;
  chainName: string;
  totalValueUsd: string;
  tokens: TokenBalance[];
};

type AggregatedData = {
  address: string;
  totalValueUsd: string;
  chains: ChainPortfolio[];
};

const CHAIN_NAMES: Record<number, string> = {
  8453: 'Base',
  137: 'Polygon',
  10: 'Optimism',
  42161: 'Arbitrum',
};

const STUB_TOKENS: Record<number, TokenBalance[]> = {
  8453: [
    { symbol: 'ETH', balance: '1.5', balanceUsd: '4500', chainId: 8453, chainName: 'Base' },
    { symbol: 'USDC', balance: '1000', balanceUsd: '1000', chainId: 8453, chainName: 'Base' },
  ],
  137: [
    { symbol: 'MATIC', balance: '500', balanceUsd: '250', chainId: 137, chainName: 'Polygon' },
    { symbol: 'USDC', balance: '500', balanceUsd: '500', chainId: 137, chainName: 'Polygon' },
  ],
  10: [
    { symbol: 'ETH', balance: '0.5', balanceUsd: '1500', chainId: 10, chainName: 'Optimism' },
    { symbol: 'OP', balance: '100', balanceUsd: '250', chainId: 10, chainName: 'Optimism' },
  ],
  42161: [
    { symbol: 'ETH', balance: '1.0', balanceUsd: '3000', chainId: 42161, chainName: 'Arbitrum' },
    { symbol: 'ARB', balance: '500', balanceUsd: '600', chainId: 42161, chainName: 'Arbitrum' },
  ],
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ address: string }> },
) {
  const { address } = await params;
  const url = new URL(request.url);
  const chainIdParam = url.searchParams.get('chainId');

  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return NextResponse.json({ error: 'Invalid address' }, { status: 400 });
  }

  const chainIds = chainIdParam
    ? [Number(chainIdParam)]
    : [8453, 137, 10, 42161];

  const chains: ChainPortfolio[] = chainIds
    .filter((id) => CHAIN_NAMES[id])
    .map((chainId) => {
      const tokens = STUB_TOKENS[chainId] ?? [];
      const totalUsd = tokens.reduce((sum, t) => sum + parseFloat(t.balanceUsd), 0);
      return {
        chainId,
        chainName: CHAIN_NAMES[chainId]!,
        totalValueUsd: totalUsd.toFixed(2),
        tokens,
      };
    });

  const totalValueUsd = chains
    .reduce((sum, c) => sum + parseFloat(c.totalValueUsd), 0)
    .toFixed(2);

  const data: AggregatedData = {
    address,
    totalValueUsd,
    chains,
  };

  return NextResponse.json(data);
}
