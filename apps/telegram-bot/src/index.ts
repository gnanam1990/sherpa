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

// Start bot
bot.start({
  onStart: (botInfo) => {
    console.log(`@${botInfo.username} is running`);
  },
});
