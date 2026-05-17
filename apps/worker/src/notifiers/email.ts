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
