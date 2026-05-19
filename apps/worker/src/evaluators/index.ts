/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

export { checkCondition } from './check-condition.js';
export { evaluatePrice, fetchPythPrice } from './price.js';
export { evaluateHealthFactor, fetchAaveHealthFactor } from './health-factor.js';
export { evaluateAddressActivity, fetchRecentTxCount } from './address-activity.js';
export { evaluateGas, fetchGasPrice } from './gas.js';
export { evaluateApy, fetchAaveApy } from './apy.js';
export { evaluateContractEvent, fetchEventCount } from './contract-event.js';
export type { EvaluateResult, EvaluatorFn, AlertRow } from '../types.js';

import type { AlertRow, EvaluateResult, EvaluatorFn } from '../types.js';
import { evaluatePrice } from './price.js';
import { evaluateHealthFactor } from './health-factor.js';
import { evaluateAddressActivity } from './address-activity.js';
import { evaluateGas } from './gas.js';
import { evaluateApy } from './apy.js';
import { evaluateContractEvent } from './contract-event.js';

const evaluatorMap: Record<string, EvaluatorFn> = {
  price: evaluatePrice,
  'health-factor': evaluateHealthFactor,
  balance: evaluateAddressActivity,
  gas: evaluateGas,
  apy: evaluateApy,
  'contract-event': evaluateContractEvent,
};

export async function evaluateAlert(alert: AlertRow): Promise<EvaluateResult> {
  const evaluator = evaluatorMap[alert.condition_type] ?? evaluatePrice;
  return evaluator(alert);
}
