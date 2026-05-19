/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

export { createSessionKey, validateSessionKeyConfig } from './factory.js';
export { buildSessionKeyCall, validateExecution } from './executor.js';
export { validateTransaction, validatePermissionScope } from './permission-validator.js';
export type { PermissionGrant, ValidationResult } from './permission-validator.js';
export { checkUsageLimits, buildUsageSnapshot } from './usage-tracker.js';
export type { UsageLimits, UsageSnapshot, UsageCheckResult } from './usage-tracker.js';
export type {
  SessionKeyConfig,
  SessionKeyPermission,
  SessionKeyDeployment,
  SessionKeyDeps,
} from './types.js';
