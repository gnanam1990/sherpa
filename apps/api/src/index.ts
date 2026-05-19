/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import { buildServer } from './server.js';
import { createLogger } from '@sherpa/logger';
import { loadConfig } from '@sherpa/config';
import { ensureSurfaceSchema } from './startup-db.js';

const log = createLogger({ svc: 'api' });

const port = Number(process.env.PORT ?? 3001);
const host = process.env.HOST ?? '0.0.0.0';
const config = loadConfig();

ensureSurfaceSchema(config, log)
  .catch((err) => {
    log.error('surface schema ensure failed', { err });
  })
  .then(() => buildServer({ config }).listen({ port, host }))
  .then((address) => {
    log.info('api listening', { address });
  })
  .catch((err) => {
    log.error('api failed to start', { err: String(err) });
    process.exit(1);
  });
