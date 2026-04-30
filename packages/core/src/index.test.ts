import { describe, it, expectTypeOf } from 'vitest';
import type { ConfirmationCardProps, ExecutionStep, Intent } from './index.js';

describe('core/types', () => {
  it('ConfirmationCardProps has the documented shape', () => {
    expectTypeOf<ConfirmationCardProps['intent']>().toEqualTypeOf<Intent>();
    expectTypeOf<ConfirmationCardProps['steps']>().toEqualTypeOf<ExecutionStep[]>();
  });
});
