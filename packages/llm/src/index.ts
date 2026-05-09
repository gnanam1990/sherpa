/**
 * @sherpa/llm — openclaude router + cost tracking (M1 ownership).
 *
 * Provides a single `complete()` function that the parser / disambig / narration
 * callers use. Real provider fan-out (GPT-4o-mini, Groq Llama, Claude Haiku)
 * lands in Week 2; this module exports the router interface + a deterministic
 * `mockProvider` so callers can be unit-tested without the network.
 */

export * from './types.js';
export * from './router.js';
export * from './mock.js';
export * from './providers.js';
export * from './spend-cap.js';
