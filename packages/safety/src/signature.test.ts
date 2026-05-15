import { describe, test, expect } from 'vitest';
import { verifyUserOpSignature, validateUserOpFields } from './signature.js';

describe('verifyUserOpSignature', () => {
  test('rejects mismatched sender', () => {
    const result = verifyUserOpSignature(
      { sender: '0x1111', signature: '0x1234' } as any,
      '0x2222' as any,
    );
    expect(result.ok).toBe(false);
  });

  test('rejects empty signature', () => {
    const result = verifyUserOpSignature(
      { sender: '0x1111', signature: '0x' } as any,
      '0x1111' as any,
    );
    expect(result.ok).toBe(false);
  });

  test('accepts valid signature', () => {
    const result = verifyUserOpSignature(
      { sender: '0x1111', signature: ('0x' + 'ab'.repeat(65)) as `0x${string}` } as any,
      '0x1111' as any,
    );
    expect(result.ok).toBe(true);
  });
});

describe('validateUserOpFields', () => {
  test('rejects missing sender', () => {
    expect(validateUserOpFields({ sender: '0x', callData: '0x1234', maxFeePerGas: 1n } as any).ok).toBe(false);
  });

  test('rejects empty callData', () => {
    expect(validateUserOpFields({ sender: '0x1111', callData: '0x', maxFeePerGas: 1n } as any).ok).toBe(false);
  });

  test('rejects zero maxFeePerGas', () => {
    expect(validateUserOpFields({ sender: '0x1111', callData: '0x1234', maxFeePerGas: 0n } as any).ok).toBe(false);
  });

  test('accepts valid UserOp', () => {
    expect(validateUserOpFields({ sender: '0x1111', callData: '0x1234', maxFeePerGas: 1000000000n } as any).ok).toBe(true);
  });
});
