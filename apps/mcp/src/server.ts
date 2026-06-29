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
 * Sherpa MCP server (Mode B) — exposes `@sherpa/sdk` over MCP.
 *
 * The transport-agnostic dispatch core (`buildToolList` / `dispatchToolCall`) is
 * unit-tested; `createSherpaMcpServer` / `startStdio` wire it to
 * `@modelcontextprotocol/sdk`.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { SherpaClient } from '@sherpa/sdk';
import { McpSession, AuthError, type SignatureVerifier } from './auth.js';
import { SHERPA_TOOLS, type ToolContext } from './tools.js';

export type SherpaMcpDeps = {
  client: SherpaClient;
  /** Override the signature verifier (tests inject a fake). */
  verifier?: SignatureVerifier;
  name?: string;
  version?: string;
};

/** MCP `tools/list` payload — tool metadata with JSON-Schema inputs. */
export function buildToolList(): {
  tools: Array<{ name: string; description: string; inputSchema: unknown; annotations: { readOnlyHint: boolean } }>;
} {
  return {
    tools: SHERPA_TOOLS.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: zodToJsonSchema(t.inputSchema, { target: 'jsonSchema7' }),
      annotations: { readOnlyHint: t.readOnly },
    })),
  };
}

/** MCP `tools/call` content payload. */
export type ToolCallResult = {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
};

/**
 * Validate + run a tool. Never throws: errors become an `isError` text result so
 * the MCP client sees a structured failure (and a guard failure is never an
 * execution).
 */
export async function dispatchToolCall(
  name: string,
  args: unknown,
  ctx: ToolContext,
): Promise<ToolCallResult> {
  const tool = SHERPA_TOOLS.find((t) => t.name === name);
  if (!tool) {
    return { content: [{ type: 'text', text: JSON.stringify({ error: `unknown tool: ${name}` }) }], isError: true };
  }
  try {
    const parsed = tool.inputSchema.parse(args ?? {});
    const result = await tool.handler(parsed, ctx);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  } catch (err) {
    const code = err instanceof AuthError ? err.code : 'TOOL_ERROR';
    const message = err instanceof Error ? err.message : String(err);
    return { content: [{ type: 'text', text: JSON.stringify({ error: message, code }) }], isError: true };
  }
}

/** Build an MCP `Server` bound to a single session. Caller connects a transport. */
export function createSherpaMcpServer(deps: SherpaMcpDeps): { server: Server; session: McpSession } {
  const session = new McpSession(deps.verifier);
  const ctx: ToolContext = { client: deps.client, session };

  const server = new Server(
    { name: deps.name ?? 'sherpa-mcp', version: deps.version ?? '0.0.0' },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => buildToolList());
  server.setRequestHandler(CallToolRequestSchema, async (request) =>
    dispatchToolCall(request.params.name, request.params.arguments, ctx),
  );

  return { server, session };
}

/** Start the server over stdio (for Claude Desktop / Code / Cursor). */
export async function startStdio(deps: SherpaMcpDeps): Promise<void> {
  const { server } = createSherpaMcpServer(deps);
  await server.connect(new StdioServerTransport());
}
