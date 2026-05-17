import type { AlertRow, EvaluateResult } from '../types.js';
import { checkCondition } from './check-condition.js';

export async function evaluateContractEvent(alert: AlertRow): Promise<EvaluateResult> {
  const contractAddress = alert.params?.contractAddress as string | undefined;
  const topic = alert.params?.topic as string | undefined;
  if (!contractAddress || !topic) {
    return { value: 0, triggered: false, error: 'missing contractAddress or topic' };
  }

  let eventCount: number;
  try {
    eventCount = await fetchEventCount(contractAddress, topic);
  } catch (err) {
    return {
      value: 0,
      triggered: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
  const triggered = checkCondition(eventCount, alert.comparison, Number(alert.threshold));
  return { value: eventCount, triggered };
}

export async function fetchEventCount(contractAddress: string, topic: string): Promise<number> {
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
  if (!resp.ok) throw new Error(`rpc_http_${resp.status}`);
  const json = (await resp.json()) as { result?: unknown[]; error?: { message: string } };
  if (json.error) throw new Error(`rpc_error: ${json.error.message}`);
  if (!json.result) throw new Error('rpc_missing_result');
  return json.result.length;
}
