/**
 * @sherpa/identity — address resolvers (M3 ownership).
 *
 * M1's tools MUST go through `resolve()` — never call Farcaster / ENS /
 * Basenames directly. See M3_INFRA_PACK §3.
 */

export * from './types.js';
export * from './resolve.js';
