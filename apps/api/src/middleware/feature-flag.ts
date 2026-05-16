import type { FastifyRequest, FastifyReply } from 'fastify';
import type { SherpaConfig } from '@sherpa/config';

export function createRequireStage2(config: SherpaConfig) {
  return async function requireStage2(_req: FastifyRequest, reply: FastifyReply): Promise<void> {
    if (!config.stage2Enabled) {
      reply.code(503).send({
        error: 'feature_not_available',
        details: 'Stage 2 features are pending audit.',
      });
    }
  };
}
