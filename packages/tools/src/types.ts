import type { Address } from '@sherpa/safety';

export type Quote<Params, Result> = (params: Params) => Promise<Result>;

export type BuiltTx = {
  to: Address;
  data: `0x${string}`;
  value: bigint;
  /** Whether the tx is expected to be sponsorable via EIP-5792. */
  sponsorable: boolean;
};

export type BuildTx<Params> = (params: Params) => Promise<BuiltTx>;

export type VerifyResult = { ok: true } | { ok: false; reason: string };

export type Verify = (tx: BuiltTx) => Promise<VerifyResult>;

export type ToolAdapter<QuoteParams, QuoteResult, BuildParams> = {
  readonly name: string;
  readonly quote: Quote<QuoteParams, QuoteResult>;
  readonly buildTx: BuildTx<BuildParams>;
  readonly verify: Verify;
};
