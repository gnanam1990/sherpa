/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

export type Address = `0x${string}`;

export type ResolvedSource = 'farcaster' | 'basename' | 'ens' | 'direct';

export type ResolvedAddress = {
  address: Address;
  source: ResolvedSource;
  display: string;
  metadata?: {
    farcaster_fid?: number;
    farcaster_username?: string;
    basename?: string;
    ens_name?: string;
    has_activity?: boolean;
    /** True when getCode() returns non-empty bytecode (i.e. the address is a contract). */
    is_contract?: boolean;
  };
};

export type ResolverError =
  | { type: 'not_found'; input: string }
  | { type: 'multiple_matches'; input: string; candidates: ResolvedAddress[] }
  | { type: 'invalid_format'; input: string }
  | { type: 'api_error'; input: string; provider: string; message: string };
