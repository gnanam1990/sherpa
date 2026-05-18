import { GLASS_AURORA_ENABLED } from '../lib/feature-flags';
import { HomeContent } from './_components/HomeContent';
import { GlassHome } from './_components/glass/glass-home';

/**
 * Home route. Behind the GLASS_AURORA_ENABLED flag so the Glass Aurora
 * surface can be shipped without immediately replacing production:
 *   - NEXT_PUBLIC_GLASS_AURORA=1 → Glass Aurora home
 *   - unset / 0                  → unchanged legacy home
 *
 * The legacy path renders the existing HomeContent directly. A static
 * rollback copy of this file lives at app/_archive/page.legacy.tsx;
 * importing app route code from _archive at runtime would be unusual, so
 * the flag simply selects between the two live components instead.
 */
export default function HomePage() {
  return GLASS_AURORA_ENABLED ? <GlassHome /> : <HomeContent />;
}
