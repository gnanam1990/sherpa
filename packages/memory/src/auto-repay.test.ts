import { describe, test, expect } from 'vitest';
import {
  InMemoryAutoRepayStore,
  type AutoRepayRuleRow,
  type CreateAutoRepayRuleInput,
} from './auto-repay.js';

function makeInput(overrides: Partial<CreateAutoRepayRuleInput> = {}): CreateAutoRepayRuleInput {
  return {
    userAddress: '0x1234567890123456789012345678901234567890',
    triggerHf: 13000,
    targetHf: 15000,
    maxRepayPerExecution: '1000000000',
    ...overrides,
  };
}

describe('InMemoryAutoRepayStore', () => {
  describe('createRule', () => {
    test('creates rule with defaults', async () => {
      const store = new InMemoryAutoRepayStore();
      const rule = await store.createRule(makeInput());
      expect(rule.id).toBeDefined();
      expect(rule.status).toBe('active');
      expect(rule.consecutive_failures).toBe(0);
      expect(rule.total_repayments).toBe(0);
      expect(rule.max_per_day).toBe(5);
    });

    test('normalizes address to lowercase', async () => {
      const store = new InMemoryAutoRepayStore();
      const rule = await store.createRule(makeInput({ userAddress: '0xABCDEF' }));
      expect(rule.user_address).toBe('0xabcdef');
    });

    test('stores custom values', async () => {
      const store = new InMemoryAutoRepayStore();
      const rule = await store.createRule(makeInput({
        triggerHf: 12000,
        targetHf: 14000,
        maxRepayPerExecution: '500',
        repaySource: ['dai'],
        maxPerDay: 3,
      }));
      expect(rule.trigger_hf).toBe(12000);
      expect(rule.target_hf).toBe(14000);
      expect(rule.max_repay_per_execution).toBe('500');
      expect(rule.repay_source).toEqual(['dai']);
      expect(rule.max_per_day).toBe(3);
    });
  });

  describe('getRulesByUser', () => {
    test('returns rules for user', async () => {
      const store = new InMemoryAutoRepayStore();
      await store.createRule(makeInput({ userAddress: '0xaaa' }));
      await store.createRule(makeInput({ userAddress: '0xbbb' }));
      const rules = await store.getRulesByUser('0xaaa');
      expect(rules).toHaveLength(1);
    });

    test('case insensitive', async () => {
      const store = new InMemoryAutoRepayStore();
      await store.createRule(makeInput({ userAddress: '0xAAA' }));
      const rules = await store.getRulesByUser('0xaaa');
      expect(rules).toHaveLength(1);
    });

    test('returns empty for unknown user', async () => {
      const store = new InMemoryAutoRepayStore();
      const rules = await store.getRulesByUser('0xunknown');
      expect(rules).toHaveLength(0);
    });
  });

  describe('getActiveRules', () => {
    test('returns only active rules', async () => {
      const store = new InMemoryAutoRepayStore();
      await store.createRule(makeInput());
      const r2 = await store.createRule(makeInput());
      await store.updateRule(r2.id, { status: 'paused' });
      const active = await store.getActiveRules();
      expect(active).toHaveLength(1);
    });

    test('returns empty when none active', async () => {
      const store = new InMemoryAutoRepayStore();
      const active = await store.getActiveRules();
      expect(active).toHaveLength(0);
    });
  });

  describe('getRuleById', () => {
    test('returns rule by id', async () => {
      const store = new InMemoryAutoRepayStore();
      const rule = await store.createRule(makeInput());
      const found = await store.getRuleById(rule.id);
      expect(found!.id).toBe(rule.id);
    });

    test('returns null for unknown id', async () => {
      const store = new InMemoryAutoRepayStore();
      const found = await store.getRuleById('nonexistent');
      expect(found).toBeNull();
    });
  });

  describe('updateRule', () => {
    test('updates fields', async () => {
      const store = new InMemoryAutoRepayStore();
      const rule = await store.createRule(makeInput());
      const updated = await store.updateRule(rule.id, {
        triggerHf: 12500,
        status: 'paused',
      });
      expect(updated!.trigger_hf).toBe(12500);
      expect(updated!.status).toBe('paused');
    });

    test('returns null for unknown id', async () => {
      const store = new InMemoryAutoRepayStore();
      const updated = await store.updateRule('nope', { triggerHf: 1000 });
      expect(updated).toBeNull();
    });
  });

  describe('deleteRule', () => {
    test('deletes existing rule', async () => {
      const store = new InMemoryAutoRepayStore();
      const rule = await store.createRule(makeInput());
      const deleted = await store.deleteRule(rule.id);
      expect(deleted).toBe(true);
      expect(await store.getRuleById(rule.id)).toBeNull();
    });

    test('returns false for unknown id', async () => {
      const store = new InMemoryAutoRepayStore();
      expect(await store.deleteRule('nope')).toBe(false);
    });
  });

  describe('markEvaluated', () => {
    test('sets last_evaluated_at', async () => {
      const store = new InMemoryAutoRepayStore();
      const rule = await store.createRule(makeInput());
      expect(rule.last_evaluated_at).toBeNull();
      await store.markEvaluated(rule.id);
      const updated = await store.getRuleById(rule.id);
      expect(updated!.last_evaluated_at).not.toBeNull();
    });
  });

  describe('markTriggered', () => {
    test('sets last_triggered_at and increments total', async () => {
      const store = new InMemoryAutoRepayStore();
      const rule = await store.createRule(makeInput());
      await store.markTriggered(rule.id);
      const updated = await store.getRuleById(rule.id);
      expect(updated!.last_triggered_at).not.toBeNull();
      expect(updated!.total_repayments).toBe(1);
    });
  });

  describe('incrementFailures', () => {
    test('increments consecutive_failures', async () => {
      const store = new InMemoryAutoRepayStore();
      const rule = await store.createRule(makeInput());
      await store.incrementFailures(rule.id);
      await store.incrementFailures(rule.id);
      const updated = await store.getRuleById(rule.id);
      expect(updated!.consecutive_failures).toBe(2);
    });

    test('pauses after 3 failures', async () => {
      const store = new InMemoryAutoRepayStore();
      const rule = await store.createRule(makeInput());
      await store.incrementFailures(rule.id);
      await store.incrementFailures(rule.id);
      await store.incrementFailures(rule.id);
      const updated = await store.getRuleById(rule.id);
      expect(updated!.status).toBe('paused');
    });
  });

  describe('resetFailures', () => {
    test('resets to 0', async () => {
      const store = new InMemoryAutoRepayStore();
      const rule = await store.createRule(makeInput());
      await store.incrementFailures(rule.id);
      await store.resetFailures(rule.id);
      const updated = await store.getRuleById(rule.id);
      expect(updated!.consecutive_failures).toBe(0);
    });
  });

  describe('logExecution', () => {
    test('logs execution record', async () => {
      const store = new InMemoryAutoRepayStore();
      const rule = await store.createRule(makeInput());
      const exec = await store.logExecution({
        ruleId: rule.id,
        status: 'success',
        hfBefore: 1.2,
        hfAfter: 1.5,
        amountRepaid: '1000',
        txHash: '0xabc',
      });
      expect(exec.id).toBeDefined();
      expect(exec.rule_id).toBe(rule.id);
      expect(exec.status).toBe('success');
      expect(exec.hf_before).toBe(1.2);
      expect(exec.hf_after).toBe(1.5);
    });
  });

  describe('getExecutionsToday', () => {
    test('counts today executions', async () => {
      const store = new InMemoryAutoRepayStore();
      const rule = await store.createRule(makeInput());
      await store.logExecution({ ruleId: rule.id, status: 'success' });
      await store.logExecution({ ruleId: rule.id, status: 'success' });
      const count = await store.getExecutionsToday(rule.id);
      expect(count).toBe(2);
    });

    test('returns 0 when none today', async () => {
      const store = new InMemoryAutoRepayStore();
      const rule = await store.createRule(makeInput());
      const count = await store.getExecutionsToday(rule.id);
      expect(count).toBe(0);
    });
  });

  describe('getExecutionHistory', () => {
    test('returns executions sorted by date desc', async () => {
      const store = new InMemoryAutoRepayStore();
      const rule = await store.createRule(makeInput());
      const e1 = await store.logExecution({ ruleId: rule.id, status: 'failed' });
      const e2 = await store.logExecution({ ruleId: rule.id, status: 'success' });
      const history = await store.getExecutionHistory(rule.id);
      expect(history).toHaveLength(2);
      expect(history.map((e) => e.id)).toContain(e1.id);
      expect(history.map((e) => e.id)).toContain(e2.id);
    });

    test('respects limit', async () => {
      const store = new InMemoryAutoRepayStore();
      const rule = await store.createRule(makeInput());
      for (let i = 0; i < 5; i++) {
        await store.logExecution({ ruleId: rule.id, status: 'success' });
      }
      const history = await store.getExecutionHistory(rule.id, 2);
      expect(history).toHaveLength(2);
    });

    test('returns empty for unknown rule', async () => {
      const store = new InMemoryAutoRepayStore();
      const history = await store.getExecutionHistory('nope');
      expect(history).toHaveLength(0);
    });
  });
});
