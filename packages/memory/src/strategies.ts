export interface StrategyStore {
  create(input: any): Promise<any>;
  list(visibility?: string): Promise<any[]>;
  get(id: string): Promise<any | null>;
  follow(strategyId: string, userAddress: string): Promise<void>;
  unfollow(strategyId: string, userAddress: string): Promise<void>;
  logExecution(strategyId: string, userAddress: string, results: any): Promise<void>;
}

export class InMemoryStrategyStore implements StrategyStore {
  private strategies = new Map<string, any>();
  async create(input: any): Promise<any> {
    const id = crypto.randomUUID();
    this.strategies.set(id, { id, ...input });
    return { id, ...input };
  }
  async list(visibility?: string): Promise<any[]> {
    return Array.from(this.strategies.values())
      .filter(s => !visibility || s.visibility === visibility);
  }
  async get(id: string): Promise<any | null> { return this.strategies.get(id) ?? null; }
  async follow(): Promise<void> {}
  async unfollow(): Promise<void> {}
  async logExecution(): Promise<void> {}
}
