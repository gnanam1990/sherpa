const SNAPSHOT_HUB = 'https://hub.snapshot.org';
const SNAPSHOT_API = 'https://api.snapshot.org';

export type SnapshotProposal = {
  id: string;
  title: string;
  body: string;
  choices: string[];
  start: number;
  end: number;
  state: string;
  author: string;
  space: { id: string; name: string };
  scores: number[];
  scores_total: number;
  quorum: number;
  link: string;
};

export type SnapshotVote = {
  id: string;
  voter: string;
  choice: number;
  vp: number;
  reason: string;
  created: number;
};

export async function getProposals(
  space: string,
  state: 'active' | 'closed' | 'all' = 'active',
  first = 20,
): Promise<SnapshotProposal[]> {
  const query = `query Proposals($space: String!, $state: String!, $first: Int!) {
    proposals(where: { space_in: [$space], state: $state }, first: $first, orderBy: "created", orderDirection: desc) {
      id title body choices start end state author
      space { id name }
      scores scores_total quorum link
    }
  }`;
  const res = await fetch(`${SNAPSHOT_API}/graphql`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables: { space, state, first } }),
  });
  const json = (await res.json()) as { data?: { proposals: SnapshotProposal[] } };
  return json.data?.proposals ?? [];
}

export async function getVote(
  proposalId: string,
  voter: string,
): Promise<SnapshotVote | null> {
  const query = `query Vote($proposalId: String!, $voter: String!) {
    votes(where: { proposal: $proposalId, voter: $voter }, first: 1) {
      id voter choice vp reason created
    }
  }`;
  const res = await fetch(`${SNAPSHOT_API}/graphql`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables: { proposalId, voter: voter.toLowerCase() } }),
  });
  const json = (await res.json()) as { data?: { votes: SnapshotVote[] } };
  return json.data?.votes[0] ?? null;
}

export async function getVotesByAddress(
  voter: string,
  first = 50,
): Promise<SnapshotVote[]> {
  const query = `query Votes($voter: String!, $first: Int!) {
    votes(where: { voter: $voter }, first: $first, orderBy: "created", orderDirection: desc) {
      id voter choice vp reason created
    }
  }`;
  const res = await fetch(`${SNAPSHOT_API}/graphql`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables: { voter: voter.toLowerCase(), first } }),
  });
  const json = (await res.json()) as { data?: { votes: SnapshotVote[] } };
  return json.data?.votes ?? [];
}

export type EIP712VoteMessage = {
  domain: { name: string; version: string };
  types: {
    Vote: Array<{ name: string; type: string }>;
  };
  value: {
    space: string;
    proposal: string;
    choice: number;
    app: string;
  };
};

export function buildVoteMessage(
  space: string,
  proposalId: string,
  choice: number,
): EIP712VoteMessage {
  return {
    domain: { name: 'snapshot', version: '0.1.4' },
    types: {
      Vote: [
        { name: 'from', type: 'address' },
        { name: 'space', type: 'string' },
        { name: 'timestamp', type: 'uint64' },
        { name: 'proposal', type: 'bytes32' },
        { name: 'choice', type: 'uint32' },
        { name: 'metadata', type: 'string' },
      ],
    },
    value: {
      space,
      proposal: proposalId,
      choice,
      app: 'sherpa',
    },
  };
}

export async function submitVote(
  address: string,
  space: string,
  proposal: string,
  choice: number,
  signature: string,
  reason = '',
): Promise<{ id: string }> {
  const payload = {
    address,
    data: {
      space,
      proposal,
      choice,
      app: 'sherpa',
      reason,
      timestamp: Math.floor(Date.now() / 1000),
    },
    sig: signature,
  };
  const res = await fetch(`${SNAPSHOT_HUB}/api/msg`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Snapshot vote submission failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as { id: string };
}

export const SNAPSHOT_SPACES = {
  aave: 'aave.eth',
  compound: 'compound.eth',
  optimism: 'optimism.eth',
} as const;
