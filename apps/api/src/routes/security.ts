import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

type MultisigRecord = {
  id: string;
  safeAddress: string | null;
  threshold: number;
  signers: string[];
  chainId: number;
  deploymentStatus: 'external_safe' | 'configuration_only';
  createdAt: number;
};

const multisigs = new Map<string, MultisigRecord>();
const whitelists = new Map<string, Set<string>>();
const AddressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/);

const CreateMultisigBody = z.object({
  threshold: z.number().min(1).max(10),
  signers: z.array(AddressSchema).min(1).max(10),
  chainId: z.number(),
  safeAddress: AddressSchema.optional(),
}).refine((input) => input.threshold <= input.signers.length, {
  message: 'threshold cannot exceed signer count',
  path: ['threshold'],
});

const WhitelistBody = z.object({
  userAddress: AddressSchema,
  targetAddress: AddressSchema,
});

const AddressParams = z.object({ address: AddressSchema });
const UserAddressParams = z.object({ userAddress: AddressSchema });

export async function securityRoutes(app: FastifyInstance): Promise<void> {
  app.post('/api/security/multisig', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = CreateMultisigBody.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.message });

    const record: MultisigRecord = {
      id: crypto.randomUUID(),
      safeAddress: parsed.data.safeAddress?.toLowerCase() ?? null,
      threshold: parsed.data.threshold,
      signers: parsed.data.signers.map(signer => signer.toLowerCase()),
      chainId: parsed.data.chainId,
      deploymentStatus: parsed.data.safeAddress ? 'external_safe' : 'configuration_only',
      createdAt: Date.now(),
    };

    multisigs.set(record.id, record);
    if (record.safeAddress) multisigs.set(record.safeAddress, record);

    return reply.code(201).send({
      multisig: record,
      warning: record.safeAddress
        ? 'External Safe registered. Sherpa did not deploy a new multisig.'
        : 'Configuration saved only. Deploy or register a Safe before using this for ownership.',
    });
  });

  app.get('/api/security/multisig/:address', async (req: FastifyRequest, reply: FastifyReply) => {
    const params = AddressParams.safeParse(req.params);
    if (!params.success) return reply.status(400).send({ error: params.error.message });

    const address = params.data.address.toLowerCase();
    const record = multisigs.get(address);
    return reply.send({
      address,
      configured: Boolean(record),
      threshold: record?.threshold ?? null,
      signers: record?.signers ?? [],
      chainId: record?.chainId ?? null,
      transactions: [],
    });
  });

  app.post('/api/security/whitelist', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = WhitelistBody.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.message });

    const userAddress = parsed.data.userAddress.toLowerCase();
    const targetAddress = parsed.data.targetAddress.toLowerCase();
    const addresses = whitelists.get(userAddress) ?? new Set<string>();
    addresses.add(targetAddress);
    whitelists.set(userAddress, addresses);

    return reply.send({ success: true, userAddress, targetAddress });
  });

  app.get('/api/security/whitelist/:userAddress', async (req: FastifyRequest, reply: FastifyReply) => {
    const params = UserAddressParams.safeParse(req.params);
    if (!params.success) return reply.status(400).send({ error: params.error.message });

    const userAddress = params.data.userAddress.toLowerCase();
    return reply.send({ addresses: Array.from(whitelists.get(userAddress) ?? []) });
  });

  app.get('/api/security/status/:userAddress', async (req: FastifyRequest, reply: FastifyReply) => {
    const params = UserAddressParams.safeParse(req.params);
    if (!params.success) return reply.status(400).send({ error: params.error.message });

    const userAddress = params.data.userAddress.toLowerCase();
    const whitelistedAddresses = whitelists.get(userAddress)?.size ?? 0;
    const multisigEnabled = Array.from(multisigs.values())
      .some(multisig => multisig.signers.includes(userAddress));

    return reply.send({
      multisigEnabled,
      hardwareWalletConnected: false,
      whitelistedAddresses,
      dailySpendLimit: '10000',
      dailySpent: '0',
    });
  });
}
