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
