import type { NotificationPayload, NotificationResult } from '../types.js';

type EmailConfig = {
  resendApiKey?: string;
  postmarkApiKey?: string;
  fromAddress?: string;
};

function readEmailConfig(config: EmailConfig): Required<Pick<EmailConfig, 'fromAddress'>> & EmailConfig {
  return {
    fromAddress: config.fromAddress ?? process.env.EMAIL_FROM_ADDRESS ?? 'Sherpa <alerts@sherpa-web.vercel.app>',
    postmarkApiKey: config.postmarkApiKey ?? process.env.POSTMARK_API_KEY,
    resendApiKey: config.resendApiKey ?? process.env.RESEND_API_KEY,
  };
}

async function sendViaResend(
  to: string,
  payload: NotificationPayload,
  config: ReturnType<typeof readEmailConfig>,
): Promise<NotificationResult> {
  let resp: Response;
  try {
    resp = await fetch('https://api.resend.com/emails', {
      body: JSON.stringify({
        from: config.fromAddress,
        to,
        subject: payload.title,
        text: payload.body,
      }),
      headers: {
        Authorization: `Bearer ${config.resendApiKey}`,
        'Content-Type': 'application/json',
      },
      method: 'POST',
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    return { success: false, error: `email_fetch_error: ${err instanceof Error ? err.message : String(err)}` };
  }

  if (!resp.ok) return { success: false, error: `resend_api_${resp.status}` };
  const json = (await resp.json().catch(() => null)) as { id?: string } | null;
  return { success: true, messageId: json?.id ?? '' };
}

async function sendViaPostmark(
  to: string,
  payload: NotificationPayload,
  config: ReturnType<typeof readEmailConfig>,
): Promise<NotificationResult> {
  let resp: Response;
  try {
    resp = await fetch('https://api.postmarkapp.com/email', {
      body: JSON.stringify({
        From: config.fromAddress,
        To: to,
        Subject: payload.title,
        TextBody: payload.body,
      }),
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Postmark-Server-Token': config.postmarkApiKey ?? '',
      },
      method: 'POST',
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    return { success: false, error: `email_fetch_error: ${err instanceof Error ? err.message : String(err)}` };
  }

  if (!resp.ok) return { success: false, error: `postmark_api_${resp.status}` };
  const json = (await resp.json().catch(() => null)) as { MessageID?: string } | null;
  return { success: true, messageId: json?.MessageID ?? '' };
}

export async function sendEmailNotification(
  to: string,
  payload: NotificationPayload,
  config: EmailConfig,
): Promise<NotificationResult> {
  const resolved = readEmailConfig(config);
  if (resolved.resendApiKey) return sendViaResend(to, payload, resolved);
  if (resolved.postmarkApiKey) return sendViaPostmark(to, payload, resolved);
  return { success: false, error: 'email_channel_not_configured' };
}
