/**
 * Feature flags for the web app.
 *
 * GLASS_AURORA_ENABLED gates the Glass Aurora visual system so it can be
 * rolled out (and rolled back) without code changes. Set the env var
 * `NEXT_PUBLIC_GLASS_AURORA=1` to opt a deployment into the new design.
 *
 * This is read at build/eval time from a `NEXT_PUBLIC_*` variable so it is
 * safely inlined into client bundles. It is intentionally a plain constant
 * (not a hook) so it can be referenced from both server and client modules.
 */
export const GLASS_AURORA_ENABLED =
  process.env.NEXT_PUBLIC_GLASS_AURORA === '1';
