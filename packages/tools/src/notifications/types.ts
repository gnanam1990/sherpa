export type NotificationPayload = {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
};

export type NotificationResult = {
  success: boolean;
  messageId?: string;
  error?: string;
};

export type ChannelConfig = {
  push?: { vapidPublicKey?: string; vapidPrivateKey?: string; vapidSubject?: string };
  email?: {
    resendApiKey?: string;
    postmarkApiKey?: string;
    fromAddress?: string;
  };
  farcaster?: { neynarApiKey?: string };
  telegram?: { botToken?: string; chatId?: string };
};

export type NotificationDeps = {
  config: ChannelConfig;
};
