/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import type { AlertRow } from '../types.js';
import type { NotifyResult, NotifyPayload } from './telegram.js';

export type FarcasterNotificationToken = {
  token: string;
  url: string;
};

export type FarcasterTokenResolver = (
  fid: number,
) => Promise<FarcasterNotificationToken | null>;

let tokenResolver: FarcasterTokenResolver | undefined;

export function setFarcasterTokenResolver(resolver: FarcasterTokenResolver | undefined): void {
  tokenResolver = resolver;
}

function readFid(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) return value;
  if (typeof value === 'string' && /^\d+$/.test(value)) return Number(value);
  return null;
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, Math.max(0, max - 3))}...`;
}

export async function notifyFarcaster(
  alert: AlertRow,
  payload: NotifyPayload,
): Promise<NotifyResult> {
  const fid = readFid(alert.params?.farcasterFid);
  let notificationUrl = alert.params?.notificationUrl as string | undefined;
  let notificationToken = alert.params?.notificationToken as string | undefined;

  if (!fid) {
    return { success: false, error: 'missing farcaster fid' };
  }

  if ((!notificationUrl || !notificationToken) && tokenResolver) {
    const token = await tokenResolver(fid);
    notificationUrl = notificationUrl ?? token?.url;
    notificationToken = notificationToken ?? token?.token;
  }

  if (!notificationUrl || !notificationToken) {
    return { success: false, error: 'missing farcaster notification token' };
  }

  try {
    const targetUrl =
      (alert.params?.targetUrl as string | undefined) ??
      process.env.FARCASTER_NOTIFICATION_TARGET_URL ??
      'https://sherpa-miniapp.vercel.app';
    const resp = await fetch(notificationUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        notificationId: crypto.randomUUID(),
        title: truncate(payload.title, 32),
        body: truncate(payload.body, 128),
        targetUrl,
        tokens: [notificationToken],
      }),
    });
    if (!resp.ok) return { success: false, error: `farcaster ${resp.status}` };
    const data = (await resp.json().catch(() => null)) as
      | {
          result?: {
            successfulTokens?: string[];
            invalidTokens?: string[];
            rateLimitedTokens?: string[];
          };
        }
      | null;
    if (data?.result?.successfulTokens && data.result.successfulTokens.length === 0) {
      const invalid = data.result.invalidTokens?.length ?? 0;
      const rateLimited = data.result.rateLimitedTokens?.length ?? 0;
      return {
        success: false,
        error: `farcaster undelivered invalid=${invalid} rateLimited=${rateLimited}`,
      };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
