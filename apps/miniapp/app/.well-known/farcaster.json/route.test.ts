import { describe, expect, it, vi } from 'vitest';
import { GET } from './route';

describe('Farcaster manifest route', () => {
  it('serves current miniapp metadata with a frame fallback', async () => {
    vi.stubEnv('NEXT_PUBLIC_URL', 'https://sherpa-miniapp.vercel.app');
    vi.stubEnv('SHERPA_API_BASE', 'https://sherpa-api.up.railway.app');
    vi.stubEnv('FARCASTER_HEADER', 'header');
    vi.stubEnv('FARCASTER_PAYLOAD', 'payload');
    vi.stubEnv('FARCASTER_SIGNATURE', 'signature');
    vi.stubEnv('BASE_BUILDER_OWNER_ADDRESS', '0x99f37717f2EB28955CFB553f3B7Eb4eFaDf4dA8C');

    const response = await GET();
    const manifest = await response.json();

    expect(manifest.accountAssociation).toEqual({
      header: 'header',
      payload: 'payload',
      signature: 'signature',
    });
    expect(manifest.baseBuilder).toEqual({
      ownerAddress: '0x99f37717f2EB28955CFB553f3B7Eb4eFaDf4dA8C',
    });
    expect(manifest.miniapp).toMatchObject({
      version: '1',
      name: 'Sherpa',
      homeUrl: 'https://sherpa-miniapp.vercel.app',
      iconUrl: 'https://sherpa-miniapp.vercel.app/icon-1024.png',
      webhookUrl: 'https://sherpa-api.up.railway.app/api/webhooks/farcaster',
      primaryCategory: 'finance',
      canonicalDomain: 'sherpa-miniapp.vercel.app',
    });
    expect(manifest.miniapp.tags).toEqual(['ai', 'agent', 'defi', 'base', 'aave']);
    expect(manifest.miniapp.requiredChains).toEqual(['eip155:8453']);
    expect(manifest.frame).toEqual(manifest.miniapp);
  });

  it('omits baseBuilder when the owner address is not configured', async () => {
    vi.stubEnv('BASE_BUILDER_OWNER_ADDRESS', '');
    vi.stubEnv('NEXT_PUBLIC_BASE_BUILDER_OWNER_ADDRESS', '');

    const response = await GET();
    const manifest = await response.json();

    expect(manifest.baseBuilder).toBeUndefined();
  });
});
