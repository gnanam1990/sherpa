// Builder code for Coinbase Smart Wallet attribution.
// Pass getBuilderDataSuffix() as `dataSuffix` on every sendTransaction / writeContract call.

const BUILDER_CODE = process.env['NEXT_PUBLIC_BUILDER_CODE'] ?? 'bc_97ju6eu2';

export function getBuilderDataSuffix(): `0x${string}` {
  const hex = Array.from(new TextEncoder().encode(BUILDER_CODE))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `0x${hex}`;
}

export { BUILDER_CODE };
