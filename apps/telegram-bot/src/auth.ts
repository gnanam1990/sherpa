import type { Context, NextFunction } from 'grammy';

export async function adminOnly(ctx: Context, next: NextFunction) {
  const adminIds = (process.env.ADMIN_TG_USER_IDS || '').split(',').filter(Boolean);
  const userId = ctx.from?.id?.toString();
  if (!userId || !adminIds.includes(userId)) {
    await ctx.reply('🏔️ Sherpa is in private beta.\n\nFollow @SherpaOnBase on X for launch news.');
    return;
  }
  await next();
}
