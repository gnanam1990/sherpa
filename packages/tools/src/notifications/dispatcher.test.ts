import { describe, test, expect } from 'vitest';
import { dispatchNotification } from './dispatcher.js';

describe('Notification dispatcher', () => {
  test('dispatches push notification', async () => {
    const result = await dispatchNotification(
      'push',
      JSON.stringify({ endpoint: 'https://push.example.com', keys: { p256dh: 'abc', auth: 'def' } }),
      { title: 'Test', body: 'Hello' },
      { config: {} },
    );
    expect(result.success).toBe(true);
  });

  test('dispatches email notification', async () => {
    const result = await dispatchNotification(
      'email',
      'user@example.com',
      { title: 'Test', body: 'Hello' },
      { config: {} },
    );
    expect(result.success).toBe(true);
  });

  test('rejects unsupported channel', async () => {
    const result = await dispatchNotification(
      'sms',
      '+1234567890',
      { title: 'Test', body: 'Hello' },
      { config: {} },
    );
    expect(result.success).toBe(false);
  });
});
