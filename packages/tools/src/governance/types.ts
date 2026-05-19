/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

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
