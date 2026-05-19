/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

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
