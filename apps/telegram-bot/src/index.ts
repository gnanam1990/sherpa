/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import { Bot, GrammyError, HttpError } from 'grammy';
import {
  handleStart,
  handleHelp,
  handleSend,
  handleBalance,
  handleHistory,
  handleLink,
  handlePositions,
  handleUnlink,
} from './commands.js';
import { handleMessage, setupCallbackHandlers } from './intent-handler.js';
import { adminOnly } from './auth.js';

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error('TELEGRAM_BOT_TOKEN is required');
  process.exit(1);
}

const POLLING_CONFLICT_RETRY_MS = Number(process.env.TELEGRAM_POLLING_CONFLICT_RETRY_MS ?? 35_000);

const bot = new Bot(token);

// Admin-only middleware for beta
bot.use(adminOnly);

// Commands
bot.command('start', handleStart);
bot.command('help', handleHelp);
bot.command('send', handleSend);
bot.command('balance', handleBalance);
bot.command('history', handleHistory);
bot.command('link', handleLink);
bot.command('positions', handlePositions);
bot.command('unlink', handleUnlink);

// Message handler for natural language intents
bot.on('message:text', handleMessage);

// Callback query handlers (inline keyboard buttons)
setupCallbackHandlers(bot);

// Error handling
bot.catch((err) => {
  const ctx = err.ctx;
  console.error(`Error while handling update ${ctx.update.update_id}:`);
  const e = err.error;
  if (e instanceof GrammyError) {
    console.error('Error in request:', e.description);
  } else if (e instanceof HttpError) {
    console.error('Could not contact Telegram:', e);
  } else {
    console.error('Unknown error:', e);
  }
});

let stopping = false;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isPollingConflict(err: unknown): boolean {
  const candidate = err as { error_code?: number; description?: string; method?: string };
  return (
    candidate.error_code === 409 ||
    candidate.method === 'getUpdates' ||
    candidate.description?.includes('terminated by other getUpdates request') === true
  );
}

async function startBotWithRetry(): Promise<void> {
  while (!stopping) {
    try {
      await bot.start({
        onStart: (botInfo) => {
          console.log(`@${botInfo.username} is running`);
        },
      });
      return;
    } catch (err) {
      if (isPollingConflict(err) && !stopping) {
        console.warn(
          `[telegram] another getUpdates poller is active; retrying in ${POLLING_CONFLICT_RETRY_MS}ms`,
        );
        await sleep(POLLING_CONFLICT_RETRY_MS);
        continue;
      }
      throw err;
    }
  }
}

function shutdown(signal: NodeJS.Signals): void {
  if (stopping) return;
  stopping = true;
  console.log(`[telegram] received ${signal}; stopping bot`);
  bot.stop();
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);

startBotWithRetry().catch((err) => {
  console.error('[telegram] fatal', err);
  process.exit(1);
});
