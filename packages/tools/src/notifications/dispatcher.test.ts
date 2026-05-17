import { describe, test, expect, vi, afterEach } from 'vitest';
import { dispatchNotification } from './dispatcher.js';

vi.mock('web-push', () => ({
  default: {
    sendNotification: vi.fn(async () => ({ statusCode: 201 })),
  },
}));

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Notification dispatcher', () => {
  test('push channel returns explicit config error when VAPID keys are missing', async () => {
    const result = await dispatchNotification(
      'push',
      JSON.stringify({ endpoint: 'https://push.example.com', keys: { p256dh: 'abc', auth: 'def' } }),
      { title: 'Test', body: 'Hello' },
      { config: {} },
    );
    expect(result.success).toBe(false);
    expect(result.error).toBe('web_push_not_configured');
  });

  test('push channel sends via web-push when VAPID keys are configured', async () => {
    const webPush = (await import('web-push')).default;
    const result = await dispatchNotification(
      'web-push',
      JSON.stringify({ endpoint: 'https://push.example.com', keys: { p256dh: 'abc', auth: 'def' } }),
      { title: 'Alert', body: 'Hello', data: { url: '/alerts' } },
      {
        config: {
          push: {
            vapidPrivateKey: 'private',
            vapidPublicKey: 'public',
            vapidSubject: 'mailto:test@example.com',
          },
        },
      },
    );
    expect(result.success).toBe(true);
    expect(webPush.sendNotification).toHaveBeenCalledWith(
      { endpoint: 'https://push.example.com', keys: { p256dh: 'abc', auth: 'def' } },
      expect.any(String),
      expect.objectContaining({
        vapidDetails: {
          privateKey: 'private',
          publicKey: 'public',
          subject: 'mailto:test@example.com',
        },
      }),
    );
    const [, body] = vi.mocked(webPush.sendNotification).mock.calls[0];
    expect(JSON.parse(String(body))).toEqual({ body: 'Hello', title: 'Alert', url: '/alerts' });
  });

  test('email channel returns explicit config error when no provider key exists', async () => {
    const result = await dispatchNotification(
      'email',
      'user@example.com',
      { title: 'Test', body: 'Hello' },
      { config: {} },
    );
    expect(result.success).toBe(false);
    expect(result.error).toBe('email_channel_not_configured');
  });

  test('email channel sends via Resend when configured', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'email-123' }),
    }));
    const result = await dispatchNotification(
      'email',
      'user@example.com',
      { title: 'Sherpa alert', body: 'Hello' },
      {
        config: {
          email: {
            fromAddress: 'Sherpa <alerts@example.com>',
            resendApiKey: 'resend-test',
          },
        },
      },
    );
    expect(result.success).toBe(true);
    expect(result.messageId).toBe('email-123');
    const fetchCall = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(fetchCall[0]).toBe('https://api.resend.com/emails');
    expect(fetchCall[1].headers.Authorization).toBe('Bearer resend-test');
    expect(JSON.parse(fetchCall[1].body as string)).toMatchObject({
      from: 'Sherpa <alerts@example.com>',
      subject: 'Sherpa alert',
      text: 'Hello',
      to: 'user@example.com',
    });
  });

  test('telegram returns error when botToken missing (P1-7)', async () => {
    const result = await dispatchNotification(
      'telegram',
      '12345',
      { title: 'Test', body: 'Hello' },
      { config: { telegram: {} } },
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain('TELEGRAM_BOT_TOKEN');
  });

  test('telegram sends real API request (P1-7)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, result: { message_id: 42 } }),
    }));
    const result = await dispatchNotification(
      'telegram',
      '12345',
      { title: 'Alert', body: 'HF below threshold' },
      { config: { telegram: { botToken: 'test-token' } } },
    );
    expect(result.success).toBe(true);
    expect(result.messageId).toBe('42');
    const fetchCall = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(fetchCall[0]).toContain('api.telegram.org');
    const body = JSON.parse(fetchCall[1].body as string);
    expect(body.chat_id).toBe('12345');
    expect(body.text).toContain('Alert');
  });

  test('telegram returns error on API failure (P1-7)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }));
    const result = await dispatchNotification(
      'telegram',
      '12345',
      { title: 'Test', body: 'Hello' },
      { config: { telegram: { botToken: 'bad-token' } } },
    );
    expect(result.success).toBe(false);
    expect(result.error).toBe('tg_api_401');
  });

  test('farcaster returns error when apiKey missing (P1-7)', async () => {
    const result = await dispatchNotification(
      'farcaster',
      '976779',
      { title: 'Test', body: 'Hello' },
      { config: { farcaster: {} } },
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain('NEYNAR_API_KEY');
  });

  test('farcaster sends real API request (P1-7)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ notification_id: 'notif-123' }),
    }));
    const result = await dispatchNotification(
      'farcaster',
      '976779',
      { title: 'Alert', body: 'HF update' },
      { config: { farcaster: { neynarApiKey: 'test-key' } } },
    );
    expect(result.success).toBe(true);
    expect(result.messageId).toBe('notif-123');
    const fetchCall = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(fetchCall[0]).toContain('neynar.com');
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
