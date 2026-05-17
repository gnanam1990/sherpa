import { describe, test, expect, vi, beforeEach } from 'vitest';
import {
  handleStart,
  handleHelp,
  handleBalance,
  handleHistory,
  handleLink,
  handlePositions,
  handleUnlink,
} from './commands.js';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

describe('Telegram bot commands', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SHERPA_API_BASE = 'https://api.sherpa.example';
    process.env.SHERPA_WEB_BASE = 'https://sherpa-web.vercel.app';
  });

  test('handleStart sends welcome message', async () => {
    const ctx = { reply: vi.fn(), from: { id: 12345 } };
    await handleStart(ctx as any);
    expect(ctx.reply).toHaveBeenCalledOnce();
    const msg = ctx.reply.mock.calls[0]![0] as string;
    expect(msg).toContain('Welcome to Sherpa');
    expect(msg).toContain('/send');
    expect(msg).toContain('/balance');
    expect(msg).toContain('/history');
    expect(msg).toContain('/link');
    expect(msg).toContain('/positions');
    expect(msg).toContain('/unlink');
  });

  test('handleHelp lists all commands', async () => {
    const ctx = { reply: vi.fn() };
    await handleHelp(ctx as any);
    expect(ctx.reply).toHaveBeenCalledOnce();
    const msg = ctx.reply.mock.calls[0]![0] as string;
    expect(msg).toContain('/send');
    expect(msg).toContain('/balance');
    expect(msg).toContain('/history');
    expect(msg).toContain('/link');
    expect(msg).toContain('/positions');
    expect(msg).toContain('/unlink');
    expect(msg).toContain('natural language');
  });

  test('handleBalance shows linked wallet', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ address: '0x1234', verified: true }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          chain: 'base-sepolia',
          balances: { ETH: '0.01', USDC: '5.00' },
        }),
      });

    const ctx = { reply: vi.fn(), from: { id: 12345 } };
    await handleBalance(ctx as any);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://api.sherpa.example/api/surfaces/telegram/12345',
    );
    expect(fetchMock).toHaveBeenNthCalledWith(2, 'https://api.sherpa.example/api/balance/0x1234');
    expect(ctx.reply).toHaveBeenCalledOnce();
    const msg = ctx.reply.mock.calls[0]![0] as string;
    expect(msg).toContain('0x1234');
    expect(msg).toContain('ETH: 0.01');
    expect(msg).toContain('USDC: 5.00');
  });

  test('handleBalance prompts link when not linked', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false });
    const ctx = { reply: vi.fn(), from: { id: 12345 } };
    await handleBalance(ctx as any);
    const msg = ctx.reply.mock.calls[0]![0] as string;
    expect(msg).toContain('Not linked');
  });

  test('handleBalance shows unavailable when API fails', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ address: '0x1234', verified: true }),
      })
      .mockResolvedValueOnce({ ok: false });

    const ctx = { reply: vi.fn(), from: { id: 12345 } };
    await handleBalance(ctx as any);
    const msg = ctx.reply.mock.calls[0]![0] as string;
    expect(msg).toContain('temporarily unavailable');
  });

  test('handleBalance handles missing API base', async () => {
    delete process.env.SHERPA_API_BASE;
    const ctx = { reply: vi.fn(), from: { id: 12345 } };
    await handleBalance(ctx as any);
    expect(ctx.reply).toHaveBeenCalledOnce();
    const msg = ctx.reply.mock.calls[0]![0] as string;
    expect(msg).toContain('Unable');
  });

  test('handleBalance handles missing from.id', async () => {
    const ctx = { reply: vi.fn(), from: undefined };
    await handleBalance(ctx as any);
    expect(ctx.reply).toHaveBeenCalledOnce();
  });

  test('handleHistory shows wallet address', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ address: '0x1234', verified: true }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          chain: 'base-sepolia',
          items: [
            {
              txHash: `0x${'a'.repeat(64)}`,
              direction: 'out',
              asset: 'USDC',
              amountDisplay: '1',
              counterparty: '0xabcd',
              sherpaIntent: 'SEND',
            },
          ],
        }),
      });

    const ctx = { reply: vi.fn(), from: { id: 12345 } };
    await handleHistory(ctx as any);
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://api.sherpa.example/api/history/0x1234?limit=5',
    );
    const msg = ctx.reply.mock.calls[0]![0] as string;
    expect(msg).toContain('Recent transactions on base-sepolia');
    expect(msg).toContain('OUT 1 USDC to 0xabcd');
    expect(msg).toContain('Intent: SEND');
  });

  test('handleHistory shows empty state', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ address: '0x1234', verified: true }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ chain: 'base-sepolia', items: [] }),
      });

    const ctx = { reply: vi.fn(), from: { id: 12345 } };
    await handleHistory(ctx as any);
    const msg = ctx.reply.mock.calls[0]![0] as string;
    expect(msg).toContain('No recent transactions');
  });

  test('handleHistory prompts link when not linked', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false });
    const ctx = { reply: vi.fn(), from: { id: 12345 } };
    await handleHistory(ctx as any);
    const msg = ctx.reply.mock.calls[0]![0] as string;
    expect(msg).toContain('Not linked');
  });

  test('handleHistory shows unavailable when API fails', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ address: '0x1234', verified: true }),
      })
      .mockResolvedValueOnce({ ok: false });

    const ctx = { reply: vi.fn(), from: { id: 12345 } };
    await handleHistory(ctx as any);
    const msg = ctx.reply.mock.calls[0]![0] as string;
    expect(msg).toContain('temporarily unavailable');
  });

  test('handleHistory handles missing API base', async () => {
    delete process.env.SHERPA_API_BASE;
    const ctx = { reply: vi.fn(), from: { id: 12345 } };
    await handleHistory(ctx as any);
    expect(ctx.reply).toHaveBeenCalledOnce();
  });

  test('handleLink calls sign-intent API', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        token: 'tok123',
        signUrl: 'https://sherpa-web.vercel.app/sign?token=tok123',
      }),
    });

    const ctx = { reply: vi.fn(), from: { id: 12345 } };
    await handleLink(ctx as any);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.sherpa.example/api/surfaces/sign-intent',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(ctx.reply).toHaveBeenCalledOnce();
    const msg = ctx.reply.mock.calls[0]![0] as string;
    expect(msg).toContain('tok123');
    expect(msg).toContain('Link your Smart Wallet');
  });

  test('handleLink shows error on API failure', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false });
    const ctx = { reply: vi.fn(), from: { id: 12345 } };
    await handleLink(ctx as any);
    const msg = ctx.reply.mock.calls[0]![0] as string;
    expect(msg).toContain('Failed to generate link');
  });

  test('handleLink handles missing API base', async () => {
    delete process.env.SHERPA_API_BASE;
    const ctx = { reply: vi.fn(), from: { id: 12345 } };
    await handleLink(ctx as any);
    const msg = ctx.reply.mock.calls[0]![0] as string;
    expect(msg).toContain('Unable');
  });

  test('handleLink handles network error', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network'));
    const ctx = { reply: vi.fn(), from: { id: 12345 } };
    await handleLink(ctx as any);
    const msg = ctx.reply.mock.calls[0]![0] as string;
    expect(msg).toContain('Failed to generate link');
  });

  test('handlePositions shows Base Aave account data', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ address: '0x1234', verified: true }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          address: '0x1234',
          chain: 'base',
          pool: '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5',
          totalCollateralBase: '1234000000',
          totalDebtBase: '250000000',
          availableBorrowsBase: '900000000',
          currentLiquidationThreshold: '8000',
          ltv: '7500',
          healthFactor: '3300000000000000000',
          hasPosition: true,
          fetchedAt: '2026-05-17T00:00:00.000Z',
        }),
      });

    const ctx = { reply: vi.fn(), from: { id: 12345 } };
    await handlePositions(ctx as any);
    expect(fetchMock).toHaveBeenNthCalledWith(2, 'https://api.sherpa.example/api/positions/0x1234');
    const msg = ctx.reply.mock.calls[0]![0] as string;
    expect(msg).toContain('Aave V3 Positions');
    expect(msg).toContain('Health factor: 3.30');
    expect(msg).toContain('Collateral: $12.34');
    expect(msg).toContain('Debt: $2.50');
    expect(msg).toContain('Available to borrow: $9.00');
  });

  test('handlePositions shows empty state', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ address: '0x1234', verified: true }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          address: '0x1234',
          chain: 'base',
          pool: '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5',
          totalCollateralBase: '0',
          totalDebtBase: '0',
          availableBorrowsBase: '0',
          currentLiquidationThreshold: '0',
          ltv: '0',
          healthFactor: `${2n ** 256n - 1n}`,
          hasPosition: false,
          fetchedAt: '2026-05-17T00:00:00.000Z',
        }),
      });

    const ctx = { reply: vi.fn(), from: { id: 12345 } };
    await handlePositions(ctx as any);
    const msg = ctx.reply.mock.calls[0]![0] as string;
    expect(msg).toContain('No active Aave V3 positions');
  });

  test('handlePositions prompts link when not linked', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false });
    const ctx = { reply: vi.fn(), from: { id: 12345 } };
    await handlePositions(ctx as any);
    const msg = ctx.reply.mock.calls[0]![0] as string;
    expect(msg).toContain('Not linked');
  });

  test('handlePositions shows unavailable when API fails', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ address: '0x1234', verified: true }),
      })
      .mockResolvedValueOnce({ ok: false });

    const ctx = { reply: vi.fn(), from: { id: 12345 } };
    await handlePositions(ctx as any);
    const msg = ctx.reply.mock.calls[0]![0] as string;
    expect(msg).toContain('temporarily unavailable');
  });

  test('handleUnlink successfully unlinks', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ address: '0x1234', verified: true }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true }),
      });

    const ctx = { reply: vi.fn(), from: { id: 12345 } };
    await handleUnlink(ctx as any);
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://api.sherpa.example/api/surfaces/telegram/unlink',
      expect.objectContaining({ method: 'POST' }),
    );
    const msg = ctx.reply.mock.calls[0]![0] as string;
    expect(msg).toContain('unlinked');
  });

  test('handleUnlink shows message when not linked', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false });
    const ctx = { reply: vi.fn(), from: { id: 12345 } };
    await handleUnlink(ctx as any);
    const msg = ctx.reply.mock.calls[0]![0] as string;
    expect(msg).toContain('No wallet linked');
  });

  test('handleUnlink shows error on API failure', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ address: '0x1234', verified: true }),
      })
      .mockResolvedValueOnce({ ok: false });

    const ctx = { reply: vi.fn(), from: { id: 12345 } };
    await handleUnlink(ctx as any);
    const msg = ctx.reply.mock.calls[0]![0] as string;
    expect(msg).toContain('Failed to unlink');
  });

  test('handleUnlink handles network error', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ address: '0x1234', verified: true }),
      })
      .mockRejectedValueOnce(new Error('network'));

    const ctx = { reply: vi.fn(), from: { id: 12345 } };
    await handleUnlink(ctx as any);
    const msg = ctx.reply.mock.calls[0]![0] as string;
    expect(msg).toContain('Failed to unlink');
  });

  test('handleBalance handles fetch network error', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network'));
    const ctx = { reply: vi.fn(), from: { id: 12345 } };
    await handleBalance(ctx as any);
    const msg = ctx.reply.mock.calls[0]![0] as string;
    expect(msg).toContain('Failed to check balance');
  });

  test('handleHistory handles fetch network error', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network'));
    const ctx = { reply: vi.fn(), from: { id: 12345 } };
    await handleHistory(ctx as any);
    const msg = ctx.reply.mock.calls[0]![0] as string;
    expect(msg).toContain('Failed to fetch history');
  });

  test('handlePositions handles fetch network error', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network'));
    const ctx = { reply: vi.fn(), from: { id: 12345 } };
    await handlePositions(ctx as any);
    const msg = ctx.reply.mock.calls[0]![0] as string;
    expect(msg).toContain('Failed to fetch positions');
  });

  test('handleHistory truncates long tx hashes', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ address: '0x1234', verified: true }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          chain: 'base-sepolia',
          items: [
            {
              txHash: `0x${'a'.repeat(64)}`,
              direction: 'in',
              asset: 'ETH',
              amountDisplay: '0.5',
              counterparty: '0xdead',
            },
          ],
        }),
      });

    const ctx = { reply: vi.fn(), from: { id: 12345 } };
    await handleHistory(ctx as any);
    const msg = ctx.reply.mock.calls[0]![0] as string;
    expect(msg).toContain('...');
    expect(msg).not.toContain('a'.repeat(64));
  });
});
