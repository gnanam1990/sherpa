import type pg from 'pg';
import { query } from '@sherpa/config';

export interface AutoRepayRuleRow {
  id: string;
  user_address: string;
  trigger_hf: number;
  target_hf: number;
  max_repay_per_execution: string;
  repay_source: string[];
  status: 'active' | 'paused' | 'disabled';
  consecutive_failures: number;
  total_repayments: number;
  total_repaid_usd: string;
  authorization_tx_hash: string | null;
  created_at: string;
  last_evaluated_at: string | null;
  last_triggered_at: string | null;
  max_per_day: number;
}

export interface AutoRepayExecutionRow {
  id: string;
  rule_id: string;
  executed_at: string;
  status: string;
  hf_before: number | null;
  hf_after: number | null;
  amount_repaid: string | null;
  tx_hash: string | null;
  error_message: string | null;
}

export interface CreateAutoRepayRuleInput {
  userAddress: string;
  triggerHf: number;
  targetHf: number;
  maxRepayPerExecution: string;
  repaySource?: string[];
  authorizationTxHash?: string;
  maxPerDay?: number;
  status?: 'active' | 'paused' | 'disabled';
}

export interface UpdateAutoRepayRuleInput {
  triggerHf?: number;
  targetHf?: number;
  maxRepayPerExecution?: string;
  repaySource?: string[];
  status?: 'active' | 'paused' | 'disabled';
  maxPerDay?: number;
}

export interface LogAutoRepayExecutionInput {
  ruleId: string;
  status: string;
  hfBefore?: number;
  hfAfter?: number;
  amountRepaid?: string;
  txHash?: string;
  errorMessage?: string;
}

const MAX_CONSECUTIVE_FAILURES = 3;
const DEFAULT_MAX_PER_DAY = 5;

export interface AutoRepayStore {
  createRule(input: CreateAutoRepayRuleInput): Promise<AutoRepayRuleRow>;
  getRulesByUser(userAddress: string): Promise<AutoRepayRuleRow[]>;
  getActiveRules(): Promise<AutoRepayRuleRow[]>;
  getRuleById(id: string): Promise<AutoRepayRuleRow | null>;
  updateRule(id: string, updates: UpdateAutoRepayRuleInput): Promise<AutoRepayRuleRow | null>;
  deleteRule(id: string): Promise<boolean>;
  markEvaluated(id: string): Promise<void>;
  markTriggered(id: string): Promise<void>;
  incrementFailures(id: string): Promise<void>;
  resetFailures(id: string): Promise<void>;
  logExecution(input: LogAutoRepayExecutionInput): Promise<AutoRepayExecutionRow>;
  getExecutionsToday(ruleId: string): Promise<number>;
  getExecutionHistory(ruleId: string, limit?: number): Promise<AutoRepayExecutionRow[]>;
}

export class InMemoryAutoRepayStore implements AutoRepayStore {
  private rules = new Map<string, AutoRepayRuleRow>();
  private executions: AutoRepayExecutionRow[] = [];

