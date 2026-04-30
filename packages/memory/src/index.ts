/**
 * @sherpa/memory — audit log wrapper, user prefs, history (M3 ownership).
 *
 * M1 writes to the audit log via `createAuditLog` / `updateAuditLog` only —
 * never INSERTs directly. See M1_BACKEND_PACK §4.
 */

export * from './audit.js';
