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
 * Authentication for the Sherpa MCP server.
 *
 * Non-custodial model: the server never holds keys. A session is bound to a
 * **Base Account** address only after the user proves control of it with a
 * signature (SIWE-style), verified here with viem — the same primitive the API's
 * surface-link flow uses. Read/plan tools then operate on that bound address.
 *
 * OAuth 2.1: for a remote/HTTP MCP deployment, the transport performs OAuth 2.1
 * and provides the verified Base Account address to `bindFromVerifiedOAuth()`.
 * The tool layer is identical either way — it just needs a verified address.
 */

import { verifyMessage } from 'viem';

export type Address = `0x${string}`;

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

export type SiweProof = {
  address: Address;
  message: string;
  signature: `0x${string}`;
};

/** Verifies a Base Account signature over a login message. */
export interface SignatureVerifier {
  verify(proof: SiweProof): Promise<boolean>;
}

/** Default verifier: viem personal_sign / EIP-1271 message verification. */
export const viemSignatureVerifier: SignatureVerifier = {
  async verify(proof: SiweProof): Promise<boolean> {
    if (!ADDRESS_RE.test(proof.address)) return false;
    try {
      return await verifyMessage({
        address: proof.address,
        message: proof.message,
        signature: proof.signature,
      });
    } catch {
      return false;
    }
  },
};

/**
 * Per-connection session. Holds the verified Base Account address (if any).
 * One session per MCP transport connection.
 */
export class McpSession {
  private boundAddress: Address | null = null;

  constructor(private readonly verifier: SignatureVerifier = viemSignatureVerifier) {}

  /** Bind the session by verifying a Base Account signature. */
  async authenticate(proof: SiweProof): Promise<boolean> {
    const ok = await this.verifier.verify(proof);
    if (ok) this.boundAddress = proof.address.toLowerCase() as Address;
    return ok;
  }

  /** Bind from an already-verified OAuth 2.1 / Base Account transport. */
  bindFromVerifiedOAuth(address: Address): void {
    if (!ADDRESS_RE.test(address)) throw new Error('invalid verified address');
    this.boundAddress = address.toLowerCase() as Address;
  }

  get address(): Address | null {
    return this.boundAddress;
  }

  /** Returns the bound address or throws — used by tools that need identity. */
  requireAddress(): Address {
    if (!this.boundAddress) {
      throw new AuthError('Not authenticated. Call sherpa_authenticate with a Base Account signature first.');
    }
    return this.boundAddress;
  }
}

export class AuthError extends Error {
  readonly code = 'UNAUTHENTICATED';
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}