  async createRule(input: CreateAutoRepayRuleInput): Promise<AutoRepayRuleRow> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const rule: AutoRepayRuleRow = {
      id,
      user_address: input.userAddress.toLowerCase(),
      trigger_hf: input.triggerHf,
      target_hf: input.targetHf,
      max_repay_per_execution: input.maxRepayPerExecution,
      repay_source: input.repaySource ?? ['usdc'],
      status: input.status ?? 'active',
      consecutive_failures: 0,
      total_repayments: 0,
      total_repaid_usd: '0',
      authorization_tx_hash: input.authorizationTxHash ?? null,
      created_at: now,
      last_evaluated_at: null,
      last_triggered_at: null,
      max_per_day: input.maxPerDay ?? DEFAULT_MAX_PER_DAY,
    };
    this.rules.set(id, rule);
    return rule;
  }

  async getRulesByUser(userAddress: string): Promise<AutoRepayRuleRow[]> {
    return [...this.rules.values()].filter(
      (r) => r.user_address === userAddress.toLowerCase(),
    );
  }

  async getActiveRules(): Promise<AutoRepayRuleRow[]> {
    return [...this.rules.values()].filter((r) => r.status === 'active');
  }

  async getRuleById(id: string): Promise<AutoRepayRuleRow | null> {
    return this.rules.get(id) ?? null;
  }

  async updateRule(id: string, updates: UpdateAutoRepayRuleInput): Promise<AutoRepayRuleRow | null> {
    const rule = this.rules.get(id);
    if (!rule) return null;
    if (updates.triggerHf !== undefined) rule.trigger_hf = updates.triggerHf;
    if (updates.targetHf !== undefined) rule.target_hf = updates.targetHf;
    if (updates.maxRepayPerExecution !== undefined) rule.max_repay_per_execution = updates.maxRepayPerExecution;
    if (updates.repaySource !== undefined) rule.repay_source = updates.repaySource;
    if (updates.status !== undefined) rule.status = updates.status;
    if (updates.maxPerDay !== undefined) rule.max_per_day = updates.maxPerDay;
    return rule;
  }

  async deleteRule(id: string): Promise<boolean> {
    return this.rules.delete(id);
  }

  async markEvaluated(id: string): Promise<void> {
    const rule = this.rules.get(id);
    if (rule) rule.last_evaluated_at = new Date().toISOString();
  }

  async markTriggered(id: string): Promise<void> {
    const rule = this.rules.get(id);
    if (rule) {
      const now = new Date().toISOString();
      rule.last_triggered_at = now;
      rule.total_repayments += 1;
    }
  }

  async incrementFailures(id: string): Promise<void> {
    const rule = this.rules.get(id);
    if (!rule) return;
    rule.consecutive_failures += 1;
    if (rule.consecutive_failures >= MAX_CONSECUTIVE_FAILURES) {
      rule.status = 'paused';
    }
  }

  async resetFailures(id: string): Promise<void> {
    const rule = this.rules.get(id);
    if (rule) rule.consecutive_failures = 0;
  }

  async logExecution(input: LogAutoRepayExecutionInput): Promise<AutoRepayExecutionRow> {
    const row: AutoRepayExecutionRow = {
      id: crypto.randomUUID(),
      rule_id: input.ruleId,
      executed_at: new Date().toISOString(),
      status: input.status,
      hf_before: input.hfBefore ?? null,
      hf_after: input.hfAfter ?? null,
      amount_repaid: input.amountRepaid ?? null,
      tx_hash: input.txHash ?? null,
      error_message: input.errorMessage ?? null,
    };
    this.executions.push(row);
    return row;
  }

  async getExecutionsToday(ruleId: string): Promise<number> {
    const today = new Date().toISOString().slice(0, 10);
    return this.executions.filter(
      (e) => e.rule_id === ruleId && e.executed_at.slice(0, 10) === today,
    ).length;
  }

  async getExecutionHistory(ruleId: string, limit = 50): Promise<AutoRepayExecutionRow[]> {
    return this.executions
      .filter((e) => e.rule_id === ruleId)
      .sort((a, b) => b.executed_at.localeCompare(a.executed_at))
      .slice(0, limit);
  }
}

