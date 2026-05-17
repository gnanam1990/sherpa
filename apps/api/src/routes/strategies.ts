import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { InMemoryStrategyStore } from '@sherpa/memory';
import { getStrategy as getCatalogStrategy, listStrategies as listCatalogStrategies } from '@sherpa/tools';
import { z } from 'zod';

const strategyStore = new InMemoryStrategyStore();
const catalogFollowers = new Map<string, Set<string>>();
const AddressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/);

const CreateStrategyBody = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  creatorAddress: AddressSchema,
  chainId: z.number(),
  intents: z.array(z.object({ type: z.string(), template: z.string() })),
  parameters: z.record(z.unknown()).optional(),
  visibility: z.enum(['public', 'private', 'unlisted']).default('public'),
  tags: z.array(z.string()).default([]),
});

const StrategyIdParams = z.object({ id: z.string().min(1).max(120) });
const FollowBody = z.object({ userAddress: AddressSchema });
const RunBody = z.object({
  userAddress: AddressSchema,
  parameters: z.record(z.string()).default({}),
});
const ListQuery = z.object({
  visibility: z.enum(['public', 'private', 'unlisted', 'all']).optional(),
});

async function findStrategy(id: string) {
  const local = await strategyStore.get(id);
  if (local) return local;

  const catalog = await getCatalogStrategy(id);
  if (!catalog) return null;

  const extraFollowers = catalogFollowers.get(id)?.size ?? 0;
  return { ...catalog, followers: catalog.followers + extraFollowers, source: 'catalog' };
}

export async function strategyRoutes(app: FastifyInstance): Promise<void> {
  app.post('/api/strategies', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = CreateStrategyBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.message });
    }

    const strategy = await strategyStore.create({
      ...parsed.data,
      creatorAddress: parsed.data.creatorAddress.toLowerCase(),
      creator: parsed.data.creatorAddress.toLowerCase(),
      version: 1,
      followers: 0,
      totalVolume: '0',
      successRate: 0,
      executionEnabled: false,
    });

    return reply.code(201).send({ strategy });
  });

  app.get('/api/strategies', async (req: FastifyRequest, reply: FastifyReply) => {
    const query = ListQuery.safeParse(req.query);
    if (!query.success) {
      return reply.status(400).send({ error: query.error.message });
    }

    const visibility = query.data.visibility;
    const localVisibility = visibility === 'all' ? undefined : visibility ?? 'public';
    const [localStrategies, catalogStrategies] = await Promise.all([
      strategyStore.list(localVisibility),
      listCatalogStrategies(),
    ]);
    const filteredCatalog = catalogStrategies.filter(
      strategy => visibility === 'all' || !visibility || strategy.visibility === visibility,
    ).map(strategy => ({
      ...strategy,
      followers: strategy.followers + (catalogFollowers.get(strategy.id)?.size ?? 0),
      source: 'catalog',
    }));

    return reply.send({ strategies: [...filteredCatalog, ...localStrategies] });
  });

  app.get('/api/strategies/:id', async (req: FastifyRequest, reply: FastifyReply) => {
    const params = StrategyIdParams.safeParse(req.params);
    if (!params.success) {
      return reply.status(400).send({ error: params.error.message });
    }

    const strategy = await findStrategy(params.data.id);
    if (!strategy) {
      return reply.status(404).send({ error: 'strategy_not_found' });
    }

    return reply.send({ strategy });
  });

  app.post('/api/strategies/:id/follow', async (req: FastifyRequest, reply: FastifyReply) => {
    const params = StrategyIdParams.safeParse(req.params);
    const body = FollowBody.safeParse(req.body);
    if (!params.success) {
      return reply.status(400).send({ error: params.error.message });
    }
    if (!body.success) {
      return reply.status(400).send({ error: body.error.message });
    }

    const strategy = await findStrategy(params.data.id);
    if (!strategy) {
      return reply.status(404).send({ error: 'strategy_not_found' });
    }

    const userAddress = body.data.userAddress.toLowerCase();
    const localStrategy = await strategyStore.get(params.data.id);
    if (localStrategy) {
      await strategyStore.follow(params.data.id, userAddress);
      const updated = await strategyStore.get(params.data.id);
      return reply.send({ following: true, strategy: updated });
    }

    const followers = catalogFollowers.get(params.data.id) ?? new Set<string>();
    followers.add(userAddress);
    catalogFollowers.set(params.data.id, followers);
    const updated = await findStrategy(params.data.id);
    return reply.send({
      following: true,
      strategy: updated,
    });
  });

  app.post('/api/strategies/:id/run', async (req: FastifyRequest, reply: FastifyReply) => {
    const params = StrategyIdParams.safeParse(req.params);
    const body = RunBody.safeParse(req.body);
    if (!params.success) {
      return reply.status(400).send({ error: params.error.message });
    }
    if (!body.success) {
      return reply.status(400).send({ error: body.error.message });
    }

    const strategy = await findStrategy(params.data.id);
    if (!strategy) {
      return reply.status(404).send({ error: 'strategy_not_found' });
    }

    return reply.status(409).send({
      error: 'execution_disabled',
      details: 'Strategy execution is disabled until the executor produces real transaction plans. Use dedicated DCA, auto-repay, or Stage 2 endpoints for live actions.',
      strategyId: params.data.id,
    });
  });
}
