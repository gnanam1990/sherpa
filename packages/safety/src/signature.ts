/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import { type Address, encodePacked, keccak256 } from 'viem';

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

export function getUserOpHash(
  userOp: UserOp,
  entryPoint: Address,
  chainId: number,
): `0x${string}` {
  const packed = encodePacked(
    ['address', 'uint256', 'bytes32', 'bytes32', 'uint256', 'uint256', 'uint256', 'uint256', 'uint256', 'bytes32'],
    [
      userOp.sender,
      userOp.nonce,
      keccak256(userOp.initCode),
      keccak256(userOp.callData),
      userOp.callGasLimit,
      userOp.verificationGasLimit,
      userOp.preVerificationGas,
      userOp.maxFeePerGas,
      userOp.maxPriorityFeePerGas,
      keccak256(userOp.paymasterAndData),
    ],
  );
  const userOpHash = keccak256(packed);
  return keccak256(
    encodePacked(['bytes32', 'address', 'uint256'], [userOpHash, entryPoint, BigInt(chainId)]),
  );
}

export function isValidSignatureFormat(signature: `0x${string}`): boolean {
  if (!signature || signature === '0x') return false;
  const hexPart = signature.slice(2);
  return hexPart.length === 130 || hexPart.length === 132;
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

  const allZeros = '0x' + '00'.repeat(65);
  if (userOp.signature === allZeros) {
    return { ok: false, reason: 'UserOp signature is all zeros.' };
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
