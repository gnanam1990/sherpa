/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import type { Context } from 'grammy';
import { handleMessage } from './intent-handler.js';

type SurfaceLink = {
  address: string;
  verified: boolean;
};

type BalanceResponse = {
  chain: string;
  balances: {
    ETH: string;
    USDC: string;
  };
};

type HistoryResponse = {
  chain: string;
  items: Array<{
    txHash: string;
    direction: 'in' | 'out' | 'self';
    asset: string;
    amountDisplay: string;
    counterparty: string;
    sherpaIntent?: string;
  }>;
};

type PositionsResponse = {
  address: `0x${string}`;
  chain: 'base';
  pool: `0x${string}`;
  totalCollateralBase: string;
  totalDebtBase: string;
  availableBorrowsBase: string;
  currentLiquidationThreshold: string;
  ltv: string;
  healthFactor: string;
  hasPosition: boolean;
  fetchedAt: string;
};

export async function handleStart(ctx: Context): Promise<void> {
  await ctx.reply(
    '🏔️ Welcome to Sherpa!\n\n' +
      'I can help you with onchain transactions using natural language.\n\n' +
      'Commands:\n' +
      '/send - Send crypto\n' +
      '/balance - Check balance\n' +
      '/history - Recent transactions\n' +
      '/positions - Aave positions\n' +
      '/link - Link your Smart Wallet\n' +
      '/unlink - Disconnect wallet\n\n' +
      'Or just type what you want to do:\n' +
      '"send 0.1 ETH to vitalik.base.eth"',
  );
}

export async function handleHelp(ctx: Context): Promise<void> {
  await ctx.reply(
    'Available commands:\n' +
      '/send <amount> <asset> to <recipient>\n' +
      '/balance - Show your holdings\n' +
      '/history - Recent transactions\n' +
      '/positions - Aave lending positions\n' +
      '/link - Link your Coinbase Smart Wallet\n' +
      '/unlink - Disconnect your wallet\n\n' +
      'You can also type natural language:\n' +
      '"swap 100 USDC for ETH"\n' +
      '"lend 50 USDC"\n' +
      '"borrow 100 USDC against ETH"',
  );
}

export async function handleSend(ctx: Context): Promise<void> {
  const args = typeof ctx.match === 'string' ? ctx.match.trim() : '';
  if (!args) {
    await ctx.reply(
      'Usage: /send <amount> <asset> to <recipient>\nExample: /send 0.1 ETH to vitalik.base.eth',
    );
    return;
  }
  const input = `send ${args}`;
  if (ctx.message) {
    ctx.message.text = input;
  }
  await handleMessage(ctx);
}

export async function handleBalance(ctx: Context): Promise<void> {
  const apiBase = process.env.SHERPA_API_BASE;
  if (!apiBase || !ctx.from?.id) {
    await ctx.reply('Unable to check balance.');
    return;
  }

  try {
    const link = await fetchTelegramLink(apiBase, ctx.from.id);
    if (!link) {
      await ctx.reply('Not linked. Use /link to connect your wallet.');
      return;
    }

    const balanceRes = await fetch(`${apiBase}/api/balance/${link.address}`);
    if (!balanceRes.ok) {
      await ctx.reply(
        `🔗 Linked wallet: \`${link.address}\`\n✅ Verified: ${
          link.verified ? 'Yes' : 'No'
        }\n\nBalance is temporarily unavailable.`,
      );
      return;
    }

    const balance = (await balanceRes.json()) as BalanceResponse;
    await ctx.reply(
      [
        `🔗 Linked wallet: \`${link.address}\``,
        `✅ Verified: ${link.verified ? 'Yes' : 'No'}`,
        '',
        `Balance on ${balance.chain}`,
        `ETH: ${balance.balances.ETH}`,
        `USDC: ${balance.balances.USDC}`,
      ].join('\n'),
    );
  } catch {
    await ctx.reply('Failed to check balance. Please try again.');
  }
}

export async function handleHistory(ctx: Context): Promise<void> {
  const apiBase = process.env.SHERPA_API_BASE;
  if (!apiBase || !ctx.from?.id) {
    await ctx.reply('Unable to fetch history.');
    return;
  }

  try {
    const link = await fetchTelegramLink(apiBase, ctx.from.id);
    if (!link) {
      await ctx.reply('Not linked. Use /link to connect your wallet.');
      return;
    }

    const historyRes = await fetch(`${apiBase}/api/history/${link.address}?limit=5`);
    if (!historyRes.ok) {
      await ctx.reply(`📜 History for: \`${link.address}\`\n\nHistory is temporarily unavailable.`);
      return;
    }

    const history = (await historyRes.json()) as HistoryResponse;
    await ctx.reply(formatHistory(history));
  } catch {
    await ctx.reply('Failed to fetch history. Please try again.');
  }
}

async function fetchTelegramLink(apiBase: string, tgUserId: number): Promise<SurfaceLink | null> {
  const res = await fetch(`${apiBase}/api/surfaces/telegram/${tgUserId}`);
  if (!res.ok) return null;
  return (await res.json()) as SurfaceLink;
}

function shortTxHash(txHash: string): string {
  if (txHash.length <= 20) return txHash;
  return `${txHash.slice(0, 10)}...${txHash.slice(-8)}`;
}

