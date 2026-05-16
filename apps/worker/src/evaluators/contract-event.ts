import type { AlertRow, EvaluateResult } from '../types.js';
import { checkCondition } from './check-condition.js';

export async function evaluateContractEvent(alert: AlertRow): Promise<EvaluateResult> {
  const contractAddress = alert.params?.contractAddress as string | undefined;
  const topic = alert.params?.topic as string | undefined;
  if (!contractAddress || !topic) {
    return { value: 0, triggered: false, error: 'missing contractAddress or topic' };
  }

  const eventCount = await fetchEventCount(contractAddress, topic);
  const triggered = checkCondition(eventCount, alert.comparison, Number(alert.threshold));
  return { value: eventCount, triggered };
}

export async function fetchEventCount(contractAddress: string, topic: string): Promise<number> {
  try {
    const rpcUrl = process.env.BASE_RPC_URL ?? 'https://mainnet.base.org';
    const resp = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_getLogs',
        params: [
          {
            address: contractAddress,
            topics: [topic],
            fromBlock: 'latest',
            toBlock: 'latest',
          },
        ],
      }),
    });
    const json = (await resp.json()) as { result?: unknown[] };
    return json.result?.length ?? 0;
  } catch {
    return 0;
  }
}
