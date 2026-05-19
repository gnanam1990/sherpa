/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import { sendEmailNotification } from '@sherpa/tools';
import type { AlertRow } from '../types.js';
import type { NotifyPayload, NotifyResult } from './telegram.js';

function readEmail(alert: AlertRow): string | null {
  const value = alert.params?.email;
  return typeof value === 'string' && value.includes('@') ? value : null;
}

export async function notifyEmail(
  alert: AlertRow,
  payload: NotifyPayload,
): Promise<NotifyResult> {
  const email = readEmail(alert);
  if (!email) return { success: false, error: 'missing email recipient' };
  return sendEmailNotification(email, payload, {});
}
