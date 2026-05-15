export type AutomationRule = {
  id: string;
  name: string;
  condition: Condition;
  action: Action;
  userId: `0x${string}`;
  status: 'active' | 'paused' | 'triggered' | 'failed';
  maxExecutions?: number;
  executionCount: number;
  lastTriggered?: number;
};

export type Condition = {
  type: 'price' | 'balance' | 'health_factor' | 'time' | 'block';
  operator: '>' | '<' | '>=' | '<=' | '==' | 'crosses';
  value: string;
  asset?: string;
};

export type Action = {
  type: string;
  params: Record<string, string>;
};

export type AutomationDeps = {
  chainId: number;
};
