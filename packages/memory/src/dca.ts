export interface DCAScheduleStore {
  create(input: any): Promise<any>;
  getByUser(userAddress: string): Promise<any[]>;
  updateStatus(id: string, status: string): Promise<void>;
  logExecution(scheduleId: string, status: string, txHash?: string): Promise<void>;
}

export class InMemoryDCAScheduleStore implements DCAScheduleStore {
  private schedules = new Map<string, any>();

  async create(input: any): Promise<any> {
    const id = crypto.randomUUID();
    const schedule = { id, ...input };
    this.schedules.set(id, schedule);
    return schedule;
  }

  async getByUser(userAddress: string): Promise<any[]> {
    return Array.from(this.schedules.values()).filter(s => s.userAddress === userAddress);
  }

  async updateStatus(id: string, status: string): Promise<void> {
    const schedule = this.schedules.get(id);
    if (schedule) schedule.status = status;
  }

  async logExecution(): Promise<void> {}
}
