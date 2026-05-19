/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

export {
  checkCompliance,
  isOFACSanctioned,
  validateTransactionAmount,
  DEFAULT_COMPLIANCE_CONFIG,
} from './checker.js';
export { isSanctioned, SANCTIONED_ADDRESSES } from './sanctions.js';
export type {
  ComplianceCheck,
  ComplianceFlag,
  ComplianceConfig,
  ComplianceDeps,
} from './types.js';
