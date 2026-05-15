import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import { randomUUID } from 'node:crypto';

if (typeof globalThis.crypto === 'undefined') {
  (globalThis as any).crypto = { randomUUID };
} else if (typeof globalThis.crypto.randomUUID !== 'function') {
  (globalThis.crypto as any).randomUUID = randomUUID;
}

afterEach(() => cleanup());
