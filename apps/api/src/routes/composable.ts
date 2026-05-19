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
import { calculateFlashLoanFee, calculateLeverage, estimateLeverageRisk } from '@sherpa/tools';
import { z } from 'zod';

const FlashLoanBody = z.object({
  asset: z.string().min(1).max(20).transform(value => value.toUpperCase()),
  amount: z.string().regex(/^\d+$/),
  chainId: z.number(),
  purpose: z.string().max(240).optional(),
});

const LeverageBody = z.object({
  asset: z.string().min(1).max(20).transform(value => value.toUpperCase()),
  leverageRatio: z.number().min(1).max(5),
  collateralAsset: z.string().min(1).max(20).transform(value => value.toUpperCase()),
  collateralAmount: z.string().regex(/^\d+$/).optional(),
  chainId: z.number(),
});

export async function composableRoutes(app: FastifyInstance): Promise<void> {
  app.post('/api/composable/flash-loan', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = FlashLoanBody.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.message });

    const amountBaseUnits = BigInt(parsed.data.amount);
    const feeBaseUnits = calculateFlashLoanFee(amountBaseUnits);
    return reply.status(409).send({
      error: 'execution_disabled',
      details: 'Flash loan execution requires an audited receiver contract. Sherpa returns a preview only and emits no transaction.',
      preview: {
        asset: parsed.data.asset,
        amountBaseUnits: amountBaseUnits.toString(),
        feeBps: 9,
        estimatedFeeBaseUnits: feeBaseUnits.toString(),
        chainId: parsed.data.chainId,
        purpose: parsed.data.purpose ?? null,
        requiredContract: 'audited_flash_loan_receiver',
      },
    });
  });

  app.post('/api/composable/leverage', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = LeverageBody.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.message });

    const collateralAmount = parsed.data.collateralAmount ? BigInt(parsed.data.collateralAmount) : 0n;
    const leverage = calculateLeverage(collateralAmount, parsed.data.leverageRatio);
    return reply.status(409).send({
      error: 'execution_disabled',
      details: 'Leverage execution is disabled until the looped borrow/supply path is audited. Sherpa returns a risk preview only.',
      preview: {
        asset: parsed.data.asset,
        collateralAsset: parsed.data.collateralAsset,
        collateralAmountBaseUnits: collateralAmount.toString(),
        leverageRatio: parsed.data.leverageRatio,
        borrowAmountBaseUnits: leverage.borrowAmount.toString(),
        newCollateralBaseUnits: leverage.newCollateral.toString(),
        riskLevel: estimateLeverageRisk(parsed.data.leverageRatio),
        chainId: parsed.data.chainId,
      },
    });
  });

  app.get('/api/composable/strategies', async (req: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      strategies: [
        { id: 'leveraged-lend', name: 'Leveraged Lending', description: 'Borrow and lend to maximize yield', risk: 'medium' },
        { id: 'flash-arb', name: 'Flash Loan Arbitrage', description: 'Arbitrage with flash loans', risk: 'high' },
        { id: 'debt-refinance', name: 'Debt Refinancing', description: 'Move debt to lower-rate protocol', risk: 'low' },
      ],
    });
  });
}
