export type RailIntentIcon =
  | 'ti-arrows-exchange'
  | 'ti-send'
  | 'ti-trending-up'
  | 'ti-arrow-down-circle'
  | 'ti-arrow-up-circle'
  | 'ti-dots';

export type IntentPrefill = {
  label: string;
  prefill: string;
};

export type RailIntent = IntentPrefill & {
  icon: RailIntentIcon;
};

export type IntentCatalogGroup = {
  category: 'DeFi' | 'Social' | 'Bet' | 'Pay' | 'Automate' | 'Account';
  items: IntentPrefill[];
};

export const ACTION_RAIL_INTENTS: RailIntent[] = [
  { label: 'Swap', icon: 'ti-arrows-exchange', prefill: 'swap ' },
  { label: 'Send', icon: 'ti-send', prefill: 'send ' },
  { label: 'Lend', icon: 'ti-trending-up', prefill: 'lend ' },
  { label: 'Borrow', icon: 'ti-arrow-down-circle', prefill: 'borrow ' },
  { label: 'Withdraw', icon: 'ti-arrow-up-circle', prefill: 'withdraw ' },
];

export const MORE_INTENT_GROUPS: IntentCatalogGroup[] = [
  {
    category: 'DeFi',
    items: [
      { label: 'Bridge', prefill: 'bridge ' },
      { label: 'Stake', prefill: 'stake ' },
      { label: 'Unstake', prefill: 'unstake ' },
      { label: 'Add liquidity', prefill: 'add liquidity ' },
      { label: 'Remove liquidity', prefill: 'remove liquidity ' },
      { label: 'Claim rewards', prefill: 'claim rewards ' },
    ],
  },
  {
    category: 'Social',
    items: [
      { label: 'Cast', prefill: 'cast ' },
      { label: 'Tip', prefill: 'tip ' },
      { label: 'Follow', prefill: 'follow ' },
      { label: 'Mint coin', prefill: 'mint coin ' },
      { label: 'Buy coin', prefill: 'buy coin ' },
    ],
  },
  {
    category: 'Bet',
    items: [
      { label: 'Place bet', prefill: 'place bet ' },
      { label: 'Close position', prefill: 'close position ' },
      { label: 'View markets', prefill: 'view markets ' },
    ],
  },
  {
    category: 'Pay',
    items: [
      { label: 'Pay agent', prefill: 'pay agent ' },
      { label: 'Pay merchant', prefill: 'pay merchant ' },
      { label: 'Onramp', prefill: 'onramp ' },
    ],
  },
  {
    category: 'Automate',
    items: [
      { label: 'Set alert', prefill: 'set alert ' },
      { label: 'Schedule DCA', prefill: 'schedule dca ' },
      { label: 'Set limit order', prefill: 'set limit order ' },
    ],
  },
  {
    category: 'Account',
    items: [
      { label: 'History', prefill: 'history ' },
      { label: 'Portfolio', prefill: 'portfolio ' },
      { label: 'Revoke approval', prefill: 'revoke approval ' },
    ],
  },
];
