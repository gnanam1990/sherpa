export interface NotificationStore {
  subscribe(input: any): Promise<any>;
  unsubscribe(id: string): Promise<void>;
  getByUser(userAddress: string): Promise<any[]>;
  logNotification(notification: any): Promise<any>;
  getRecentNotifications(userAddress: string, limit?: number): Promise<any[]>;
}

export class InMemoryNotificationStore implements NotificationStore {
  private subscriptions = new Map<string, any>();
  private notifications: any[] = [];

  async subscribe(input: any): Promise<any> {
    const id = crypto.randomUUID();
    this.subscriptions.set(id, { id, ...input });
    return { id, ...input };
  }

  async unsubscribe(id: string): Promise<void> {
    const sub = this.subscriptions.get(id);
    if (sub) sub.enabled = false;
  }

  async getByUser(addr: string): Promise<any[]> {
    return Array.from(this.subscriptions.values()).filter(s => s.userAddress === addr);
  }

  async logNotification(notification: any): Promise<any> {
    const id = crypto.randomUUID();
    this.notifications.push({ id, ...notification });
    return { id, ...notification };
  }

  async getRecentNotifications(addr: string, limit = 10): Promise<any[]> {
    return this.notifications
      .filter(n => n.userAddress === addr)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  }
}
