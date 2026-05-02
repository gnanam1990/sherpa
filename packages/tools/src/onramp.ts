import type { Address } from '@sherpa/safety';

/**
 * Coinbase Onramp adapter.
 *
 * Onramp is fiat → crypto delivered to a wallet address. There is no on-chain
 * tx for us to build; the user is redirected to a Coinbase-hosted URL and the
 * funds arrive on-chain when the purchase clears. We therefore implement
 * `quote()` + `buildSession()` rather than the standard ToolAdapter shape.
 *
 * Sepolia note: Coinbase Onramp does NOT operate on testnets, so for Stage 1
 * we mock by returning a sandbox URL the frontend recognises. The real `appId`
 * comes from `SHERPA_COINBASE_APP_ID` once we have a CDP project.
 */

export type OnrampParams = {
  /** USD amount the user wants to deposit. */
  usd: string;
  /** Destination wallet (the user's smart wallet). */
  destination: Address;
  /** Asset to deliver. Stage-1: USDC on Base. */
  asset: 'USDC';
};

export type OnrampQuote = {
  asset: 'USDC';
  amountUsd: string;
  /** Estimated fee in USD (Coinbase Onramp ~ 1% on USDC). */
  feeUsd: string;
  /** USDC delivered after fee. */
  netDisplay: string;
};

export type OnrampSession = {
  url: string;
  /** Whether this is the production Coinbase Onramp URL or sandbox/mock. */
  live: boolean;
};

export type OnrampConfig = {
  /** Coinbase Developer Platform project id. Empty → sandbox. */
  appId?: string;
  /** Network slug ("base" or "base-sepolia"). */
  network?: 'base' | 'base-sepolia';
};

const SANDBOX_BASE = 'https://pay.coinbase.com/buy/select-asset';
const PROD_BASE = 'https://pay.coinbase.com/buy/select-asset';

export function createOnramp(config: OnrampConfig = {}) {
  const network = config.network ?? 'base-sepolia';
  const live = Boolean(config.appId) && network === 'base';

  const quote = async (params: OnrampParams): Promise<OnrampQuote> => {
    const usd = Number(params.usd);
    if (!Number.isFinite(usd) || usd <= 0) {
      throw new Error('[onramp] usd must be a positive number');
    }
    const fee = usd * 0.01;
    return {
      asset: 'USDC',
      amountUsd: usd.toFixed(2),
      feeUsd: fee.toFixed(2),
      netDisplay: `${(usd - fee).toFixed(2)} USDC`,
    };
  };

  const buildSession = async (params: OnrampParams): Promise<OnrampSession> => {
    const usd = Number(params.usd);
    if (!Number.isFinite(usd) || usd <= 0) {
      throw new Error('[onramp] usd must be a positive number');
    }
    const base = live ? PROD_BASE : SANDBOX_BASE;
    const qs = new URLSearchParams({
      appId: config.appId ?? 'sandbox',
      addresses: JSON.stringify({ [params.destination]: [network] }),
      assets: JSON.stringify(['USDC']),
      defaultAsset: 'USDC',
      defaultNetwork: network,
      presetFiatAmount: usd.toFixed(2),
      fiatCurrency: 'USD',
    });
    return { url: `${base}?${qs.toString()}`, live };
  };

  return { name: 'onramp' as const, quote, buildSession };
}

export const onramp = createOnramp();
