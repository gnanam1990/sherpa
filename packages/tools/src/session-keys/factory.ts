import type { SessionKeyConfig, SessionKeyDeployment } from './types.js';

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const TX_HASH_RE = /^0x[a-fA-F0-9]{64}$/;
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export type CreateSessionKeyOptions = {
  sessionKeyAddress: `0x${string}`;
  deploymentTx?: `0x${string}`;
  now?: number;
};

export async function createSessionKey(
  config: SessionKeyConfig,
  options: CreateSessionKeyOptions,
): Promise<SessionKeyDeployment> {
  const errors = validateSessionKeyConfig(config);
  if (errors.length > 0) {
    throw new Error(`Invalid session key config: ${errors.join('; ')}`);
  }

  if (!ADDRESS_RE.test(options.sessionKeyAddress)) {
    throw new Error('Session key address must be a valid EVM address');
  }
  if (options.sessionKeyAddress.toLowerCase() === ZERO_ADDRESS) {
    throw new Error('Session key address cannot be the zero address');
  }
  if (options.deploymentTx !== undefined && !TX_HASH_RE.test(options.deploymentTx)) {
    throw new Error('Deployment transaction must be a valid transaction hash');
  }

  const validFrom = options.now ?? Math.floor(Date.now() / 1000);
  return {
    sessionKeyAddress: options.sessionKeyAddress,
    deploymentTx: options.deploymentTx ?? '0x0000000000000000000000000000000000000000000000000000000000000000',
    validFrom,
    validUntil: validFrom + config.validDuration,
  };
}

export function validateSessionKeyConfig(config: SessionKeyConfig): string[] {
  const errors: string[] = [];

  if (config.spendLimit <= 0n) {
    errors.push('Spend limit must be positive');
  }
  if (config.validDuration < 60) {
    errors.push('Minimum session duration is 60 seconds');
  }
  if (config.validDuration > 30 * 24 * 60 * 60) {
    errors.push('Maximum session duration is 30 days');
  }
  if (config.permissions.length === 0) {
    errors.push('At least one permission required');
  }

  return errors;
}
