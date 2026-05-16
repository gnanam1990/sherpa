import type { Bot } from 'grammy';
import type { Context } from 'grammy';
import { InlineKeyboard } from 'grammy';
import { randomUUID } from 'node:crypto';

interface ParsedIntent {
  intent: string;
  slots?: Record<string, unknown>;
}

type ParseResponse = {
  parsed?: ParsedIntent;
  card?: Record<string, unknown>;
  error?: string;
};

type PendingIntent = {
  card: Record<string, unknown>;
  input: string;
  intent: string;
  params: Record<string, unknown>;
};

const pendingIntents = new Map<string, PendingIntent>();

const STAGE_2_INTENTS = new Set(['SWAP', 'LEND', 'BORROW', 'REPAY', 'WITHDRAW']);
const STAGE_2_ENABLED = process.env.NEXT_PUBLIC_SHERPA_STAGE_2_ENABLED === 'true';

export async function handleMessage(ctx: Context): Promise<void> {
  if (!ctx.message?.text) return;
  const input = ctx.message.text;

  if (input.startsWith('/')) return;

  const apiBase = process.env.SHERPA_API_BASE;
  if (!apiBase) {
    await ctx.reply('Sherpa API not configured.');
    return;
  }

  await ctx.replyWithChatAction('typing');

  try {
    const parseRes = await fetch(`${apiBase}/api/parse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input }),
    });

    if (!parseRes.ok) {
      await ctx.reply('Failed to parse your request. Please try again.');
      return;
    }

    const data = (await parseRes.json()) as ParseResponse;
    const intent = data.parsed?.intent ?? 'UNKNOWN';
    const params = data.parsed?.slots ?? {};

    if (intent === 'UNKNOWN') {
      await ctx.reply(
        "I didn't understand that. Try:\n" +
          '"send 0.1 ETH to vitalik.base.eth"\n' +
          '"swap 100 USDC for ETH"\n' +
          '"check my balance"',
      );
      return;
    }

    if (!STAGE_2_ENABLED && STAGE_2_INTENTS.has(intent)) {
      await ctx.reply('Stage 2 features (swap, lend, borrow, repay, withdraw) are pending audit and not yet available.');
      return;
    }

    if (!data.card) {
      await ctx.reply(
        data.error ??
          `Sherpa understood ${intent}, but this action is not available from Telegram yet.`,
      );
      return;
    }

    if (!Array.isArray(data.card.batch && (data.card.batch as Record<string, unknown>).calls)) {
      await ctx.reply(buildReadOnlyMessage(intent, params, data.card));
      return;
    }

    const pendingId = randomUUID();
    pendingIntents.set(pendingId, {
      card: data.card,
      input,
      intent,
      params,
    });

    const confirmMsg = buildConfirmationMessage({ intent, slots: params });
    const keyboard = new InlineKeyboard()
      .text('✅ Confirm', `confirm:${pendingId}`)
      .text('❌ Cancel', 'cancel');

    await ctx.reply(confirmMsg, {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    });
  } catch (err) {
    console.error('Intent handling error:', err);
    await ctx.reply('Something went wrong. Please try again.');
  }
}

function buildConfirmationMessage(data: ParsedIntent): string {
  let msg = `*📋 Intent: ${data.intent}*\n\n`;
  if (data.slots) {
    for (const [key, value] of Object.entries(data.slots)) {
      if (value) {
        msg += `*${key}:* ${value}\n`;
      }
    }
  }
  msg += '\n_Confirm to proceed with signing._';
  return msg;
}

function buildReadOnlyMessage(
  intent: string,
  params: Record<string, unknown>,
  card: Record<string, unknown>,
): string {
  const amount = typeof card.primary_amount_display === 'string' ? card.primary_amount_display : '';
  const recipient = typeof card.recipient_display === 'string' ? card.recipient_display : '';
  const lines = [`Sherpa understood: ${intent}`];
  if (amount && amount !== '—') lines.push(amount);
  if (recipient) lines.push(recipient);
  for (const [key, value] of Object.entries(params)) {
    if (value) lines.push(`${key}: ${String(value)}`);
  }
  lines.push('', 'No wallet signature is needed for this Telegram response.');
  return lines.join('\n');
}

export function setupCallbackHandlers(bot: Bot): void {
  bot.callbackQuery(/^confirm:/, async (ctx) => {
    await ctx.answerCallbackQuery();

    const apiBase = process.env.SHERPA_API_BASE;

    if (!apiBase) {
      await ctx.reply('API not configured.');
      return;
    }

    const pendingId = ctx.callbackQuery.data.replace('confirm:', '');
    const pending = pendingIntents.get(pendingId);
    const tgUserId = ctx.from?.id?.toString();

    if (!tgUserId) {
      await ctx.reply('Could not identify user.');
      return;
    }

    if (!pending) {
      await ctx.reply('This confirmation expired. Please send the request again.');
      return;
    }

    try {
      const res = await fetch(`${apiBase}/api/surfaces/sign-intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          surface: 'telegram',
          surfaceUserId: tgUserId,
          intent: {
            card: pending.card,
            input: pending.input,
            intent: pending.intent,
            params: pending.params,
          },
        }),
      });

      if (!res.ok) {
        await ctx.reply('Failed to create signing link. Please try again.');
        return;
      }

      const data = (await res.json()) as { token: string; signUrl: string; expiresAt: string };

      const keyboard = new InlineKeyboard().url('🔗 Sign on web', data.signUrl);

      await ctx.reply(
        `🔗 *Sign your transaction*\n\nOpen this link to confirm:\n${data.signUrl}\n\n⏰ _Link expires in 5 minutes_`,
        { parse_mode: 'Markdown', reply_markup: keyboard },
      );
      pendingIntents.delete(pendingId);
    } catch (err) {
      console.error('Sign intent error:', err);
      await ctx.reply('Failed to create signing link. Please try again.');
    }
  });

  bot.callbackQuery('cancel', async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply('❌ Cancelled.');
  });
}
