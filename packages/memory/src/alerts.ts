export interface AlertStore {
  create(input: any): Promise<any>;
  getByUser(userAddress: string): Promise<any[]>;
  updateStatus(id: string, status: string): Promise<void>;
}

export class InMemoryAlertStore implements AlertStore {
  private alerts = new Map<string, any>();

  async create(input: any): Promise<any> {
    const id = crypto.randomUUID();
    const alert = { id, ...input };
    this.alerts.set(id, alert);
    return alert;
  }

  async getByUser(userAddress: string): Promise<any[]> {
    return Array.from(this.alerts.values()).filter(a => a.userAddress === userAddress);
  }

  async updateStatus(id: string, status: string): Promise<void> {
    const alert = this.alerts.get(id);
    if (alert) alert.status = status;
  }
}
