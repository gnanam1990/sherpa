export interface AutoRepayStore {
  create(input: any): Promise<any>;
  getByUser(userAddress: string): Promise<any[]>;
  updateStatus(id: string, status: string): Promise<void>;
  incrementFailures(id: string): Promise<void>;
  logExecution(ruleId: string, status: string, details: any): Promise<void>;
}

export class InMemoryAutoRepayStore implements AutoRepayStore {
  private rules = new Map<string, any>();

  async create(input: any): Promise<any> {
    const id = crypto.randomUUID();
    this.rules.set(id, { id, ...input });
    return { id, ...input };
  }

  async getByUser(addr: string): Promise<any[]> {
    return Array.from(this.rules.values()).filter((r) => r.userAddress === addr);
  }

  async updateStatus(id: string, s: string): Promise<void> {
    const r = this.rules.get(id);
    if (r) r.status = s;
  }

  async incrementFailures(id: string): Promise<void> {
    const r = this.rules.get(id);
    if (r) r.consecutiveFailures++;
  }

  async logExecution(): Promise<void> {}
}
