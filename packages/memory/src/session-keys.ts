export interface SessionKeyStore {
  create(input: any): Promise<any>;
  getByOwner(ownerAddress: string): Promise<any[]>;
  updateStatus(id: string, status: string): Promise<void>;
  incrementSpent(id: string, amount: bigint): Promise<void>;
  logExecution(sessionKeyId: string, details: any): Promise<void>;
}

export class InMemorySessionKeyStore implements SessionKeyStore {
  private keys = new Map<string, any>();

  async create(input: any): Promise<any> {
    const id = crypto.randomUUID();
    this.keys.set(id, { id, ...input });
    return { id, ...input };
  }

  async getByOwner(addr: string): Promise<any[]> {
    return Array.from(this.keys.values()).filter(k => k.ownerAddress === addr);
  }

  async updateStatus(id: string, s: string): Promise<void> {
    const k = this.keys.get(id);
    if (k) k.status = s;
  }

  async incrementSpent(id: string, amount: bigint): Promise<void> {
    const k = this.keys.get(id);
    if (k) k.spentAmount = (BigInt(k.spentAmount || 0) + amount).toString();
  }

  async logExecution(): Promise<void> {}
}
