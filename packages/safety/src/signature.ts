import { hashMessage, type Address } from 'viem';

export type UserOp = {
  sender: Address;
  nonce: bigint;
  initCode: `0x${string}`;
  callData: `0x${string}`;
  callGasLimit: bigint;
  verificationGasLimit: bigint;
  preVerificationGas: bigint;
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
  paymasterAndData: `0x${string}`;
  signature: `0x${string}`;
};

export type SignatureVerificationResult = {
  ok: boolean;
  reason?: string;
};

const USEROP_HASH_PREFIX = '0x194f64e2732d5c28794459646857855000000000000000000000000000000000';

export function getUserOpHash(userOp: UserOp, entryPoint: Address, chainId: number): `0x${string}` {
  const packed = [
    userOp.sender,
    userOp.nonce.toString(),
    userOp.initCode,
    userOp.callData,
    userOp.callGasLimit.toString(),
    userOp.verificationGasLimit.toString(),
    userOp.preVerificationGas.toString(),
    userOp.maxFeePerGas.toString(),
    userOp.maxPriorityFeePerGas.toString(),
    userOp.paymasterAndData,
  ].join('');

  return hashMessage(packed) as `0x${string}`;
}

export function verifyUserOpSignature(
  userOp: UserOp,
  expectedSender: Address,
): SignatureVerificationResult {
  if (userOp.sender.toLowerCase() !== expectedSender.toLowerCase()) {
    return { ok: false, reason: 'UserOp sender does not match expected address.' };
  }

  if (!userOp.signature || userOp.signature === '0x' || userOp.signature.length < 130) {
    return { ok: false, reason: 'UserOp signature is missing or too short.' };
  }

  return { ok: true };
}

export function validateUserOpFields(userOp: UserOp): SignatureVerificationResult {
  if (!userOp.sender || userOp.sender === '0x') {
    return { ok: false, reason: 'UserOp sender is missing.' };
  }
  if (userOp.callData === '0x' || !userOp.callData) {
    return { ok: false, reason: 'UserOp callData is empty.' };
  }
  if (userOp.maxFeePerGas <= 0n) {
    return { ok: false, reason: 'UserOp maxFeePerGas must be positive.' };
  }
  return { ok: true };
}
