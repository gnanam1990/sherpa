/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { BASE_CHAIN_ID, SUPPORTED_PORTFOLIO_CHAIN_IDS, fetchPortfolio } from '@sherpa/tools';
import type { PortfolioPosition, PortfolioSnapshot, PortfolioToken } from '@sherpa/tools';
import type { PortfolioSnapshotStore } from '@sherpa/memory';

const addressPattern = /^0x[0-9a-fA-F]{40}$/;
const supportedChainIdSet = new Set<number>(SUPPORTED_PORTFOLIO_CHAIN_IDS);

const portfolioCache = new Map<string, { data: unknown; expires: number }>();
const CACHE_TTL_MS = 60_000;

function parseChainsQuery(value: unknown): { ok: true; chainIds: number[] } | { ok: false; invalidChains: string[] } {
  if (value === undefined || value === '') return { ok: true, chainIds: [BASE_CHAIN_ID] };

  const raw = Array.isArray(value) ? value.join(',') : String(value);
  const parts = raw.split(',').map((part) => part.trim()).filter(Boolean);
  if (parts.length === 0) return { ok: true, chainIds: [BASE_CHAIN_ID] };

  const parsed = parts.map((part) => (/^\d+$/.test(part) ? Number(part) : NaN));
  const invalidChains = parts.filter((part, index) => !Number.isInteger(parsed[index]) || !supportedChainIdSet.has(parsed[index]!));
  if (invalidChains.length > 0) return { ok: false, invalidChains };

  const requested = new Set(parsed);
  const chainIds = SUPPORTED_PORTFOLIO_CHAIN_IDS.filter((chainId) => requested.has(chainId));
  return { ok: true, chainIds };
}

function serializeToken(token: PortfolioToken) {
  return {
    symbol: token.symbol,
    address: token.address,
    decimals: token.decimals,
    chainId: token.chainId,
    balance: token.balance.toString(),
    valueUsd: token.valueUsd.toString(),
    priceUsd: token.priceUsd,
  };
}

function serializePosition(position: PortfolioPosition) {
  return {
    protocol: position.protocol,
    type: position.type,
    tokens: position.tokens.map(serializeToken),
    valueUsd: position.valueUsd.toString(),
    apy: position.apy,
  };
}

function serializeChain(snapshot: PortfolioSnapshot) {
  return {
    chainId: snapshot.chainId ?? snapshot.tokens[0]?.chainId ?? BASE_CHAIN_ID,
    chainName: snapshot.chainName ?? 'Base',
    tokens: snapshot.tokens.map(serializeToken),
    positions: snapshot.positions.map(serializePosition),
    totalValueUsd: snapshot.totalValueUsd.toString(),
    lastUpdated: new Date(snapshot.timestamp).toISOString(),
  };
}

export async function portfolioRoutes(
  app: FastifyInstance,
  opts?: { rpcUrl?: string; snapshotStore?: PortfolioSnapshotStore },
): Promise<void> {
  const rpcUrl = opts?.rpcUrl;
  const snapshotStore = opts?.snapshotStore;

  app.get('/api/portfolio/:address', async (req: FastifyRequest, reply: FastifyReply) => {
    const { address } = req.params as { address: string };
    const { chains } = req.query as { chains?: string | string[] };
    if (!addressPattern.test(address)) {
      return reply.code(400).send({ error: 'invalid_address' });
    }

    const parsedChains = parseChainsQuery(chains);
    if (!parsedChains.ok) {
      return reply.code(400).send({
        error: 'invalid_chains',
        invalidChains: parsedChains.invalidChains,
        supportedChains: [...SUPPORTED_PORTFOLIO_CHAIN_IDS],
      });
    }

    const cacheKey = `portfolio:${address.toLowerCase()}:chains:${parsedChains.chainIds.join(',')}`;
    const cached = portfolioCache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      return reply.send(cached.data);
    }

    try {
      const fetchDeps = parsedChains.chainIds.length === 1 && parsedChains.chainIds[0] === BASE_CHAIN_ID
        ? { rpcUrl }
        : { rpcUrl, chains: parsedChains.chainIds };
      const snapshot = await fetchPortfolio(address as `0x${string}`, fetchDeps);
      const chainSnapshots = snapshot.chains ?? [snapshot];
      const data = {
        address,
        requestedChains: parsedChains.chainIds,
        chains: chainSnapshots.map(serializeChain),
        errors: snapshot.errors ?? [],
        totalValueUsd: snapshot.totalValueUsd.toString(),
        totalPnlUsd: '0',
        totalPnlPercent: 0,
        lastUpdated: new Date(snapshot.timestamp).toISOString(),
      };
      portfolioCache.set(cacheKey, { data, expires: Date.now() + CACHE_TTL_MS });
      return reply.send(data);
    } catch (err) {
      return reply.code(500).send({
        error: 'portfolio_fetch_failed',
        details: (err as Error).message || 'unknown error',
      });
    }
  });

  app.get('/api/portfolio/:address/pnl', async (req: FastifyRequest, reply: FastifyReply) => {
    const { address } = req.params as { address: string };
    if (!addressPattern.test(address)) {
      return reply.code(400).send({ error: 'invalid_address' });
    }

    // PnL requires historical cost basis data which needs daily snapshots.
    // Return honest empty state until snapshot worker is built.
    return reply.send({
      address,
      realizedPnlUsd: '0',
      unrealizedPnlUsd: '0',
      totalPnlUsd: '0',
      totalPnlPercent: 0,
      bestPerformer: null,
      worstPerformer: null,
      note: 'PnL tracking requires daily portfolio snapshots. Data will populate once the snapshot worker starts recording.',
    });
  });

  app.get('/api/portfolio/:address/history', async (req: FastifyRequest, reply: FastifyReply) => {
    const { address } = req.params as { address: string };
    const { days } = req.query as { days?: string };
    if (!addressPattern.test(address)) {
      return reply.code(400).send({ error: 'invalid_address' });
    }

    if (snapshotStore) {
      try {
        const history = await snapshotStore.getSnapshotHistory(address, Number(days) || 30);
        return reply.send({
          address,
          period: `${days || 30} days`,
          snapshots: history.map((s) => ({
            timestamp: s.snapshot_at,
            valueUsd: s.total_value_usd,
          })),
        });
      } catch {
        // Fall through to empty state
      }
    }

    return reply.send({
      address,
      period: `${days || 30} days`,
      snapshots: [],
      note: 'Portfolio history will populate once daily snapshots start recording. No fabricated data.',
    });
  });
}
