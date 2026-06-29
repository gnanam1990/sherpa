/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

/**
 * Build the OFAC sanctioned-address dataset consumed by @sherpa/safety.
 *
 * Fetches the OFAC SDN digital-currency address lists (EVM/0x-format), then
 * normalizes them into a sorted, lowercased, de-duplicated string[] and writes
 * `packages/safety/src/sanctions-data.generated.ts`.
 *
 * Source of record: OFAC publishes the SDN list (sanctions.gov). The Treasury
 * download endpoints are not directly machine-friendly (XML alt-id parsing), so
 * we consume the widely-used, reproducible community mirror that derives the
 * digital-currency address lists straight from the SDN data:
 *   https://github.com/0xB10C/ofac-sanctioned-digital-currency-addresses
 *
 * Run with (Node >= 23, native TS type-stripping):
 *   node scripts/compliance/build-sanctions.ts
 * or:
 *   pnpm tsx scripts/compliance/build-sanctions.ts
 *
 * Re-run whenever OFAC updates the SDN list, then commit the regenerated file.
 */

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const BASE =
  'https://raw.githubusercontent.com/0xB10C/ofac-sanctioned-digital-currency-addresses/lists';

// EVM-settled assets whose OFAC entries carry 0x-format addresses relevant to
// screening on Base / any EVM chain.
const ASSET_LISTS = ['ETH', 'USDC', 'USDT', 'DAI'] as const;

const EVM_ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

async function fetchAssetAddresses(asset: string): Promise<string[]> {
  const url = `${BASE}/sanctioned_addresses_${asset}.txt`;
  const res = await fetch(url);
  if (res.status === 404) {
    // Asset list not currently published (no SDN entries for it) — not an error.
    // eslint-disable-next-line no-console
    console.warn(`  ${asset}: no list published (404), skipping`);
    return [];
  }
  if (!res.ok) {
    throw new Error(`Failed to fetch ${asset} list: HTTP ${res.status}`);
  }
  const text = await res.text();
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => EVM_ADDRESS_RE.test(line));
}

async function main(): Promise<void> {
  const all = new Set<string>();
  for (const asset of ASSET_LISTS) {
    const addrs = await fetchAssetAddresses(asset);
    for (const a of addrs) all.add(a.toLowerCase());
    // eslint-disable-next-line no-console
    console.log(`  ${asset}: ${addrs.length} EVM addresses`);
  }

  const sorted = [...all].sort();

  // Fail closed: refuse to regenerate from an obviously-broken fetch so a
  // transient mirror outage can never silently shrink the dataset to a stub.
  const MIN_EXPECTED = 50;
  if (sorted.length < MIN_EXPECTED) {
    throw new Error(
      `Only ${sorted.length} addresses fetched (< ${MIN_EXPECTED}); refusing to write a regressed list.`,
    );
  }

  const fetchedAt = new Date().toISOString().slice(0, 10);

  const header = `/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

/**
 * GENERATED FILE — DO NOT EDIT BY HAND.
 *
 * OFAC SDN digital-currency sanctioned addresses (EVM / 0x-format), normalized
 * to lowercase, de-duplicated, and sorted.
 *
 * Source:   https://github.com/0xB10C/ofac-sanctioned-digital-currency-addresses
 *           (derived from the OFAC SDN list, sanctions.gov)
 * Assets:   ${ASSET_LISTS.join(', ')}
 * Fetched:  ${fetchedAt}
 * Entries:  ${sorted.length}
 *
 * Regenerate with: node scripts/compliance/build-sanctions.ts
 */
`;

  const body = `export const OFAC_SANCTIONED_ADDRESSES: readonly string[] = [
${sorted.map((a) => `  '${a}',`).join('\n')}
];

export const OFAC_SANCTIONS_PROVENANCE = {
  source:
    'https://github.com/0xB10C/ofac-sanctioned-digital-currency-addresses',
  assets: [${ASSET_LISTS.map((a) => `'${a}'`).join(', ')}],
  fetchedAt: '${fetchedAt}',
  count: ${sorted.length},
} as const;
`;

  const outPath = resolve(
    dirname(fileURLToPath(import.meta.url)),
    '../../packages/safety/src/sanctions-data.generated.ts',
  );
  writeFileSync(outPath, header + '\n' + body);
  // eslint-disable-next-line no-console
  console.log(`\nWrote ${sorted.length} sanctioned addresses -> ${outPath}`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
