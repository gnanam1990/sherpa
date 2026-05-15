/**
 * Telegram user → smart-wallet linking.
 *
 * Mirrors the FID-linking pattern from `packages/identity/src/farcaster.ts`:
 * one row per Telegram user ID, upserts update the linked address and
 * reset verified.
 */

export type TgUserLink = {
  tgUserId: number;
  smartwalletAddress: `0x${string}`;
  linkedAt: Date;
  verified: boolean;
};

type SupabaseLike = {
  from(table: string): {
    upsert(data: Record<string, unknown>, options?: Record<string, unknown>): Promise<{ error: unknown }>;
    select(columns: string): {
      eq(column: string, value: unknown): Promise<{ data: unknown[] | null; error: unknown }>;
    };
  };
};

export async function linkTelegramUser(
  tgUserId: number,
  address: `0x${string}`,
  deps: { db?: SupabaseLike },
): Promise<TgUserLink> {
  if (deps.db) {
    const { error } = await deps.db
      .from('telegram_user_links')
      .upsert(
        { tg_user_id: tgUserId, smartwallet_address: address.toLowerCase(), linked_at: new Date().toISOString() },
        { onConflict: 'tg_user_id' },
      );
    if (error) throw new Error(`[telegram] linkTelegramUser upsert failed: ${error}`);
  }
  return { tgUserId, smartwalletAddress: address, linkedAt: new Date(), verified: false };
}

export async function getSmartWalletForTgUser(
  tgUserId: number,
  deps: { db?: SupabaseLike },
): Promise<`0x${string}` | null> {
  if (!deps.db) return null;
  const { data, error } = await deps.db
    .from('telegram_user_links')
    .select('smartwallet_address')
    .eq('tg_user_id', tgUserId);
  if (error) throw new Error(`[telegram] getSmartWalletForTgUser query failed: ${error}`);
  const row = data?.[0] as { smartwallet_address?: string } | undefined;
  return row?.smartwallet_address ? (row.smartwallet_address.toLowerCase() as `0x${string}`) : null;
}

export async function isAuthorized(tgUserId: number): Promise<boolean> {
  const adminIds = (process.env.ADMIN_TG_USER_IDS || '').split(',').map(Number).filter(Boolean);
  if (adminIds.length > 0 && !adminIds.includes(tgUserId)) {
    return false;
  }
  return true;
}
