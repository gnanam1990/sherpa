/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

/**
 * Sherpa MCP server entrypoint (stdio). Config is read via `@sherpa/config`
 * (`loadMcpConfig`) so `process.env` is only touched in that one allowed place;
 * everything below is env-free and dependency-injected.
 */

import { loadMcpConfig } from '@sherpa/config';
import { createSherpaClient } from '@sherpa/sdk';
import { startStdio } from './server.js';

async function main(): Promise<void> {
  const cfg = loadMcpConfig();
  const client = createSherpaClient({ baseUrl: cfg.sherpaApiBaseUrl, apiKey: cfg.sherpaApiKey });
  await startStdio({ client });
  // The stdio transport keeps the process alive until the client disconnects.
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[sherpa-mcp] fatal:', err);
  process.exit(1);
});
