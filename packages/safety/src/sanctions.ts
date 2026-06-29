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
 * Single source of truth for OFAC sanctions screening across the monorepo.
 *
 * The address set is compiled from the OFAC SDN digital-currency lists by
 * `scripts/compliance/build-sanctions.ts` into `sanctions-data.generated.ts`.
 * @sherpa/safety is the leaf security package, so it owns the canonical list;
 * @sherpa/tools re-exports from here (tools already depends on safety, so there
 * is no circular dependency the other way).
 */

import {
  OFAC_SANCTIONED_ADDRESSES,
  OFAC_SANCTIONS_PROVENANCE,
} from './sanctions-data.generated.js';

/**
 * Minimum entry count for the list to be considered a real OFAC source rather
 * than a stub. Used by the mainnet honesty gate and the CI regression guard.
 */
export const MIN_SANCTIONS_LIST_SIZE = 50;

export const SANCTIONED_ADDRESSES: ReadonlySet<string> = new Set(
  OFAC_SANCTIONED_ADDRESSES,
);

export const SANCTIONS_PROVENANCE = OFAC_SANCTIONS_PROVENANCE;

/** True when a real (non-stub) sanctions source is loaded. */
export function hasRealSanctionsSource(): boolean {
  return SANCTIONED_ADDRESSES.size >= MIN_SANCTIONS_LIST_SIZE;
}

export function isSanctioned(address: string): boolean {
  return SANCTIONED_ADDRESSES.has(address.toLowerCase());
}

export function isOFACSanctioned(address: string): boolean {
  return isSanctioned(address);
}
