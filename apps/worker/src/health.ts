import Fastify from 'fastify';
import type { AlertStore } from '@sherpa/memory';

export type WorkerHealthExtra = () => Promise<Record<string, unknown>>;

export function createHealthServer(
  store: AlertStore,
  extra?: WorkerHealthExtra,
): Fastify.FastifyInstance {
  const app = Fastify({ logger: false });

  app.get('/health', async () => {
    const active = await store.getActive();
    const extraFields = extra ? await extra() : {};
    return {
      status: 'ok',
      uptime: process.uptime(),
      activeAlerts: active.length,
      timestamp: new Date().toISOString(),
      ...extraFields,
    };
  });

  return app;
}

export async function startHealthServer(
  store: AlertStore,
  port = Number(process.env.PORT ?? 3001),
  extra?: WorkerHealthExtra,
): Promise<void> {
  const app = createHealthServer(store, extra);
  try {
    await app.listen({ port, host: '0.0.0.0' });
    console.log(`[worker] health server listening on :${port}`);
  } catch (err) {
    console.error('[worker] health server failed to start', err);
  }
}
