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
