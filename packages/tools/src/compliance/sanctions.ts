/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

export const SANCTIONED_ADDRESSES: Set<string> = new Set([
  '0x8576acc5c05d6ce88f4e49bf65bdf0c62f91353c',
  '0xd90e2f925da726b50c4ed8d0fb90ad053324f31b',
]);

export function isSanctioned(address: `0x${string}`): boolean {
  return SANCTIONED_ADDRESSES.has(address.toLowerCase());
}
