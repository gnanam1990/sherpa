import type { Context } from 'grammy';

export async function handleStart(ctx: Context): Promise<void> {
  await ctx.reply(
    '🏔️ Welcome to Sherpa!\n\n' +
    'I can help you with onchain transactions using natural language.\n\n' +
    'Commands:\n' +
    '/send - Send crypto\n' +
    '/balance - Check balance\n' +
    '/history - Recent transactions\n' +
    '/link - Link your Smart Wallet\n\n' +
    'Or just type what you want to do:\n' +
    '"send 0.1 ETH to vitalik.base.eth"'
  );
}

export async function handleHelp(ctx: Context): Promise<void> {
  await ctx.reply(
    'Available commands:\n' +
    '/send <amount> <asset> to <recipient>\n' +
    '/balance - Show your holdings\n' +
    '/history - Recent transactions\n' +
    '/link - Link your Coinbase Smart Wallet\n\n' +
    'You can also type natural language:\n' +
    '"swap 100 USDC for ETH"\n' +
    '"lend 50 USDC"\n' +
    '"borrow 100 USDC against ETH"'
  );
}

export async function handleSend(ctx: Context): Promise<void> {
  const args = ctx.match;
  if (!args) {
    await ctx.reply('Usage: /send <amount> <asset> to <recipient>\nExample: /send 0.1 ETH to vitalik.base.eth');
    return;
  }
  // Delegate to intent handler
  await ctx.reply(`Processing: send ${args}`);
}

export async function handleBalance(ctx: Context): Promise<void> {
  await ctx.reply('Checking your balance...');
  // TODO: Call Sherpa API
}

export async function handleHistory(ctx: Context): Promise<void> {
  await ctx.reply('Fetching recent transactions...');
  // TODO: Call Sherpa API
}

export async function handleLink(ctx: Context): Promise<void> {
  const webBase = process.env.SHERPA_WEB_BASE || 'https://sherpa-web.vercel.app';
  await ctx.reply(
    '🔗 Link your Smart Wallet\n\n' +
    `Open this link to connect your wallet:\n${webBase}/link?tg=${ctx.from?.id}\n\n` +
    'This links your Telegram account to your Coinbase Smart Wallet.'
  );
}
