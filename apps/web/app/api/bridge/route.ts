import { NextResponse } from 'next/server';

type BridgeRequest = {
  asset: string;
  amount: string;
  sourceChain: string;
  destinationChain: string;
  recipient: string;
  sender: string;
  preferSpeed?: boolean;
};

export async function POST(request: Request) {
  let body: BridgeRequest;
  try {
    body = (await request.json()) as BridgeRequest;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { asset, amount, sourceChain, destinationChain, recipient, sender } = body;

  if (!asset || !amount || !sourceChain || !destinationChain || !recipient || !sender) {
    return NextResponse.json(
      { error: 'Missing required fields: asset, amount, sourceChain, destinationChain, recipient, sender' },
      { status: 400 },
    );
  }

  if (!/^0x[a-fA-F0-9]{40}$/.test(recipient) || !/^0x[a-fA-F0-9]{40}$/.test(sender)) {
    return NextResponse.json({ error: 'Invalid address format' }, { status: 400 });
  }

  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
  }

  if (sourceChain === destinationChain) {
    return NextResponse.json({ error: 'Source and destination chains must differ' }, { status: 400 });
  }

  // Stub response — real integration would call bridge-aggregator
  return NextResponse.json({
    ok: true,
    protocol: 'across',
    txHash: `0x${'0'.repeat(64)}`,
    sourceChain,
    destinationChain,
    asset,
    amount,
    estimatedTime: 120,
  });
}
