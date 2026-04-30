import { buildServer } from './server.js';
import { createLogger } from '@sherpa/logger';

const log = createLogger({ svc: 'api' });

const port = Number(process.env.PORT ?? 3001);
const host = process.env.HOST ?? '0.0.0.0';

buildServer()
  .listen({ port, host })
  .then((address) => {
    log.info('api listening', { address });
  })
  .catch((err) => {
    log.error('api failed to start', { err: String(err) });
    process.exit(1);
  });
