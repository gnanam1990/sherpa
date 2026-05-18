export type ProposalMetadata = {
  id: string;
  title: string;
  description: string;
  proposer: `0x${string}`;
  status: 'pending' | 'active' | 'passed' | 'rejected' | 'executed';
  votesFor: string;
  votesAgainst: string;
  votesAbstain: string;
  quorum: string;
  startTime: number;
  endTime: number;
};

export type VoteParams = {
  proposalId: string;
  support: 'yes' | 'no' | 'abstain';
  reason?: string;
  governorAddress?: `0x${string}`;
};

export type DelegateParams = {
  delegatee: `0x${string}`;
};

export type GovernanceDeps = {
  chainId: number;
  governorAddress?: `0x${string}`;
};
