export const SUBMIT_SELECTOR = '0xa1903eab';

export const STETH_ABI = [
  {
    name: 'submit',
    type: 'function',
    stateMutability: 'payable',
    inputs: [{ name: '_referral', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;