export function createPostgresAutoRepayStore(pool: pg.Pool): AutoRepayStore {
  return {
    async createRule(input) {
      const res = await query<AutoRepayRuleRow>(
        pool,
        `INSERT INTO auto_repay_rules
           (user_address, trigger_hf, target_hf, max_repay_per_execution, repay_source,
            authorization_tx_hash, max_per_day)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         RETURNING *`,
        [
          input.userAddress.toLowerCase(),
          input.triggerHf,
          input.targetHf,
          input.maxRepayPerExecution,
          input.repaySource ?? ['usdc'],
          input.authorizationTxHash ?? null,
          input.maxPerDay ?? DEFAULT_MAX_PER_DAY,
        ],
      );
      return res.rows[0]!;
    },

    async getRulesByUser(userAddress) {
      const res = await query<AutoRepayRuleRow>(
        pool,
        `SELECT * FROM auto_repay_rules WHERE user_address = $1 ORDER BY created_at DESC`,
        [userAddress.toLowerCase()],
      );
      return res.rows;
    },

    async getActiveRules() {
      const res = await query<AutoRepayRuleRow>(
        pool,
        `SELECT * FROM auto_repay_rules WHERE status = 'active' ORDER BY last_evaluated_at NULLS FIRST`,
      );
      return res.rows;
    },

    async getRuleById(id) {
      const res = await query<AutoRepayRuleRow>(
        pool,
        `SELECT * FROM auto_repay_rules WHERE id = $1`,
        [id],
      );
      return res.rows[0] ?? null;
    },

    async updateRule(id, updates) {
      const sets: string[] = [];
      const vals: unknown[] = [];
      let idx = 1;
      if (updates.triggerHf !== undefined) {
        sets.push(`trigger_hf = $${idx++}`);
        vals.push(updates.triggerHf);
      }
      if (updates.targetHf !== undefined) {
        sets.push(`target_hf = $${idx++}`);
        vals.push(updates.targetHf);
      }
      if (updates.maxRepayPerExecution !== undefined) {
        sets.push(`max_repay_per_execution = $${idx++}`);
        vals.push(updates.maxRepayPerExecution);
      }
      if (updates.repaySource !== undefined) {
        sets.push(`repay_source = $${idx++}`);
        vals.push(updates.repaySource);
      }
      if (updates.status !== undefined) {
        sets.push(`status = $${idx++}`);
        vals.push(updates.status);
      }
      if (updates.maxPerDay !== undefined) {
        sets.push(`max_per_day = $${idx++}`);
        vals.push(updates.maxPerDay);
      }
      if (sets.length === 0) {
        const res = await query<AutoRepayRuleRow>(
          pool,
          `SELECT * FROM auto_repay_rules WHERE id = $1`,
          [id],
        );
        return res.rows[0] ?? null;
      }
      vals.push(id);
      const res = await query<AutoRepayRuleRow>(
        pool,
        `UPDATE auto_repay_rules SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
        vals,
      );
      return res.rows[0] ?? null;
    },

    async deleteRule(id) {
      const res = await query(pool, `DELETE FROM auto_repay_rules WHERE id = $1`, [id]);
      return (res.rowCount ?? 0) > 0;
    },

    async markEvaluated(id) {
      await query(
        pool,
        `UPDATE auto_repay_rules SET last_evaluated_at = now() WHERE id = $1`,
        [id],
      );
    },

    async markTriggered(id) {
      await query(
        pool,
        `UPDATE auto_repay_rules SET last_triggered_at = now(), total_repayments = total_repayments + 1 WHERE id = $1`,
        [id],
      );
    },

    async incrementFailures(id) {
      await query(
        pool,
        `UPDATE auto_repay_rules SET
           consecutive_failures = consecutive_failures + 1,
           status = CASE WHEN consecutive_failures + 1 >= $2 THEN 'paused' ELSE status END
         WHERE id = $1`,
        [id, MAX_CONSECUTIVE_FAILURES],
      );
    },

    async resetFailures(id) {
      await query(
        pool,
        `UPDATE auto_repay_rules SET consecutive_failures = 0 WHERE id = $1`,
        [id],
      );
    },

    async logExecution(input) {
      const res = await query<AutoRepayExecutionRow>(
        pool,
        `INSERT INTO auto_repay_executions
           (rule_id, status, hf_before, hf_after, amount_repaid, tx_hash, error_message)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         RETURNING *`,
        [
          input.ruleId,
          input.status,
          input.hfBefore ?? null,
          input.hfAfter ?? null,
          input.amountRepaid ?? null,
          input.txHash ?? null,
          input.errorMessage ?? null,
        ],
      );
      return res.rows[0]!;
    },

    async getExecutionsToday(ruleId) {
      const res = await query<{ count: string }>(
        pool,
        `SELECT COUNT(*) as count FROM auto_repay_executions
         WHERE rule_id = $1 AND executed_at >= CURRENT_DATE`,
        [ruleId],
      );
      return Number(res.rows[0]?.count ?? '0');
    },

    async getExecutionHistory(ruleId, limit = 50) {
      const res = await query<AutoRepayExecutionRow>(
        pool,
        `SELECT * FROM auto_repay_executions WHERE rule_id = $1 ORDER BY executed_at DESC LIMIT $2`,
        [ruleId, limit],
      );
      return res.rows;
    },
  };
}

// ── Runner logic ────────────────────────────────────────────────────

export interface AutoRepayDeps {
  store: AutoRepayStore;
  fetchHealthFactor: (userAddress: string) => Promise<number>;
  buildRepayTx: (params: {
    userAddress: string;
    repayAsset: string;
    amount: bigint;
  }) => Promise<{ to: string; data: string; value: string }>;
  signAndBroadcast: (tx: { to: string; data: string; value: string }) => Promise<string>;
  notify: (userAddress: string, message: string) => Promise<void>;
}

export interface AutoRepayCycleResult {
  evaluated: number;
  triggered: number;
  repaid: number;
  failed: number;
  errors: string[];
}

const HF_SCALE = 10000;
const RUNNER_MAX_CONSECUTIVE_FAILURES = 3;

export function shouldTrigger(rule: AutoRepayRuleRow, currentHF: number): boolean {
  if (rule.status !== 'active') return false;
  const currentHFBps = Math.floor(currentHF * HF_SCALE);
  return currentHFBps <= rule.trigger_hf;
}

export function calculateRepayAmount(
  currentHF: number,
  targetHF: number,
  maxRepay: string,
): bigint {
  if (currentHF <= 0 || targetHF <= 0) return 0n;
  if (currentHF >= targetHF) return 0n;

  const maxRepayBigInt = BigInt(maxRepay);
  const repayRatio = 1 - (currentHF / targetHF);
  const capped = Math.min(Math.max(repayRatio, 0), 1);
  return BigInt(Math.floor(Number(maxRepayBigInt) * capped));
}

export function estimatePostRepayHF(
  currentHF: number,
  repayAmountWei: bigint,
  totalDebtEstimate: bigint,
): number {
  if (totalDebtEstimate === 0n) return Infinity;
  const debtReduction = Number(repayAmountWei) / Number(totalDebtEstimate);
  const newHF = currentHF / (1 - debtReduction);
  return isFinite(newHF) ? newHF : Infinity;
}

export async function runAutoRepayCycle(deps: AutoRepayDeps): Promise<AutoRepayCycleResult> {
  const rules = await deps.store.getActiveRules();
  const result: AutoRepayCycleResult = {
    evaluated: 0,
    triggered: 0,
    repaid: 0,
    failed: 0,
    errors: [],
  };

  for (const rule of rules) {
    try {
      const currentHF = await deps.fetchHealthFactor(rule.user_address);
      result.evaluated++;
      await deps.store.markEvaluated(rule.id);

      if (!shouldTrigger(rule, currentHF)) continue;

      const executionsToday = await deps.store.getExecutionsToday(rule.id);
      if (executionsToday >= rule.max_per_day) {
        result.errors.push(`[${rule.id}] daily limit reached (${executionsToday}/${rule.max_per_day})`);
        continue;
      }

      result.triggered++;
      const repayAmount = calculateRepayAmount(currentHF, rule.target_hf, rule.max_repay_per_execution);

      if (repayAmount <= 0n) {
        result.errors.push(`[${rule.id}] calculated repay amount is 0`);
        continue;
      }

      const repayAsset = rule.repay_source[0] ?? 'usdc';
      let txHash: string;

      try {
        const tx = await deps.buildRepayTx({
          userAddress: rule.user_address,
          repayAsset,
          amount: repayAmount,
        });
        txHash = await deps.signAndBroadcast(tx);
      } catch (txErr) {
        const msg = txErr instanceof Error ? txErr.message : 'tx build/broadcast failed';
        await deps.store.incrementFailures(rule.id);
        await deps.store.logExecution({
          ruleId: rule.id,
          status: 'failed',
          hfBefore: currentHF,
          errorMessage: msg,
        });
        result.failed++;
        result.errors.push(`[${rule.id}] ${msg}`);
        continue;
      }

      let postHF: number;
      try {
        postHF = await deps.fetchHealthFactor(rule.user_address);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await deps.store.incrementFailures(rule.id);
        await deps.store.logExecution({
          ruleId: rule.id,
          status: 'failed',
          hfBefore: currentHF,
          txHash,
          errorMessage: `post_hf_fetch_failed: ${msg}`,
        });
        result.failed++;
        result.errors.push(`[${rule.id}] post_hf_fetch_failed: ${msg}`);
        continue;
      }

      if (postHF <= currentHF) {
        await deps.store.updateRule(rule.id, { status: 'paused' });
        await deps.store.logExecution({
          ruleId: rule.id,
          status: 'failed_sanity',
          hfBefore: currentHF,
          hfAfter: postHF,
          amountRepaid: repayAmount.toString(),
          txHash,
          errorMessage: 'hf_did_not_improve: rule disabled',
        });
        result.failed++;
        result.errors.push(`[${rule.id}] hf_did_not_improve: ${currentHF} -> ${postHF} — rule disabled`);
        await deps.notify(
          rule.user_address,
          `Auto-repay anomaly: HF did not improve after repay (${currentHF.toFixed(4)} -> ${postHF.toFixed(4)}). Rule has been paused.`,
        );
        continue;
      }

      await deps.store.resetFailures(rule.id);
      await deps.store.markTriggered(rule.id);
      await deps.store.logExecution({
        ruleId: rule.id,
        status: 'success',
        hfBefore: currentHF,
        hfAfter: postHF,
        amountRepaid: repayAmount.toString(),
        txHash,
      });
      result.repaid++;

      await deps.notify(
        rule.user_address,
        `Auto-repay executed: ${repayAmount.toString()} ${repayAsset} repaid. HF: ${currentHF.toFixed(4)} -> ${postHF.toFixed(4)}`,
      );

      if (rule.consecutive_failures >= RUNNER_MAX_CONSECUTIVE_FAILURES - 1) {
        await deps.store.updateRule(rule.id, { status: 'paused' });
        await deps.notify(
          rule.user_address,
          `Auto-repay rule ${rule.id} has been paused due to consecutive failures.`,
        );
      }
    } catch (err) {
      result.failed++;
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push(`[${rule.id}] ${msg}`);
    }
  }

  return result;
}

export async function loadActiveRules(store: AutoRepayStore): Promise<AutoRepayRuleRow[]> {
  return store.getActiveRules();
}

export async function checkHealthFactor(
  fetchHF: (addr: string) => Promise<number>,
  userAddress: string,
): Promise<number> {
  return fetchHF(userAddress);
}
