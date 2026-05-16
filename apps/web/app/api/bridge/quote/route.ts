import { NextResponse } from 'next/server';

type QuoteRequest = {
  asset: string;
  amount: string;
  sourceChain: string;
  destinationChain: string;
};

export async function POST(request: Request) {
  let body: QuoteRequest;
  try {
    body = (await request.json()) as QuoteRequest;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { asset, amount, sourceChain, destinationChain } = body;

  if (!asset || !amount || !sourceChain || !destinationChain) {
    return NextResponse.json(
      { error: 'Missing required fields: asset, amount, sourceChain, destinationChain' },
      { status: 400 },
    );
  }

  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
  }

  // Stub quote — real integration would call getBestBridgeQuote
  const feeBps = 10; // 0.1%
  const fee = (parsedAmount * feeBps) / 10000;
  const isL1Involved = sourceChain === 'ethereum' || destinationChain === 'ethereum';
  const estimatedTime = isL1Involved ? 600 : 120;

  return NextResponse.json({
    protocol: 'across',
    fee: fee.toFixed(6),
    estimatedTime,
    minOutAmount: (parsedAmount - fee).toFixed(6),
  });
}
