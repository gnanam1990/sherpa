/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import type { SherpaConfig } from '@sherpa/config';

export function createRequireStage2(config: SherpaConfig) {
  return async function requireStage2(_req: FastifyRequest, reply: FastifyReply): Promise<void> {
    if (!config.stage2Enabled) {
      reply.code(503).send({
        error: 'feature_not_available',
        details: 'Stage 2 features are disabled in this environment.',
      });
    }
  };
}
