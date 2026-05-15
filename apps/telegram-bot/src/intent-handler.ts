import { Bot } from 'grammy';
import type { Context } from 'grammy';
import { InlineKeyboard } from 'grammy';

interface ParsedIntent {
  intent: string;
  params?: Record<string, unknown>;
}

export async function handleMessage(ctx: Context): Promise<void> {
  if (!ctx.message?.text) return;
  const input = ctx.message.text;

  // Skip commands
  if (input.startsWith('/')) return;

  const apiBase = process.env.SHERPA_API_BASE;
  if (!apiBase) {
    await ctx.reply('Sherpa API not configured.');
    return;
  }

  // Show typing indicator
  await ctx.replyWithChatAction('typing');

  try {
    // Parse intent
    const parseRes = await fetch(`${apiBase}/api/parse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input }),
    });

    if (!parseRes.ok) {
      await ctx.reply('Failed to parse your request. Please try again.');
      return;
    }

    const data = (await parseRes.json()) as ParsedIntent;

    if (data.intent === 'UNKNOWN') {
      await ctx.reply(
        "I didn't understand that. Try:\n" +
        '"send 0.1 ETH to vitalik.base.eth"\n' +
        '"swap 100 USDC for ETH"\n' +
        '"check my balance"'
      );
      return;
    }

    // Build confirmation message
    const confirmMsg = buildConfirmationMessage(data);
    const keyboard = new InlineKeyboard()
      .text('✅ Confirm', `confirm:${data.intent}`)
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
  // Build a readable confirmation message from parsed intent
  let msg = `*📋 Intent: ${data.intent}*\n\n`;

  if (data.params) {
    for (const [key, value] of Object.entries(data.params)) {
      if (value) {
        msg += `*${key}:* ${value}\n`;
      }
    }
  }

  msg += '\n_Confirm to proceed with signing._';
  return msg;
}

// Handle callback queries (button presses)
export function setupCallbackHandlers(bot: Bot): void {
  bot.callbackQuery(/^confirm:/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const webBase = process.env.SHERPA_WEB_BASE || 'https://sherpa-web.vercel.app';
    const signingUrl = `${webBase}/sign?token=${Date.now()}`; // Stub token
    await ctx.reply(
      `🔗 *Sign your transaction*\n\nOpen this link to confirm:\n${signingUrl}`,
      { parse_mode: 'Markdown' }
    );
  });

  bot.callbackQuery('cancel', async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply('❌ Cancelled.');
  });
}
