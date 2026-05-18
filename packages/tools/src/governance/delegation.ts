import { buildDelegateTx as aaveDelegate } from './aave-gov.js';
import { buildDelegateTx as compoundDelegate } from './compound-gov.js';
import { buildDelegateTx as optimismDelegate } from './optimism-gov.js';

export type Protocol = 'aave' | 'compound' | 'optimism';

export type DelegationResult = {
  to: `0x${string}`;
  data: `0x${string}`;
  value: bigint;
  protocol: Protocol;
  delegator: `0x${string}`;
  delegatee: `0x${string}`;
};

export function delegate(
  userAddress: `0x${string}`,
  delegatee: `0x${string}`,
  protocol: Protocol,
): DelegationResult {
  const builders: Record<Protocol, (d: `0x${string}`) => { to: `0x${string}`; data: `0x${string}`; value: bigint }> = {
    aave: aaveDelegate,
    compound: compoundDelegate,
    optimism: optimismDelegate,
  };
  const builder = builders[protocol];
  if (!builder) throw new Error(`Unsupported protocol: ${protocol}`);
  const tx = builder(delegatee);
  return { ...tx, protocol, delegator: userAddress, delegatee };
}

export type DelegationStatus = {
  protocol: Protocol;
  delegatee: `0x${string}` | null;
  active: boolean;
  note?: string;
};

export async function getDelegation(
  userAddress: `0x${string}`,
  protocol: Protocol,
): Promise<DelegationStatus> {
  // On-chain delegation status requires a live RPC call to read the delegate mapping.
  // Return honest "unknown" state instead of hardcoded false.
  void userAddress;
  return {
    protocol,
    delegatee: null,
    active: false,
    note: 'Delegation status requires on-chain read. Snapshot provides delegation data separately.',
  };
}

export function revokeDelegation(
  userAddress: `0x${string}`,
  protocol: Protocol,
): DelegationResult {
  return delegate(userAddress, userAddress, protocol);
}

export function delegateToAll(
  userAddress: `0x${string}`,
  delegatee: `0x${string}`,
): DelegationResult[] {
  const protocols: Protocol[] = ['aave', 'compound', 'optimism'];
  return protocols.map((p) => delegate(userAddress, delegatee, p));
}

export function revokeAll(
  userAddress: `0x${string}`,
): DelegationResult[] {
  return delegateToAll(userAddress, userAddress);
}
