import Fastify from 'fastify';
import type { AlertStore } from '@sherpa/memory';

export function createHealthServer(store: AlertStore): Fastify.FastifyInstance {
  const app = Fastify({ logger: false });

  app.get('/health', async () => {
    const active = await store.getActive();
    return {
      status: 'ok',
      uptime: process.uptime(),
      activeAlerts: active.length,
      timestamp: new Date().toISOString(),
    };
  });

  return app;
}

export async function startHealthServer(
  store: AlertStore,
  port = Number(process.env.PORT ?? 3001),
): Promise<void> {
  const app = createHealthServer(store);
  try {
    await app.listen({ port, host: '0.0.0.0' });
    console.log(`[worker] health server listening on :${port}`);
  } catch (err) {
    console.error('[worker] health server failed to start', err);
  }
}