function formatHistory(data: HistoryResponse): string {
  if (data.items.length === 0) return `No recent transactions on ${data.chain}.`;

  const rows = data.items.slice(0, 5).map((item) => {
    const relation = item.direction === 'in' ? 'from' : item.direction === 'self' ? 'with' : 'to';
    return [
      `${item.direction.toUpperCase()} ${item.amountDisplay} ${item.asset} ${relation} ${item.counterparty}`,
      `Tx: ${shortTxHash(item.txHash)}`,
      item.sherpaIntent ? `Intent: ${item.sherpaIntent}` : undefined,
    ]
      .filter(Boolean)
      .join('\n');
  });

  return [`Recent transactions on ${data.chain}`, ...rows].join('\n\n');
}

function formatBaseUsd(value: string): string {
  const raw = BigInt(value);
  const whole = raw / 100_000_000n;
  const cents = ((raw % 100_000_000n) / 1_000_000n).toString().padStart(2, '0');
  return `$${whole}.${cents}`;
}

function formatHealthFactor(value: string): string {
  const hf = BigInt(value);
  if (hf === 2n ** 256n - 1n) return '∞ (no debt)';
  const whole = hf / 1_000_000_000_000_000_000n;
  const decimals = ((hf % 1_000_000_000_000_000_000n) / 10_000_000_000_000_000n)
    .toString()
    .padStart(2, '0');
  return `${whole}.${decimals}`;
}

function formatPositions(address: string, positions: PositionsResponse): string {
  if (!positions.hasPosition) {
    return [
      `🔗 Linked wallet: ${address}`,
      '',
      'No active Aave V3 positions on Base.',
      'Lend, borrow, withdraw, and repay are live in the Sherpa web app on Base mainnet.',
    ].join('\n');
  }

  return [
    `📊 Aave V3 Positions for ${address}`,
    '',
    `Health factor: ${formatHealthFactor(positions.healthFactor)}`,
    `Collateral: ${formatBaseUsd(positions.totalCollateralBase)}`,
    `Debt: ${formatBaseUsd(positions.totalDebtBase)}`,
    `Available to borrow: ${formatBaseUsd(positions.availableBorrowsBase)}`,
    '',
    `Updated: ${new Date(positions.fetchedAt).toLocaleString()}`,
  ].join('\n');
}

export async function handlePositions(ctx: Context): Promise<void> {
  const apiBase = process.env.SHERPA_API_BASE;
  if (!apiBase || !ctx.from?.id) {
    await ctx.reply('Unable to fetch positions.');
    return;
  }

  try {
    const link = await fetchTelegramLink(apiBase, ctx.from.id);
    if (!link) {
      await ctx.reply('Not linked. Use /link to connect your wallet.');
      return;
    }

    const positionsRes = await fetch(`${apiBase}/api/positions/${link.address}`);
    if (!positionsRes.ok) {
      await ctx.reply(
        `🔗 Linked wallet: \`${link.address}\`\n\nAave positions are temporarily unavailable.`,
      );
      return;
    }

    const positions = (await positionsRes.json()) as PositionsResponse;
    await ctx.reply(formatPositions(link.address, positions));
  } catch {
    await ctx.reply('Failed to fetch positions. Please try again.');
  }
}

export async function handleUnlink(ctx: Context): Promise<void> {
  const apiBase = process.env.SHERPA_API_BASE;
  if (!apiBase || !ctx.from?.id) {
    await ctx.reply('Unable to unlink.');
    return;
  }

  try {
    const link = await fetchTelegramLink(apiBase, ctx.from.id);
    if (!link) {
      await ctx.reply('No wallet linked. Use /link to connect one.');
      return;
    }

    const res = await fetch(`${apiBase}/api/surfaces/telegram/unlink`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tgUserId: ctx.from.id }),
    });

    if (!res.ok) {
      await ctx.reply('Failed to unlink. Please try again.');
      return;
    }

    await ctx.reply(
      `✅ Wallet \`${link.address}\` has been unlinked from your Telegram account.\n\nUse /link to connect a new wallet.`,
      { parse_mode: 'Markdown' },
    );
  } catch {
    await ctx.reply('Failed to unlink. Please try again.');
  }
}

export async function handleLink(ctx: Context): Promise<void> {
  const apiBase = process.env.SHERPA_API_BASE;
  const webBase = process.env.SHERPA_WEB_BASE || 'https://sherpa-web.vercel.app';
  const tgUserId = ctx.from?.id;

  if (!apiBase || !tgUserId) {
    await ctx.reply('Unable to generate link.');
    return;
  }

  try {
    const res = await fetch(`${apiBase}/api/surfaces/sign-intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        surface: 'telegram',
        surfaceUserId: tgUserId.toString(),
        intent: { type: 'LINK' },
      }),
    });

    if (!res.ok) {
      await ctx.reply('Failed to generate link. Please try again.');
      return;
    }

    const data = (await res.json()) as { token: string; signUrl: string };

    await ctx.reply(
      '🔗 Link your Smart Wallet\n\n' +
        `Open this link to connect your wallet:\n${webBase}/link?tg=${tgUserId}&token=${data.token}\n\n` +
        'This links your Telegram account to your Coinbase Smart Wallet.',
    );
  } catch {
    await ctx.reply('Failed to generate link. Please try again.');
  }
}
