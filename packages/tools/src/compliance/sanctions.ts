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
 * Single source of truth lives in @sherpa/safety (the leaf security package).
 * @sherpa/tools depends on @sherpa/safety, so re-exporting here keeps these
 * signatures stable for existing callers without duplicating the OFAC list or
 * introducing a circular dependency.
 */
import {
  SANCTIONED_ADDRESSES as SAFETY_SANCTIONED_ADDRESSES,
  isSanctioned as safetyIsSanctioned,
} from '@sherpa/safety';

export const SANCTIONED_ADDRESSES: ReadonlySet<string> = SAFETY_SANCTIONED_ADDRESSES;

export function isSanctioned(address: `0x${string}`): boolean {
  return safetyIsSanctioned(address);
}
