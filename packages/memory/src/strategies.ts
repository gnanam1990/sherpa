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
  private followers = new Map<string, Set<string>>();
  private executions: any[] = [];

  async create(input: any): Promise<any> {
    const id = crypto.randomUUID();
    const strategy = {
      id,
      followers: 0,
      createdAt: Date.now(),
      ...input,
    };
    this.strategies.set(id, strategy);
    return strategy;
  }

  async list(visibility?: string): Promise<any[]> {
    return Array.from(this.strategies.values())
      .filter(s => !visibility || s.visibility === visibility);
  }

  async get(id: string): Promise<any | null> { return this.strategies.get(id) ?? null; }

  async follow(strategyId: string, userAddress: string): Promise<void> {
    const followers = this.followers.get(strategyId) ?? new Set<string>();
    followers.add(userAddress.toLowerCase());
    this.followers.set(strategyId, followers);

    const strategy = this.strategies.get(strategyId);
    if (strategy) {
      strategy.followers = followers.size;
      this.strategies.set(strategyId, strategy);
    }
  }

  async unfollow(strategyId: string, userAddress: string): Promise<void> {
    const followers = this.followers.get(strategyId);
    followers?.delete(userAddress.toLowerCase());

    const strategy = this.strategies.get(strategyId);
    if (strategy) {
      strategy.followers = followers?.size ?? 0;
      this.strategies.set(strategyId, strategy);
    }
  }

  async logExecution(strategyId: string, userAddress: string, results: any): Promise<void> {
    this.executions.push({
      strategyId,
      userAddress: userAddress.toLowerCase(),
      results,
      createdAt: Date.now(),
    });
  }
}
