import { describe, test, expect } from 'vitest';
import { createMultisig, getMultisigTransactions, buildSubmitCall } from './multisig.js';

describe('Multi-sig module', () => {
  test('createMultisig returns address', async () => {
    const result = await createMultisig({
      threshold: 2,
      signers: ['0x1111', '0x2222', '0x3333'],
      chainId: 8453,
    });
    expect(result.address).toBeDefined();
  });

  test('getMultisigTransactions returns array', async () => {
    const txs = await getMultisigTransactions('0x1234');
    expect(Array.isArray(txs)).toBe(true);
  });

  test('buildSubmitCall returns valid call', () => {
    const call = buildSubmitCall('0x1234', 1000000000n, '0x');
    expect(call.to).toBe('0x1234');
    expect(call.value).toBe(1000000000n);
  });
});
