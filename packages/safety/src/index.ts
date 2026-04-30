/**
 * @sherpa/safety — Rings 1-7 (M1 ownership).
 *
 * This package is the single source of truth for safety primitives. Every
 * protocol adapter in `@sherpa/tools` must go through it before building a tx.
 *
 * Week-1 scope: export stable types + allowlist skeleton. No runtime logic yet.
 */

export * from './types.js';
export * from './allowlist.js';
