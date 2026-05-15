import type { SessionKeyConfig, SessionKeyDeployment } from './types.js';

export async function createSessionKey(
  config: SessionKeyConfig,
): Promise<SessionKeyDeployment> {
  const sessionKeyAddress = '0x' + '00'.repeat(20) as `0x${string}`;

  return {
    sessionKeyAddress,
    deploymentTx: '0x' as `0x${string}`,
    validFrom: Math.floor(Date.now() / 1000),
    validUntil: Math.floor(Date.now() / 1000) + config.validDuration,
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
