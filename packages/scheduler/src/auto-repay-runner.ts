import type { TaskContext } from './hourly-tasks.js';

export type AutoRepayRuleRow = {
  id: string;
  user_address: string;
  trigger_hf: number; // basis points
  target_hf: number;
  max_repay_per_execution: string;
  repay_source: string[];
  status: string;
  consecutive_failures: number;
};

export async function runAutoRepayTasks(ctx: TaskContext): Promise<{ ok: boolean; detail?: string }> {
  try {
    // Stub: fetch active auto-repay rules
    const rules: AutoRepayRuleRow[] = [];

    let triggered = 0;
    let repaid = 0;
    let failed = 0;

    for (const rule of rules) {
      try {
        // 1. Get user's current health factor
        const currentHF = 0; // stub

        // 2. Check if HF < trigger
        if (currentHF * 10000 < rule.trigger_hf) {
          triggered++;

          // 3. Calculate required repayment to restore target HF
          const _repayAmount = calculateRepayAmount(currentHF, rule.target_hf, rule.max_repay_per_execution);

          // 4. Execute repay via buildRepayCall from @sherpa/tools/aave
          // 5. Send notification
          repaid++;
        }
      } catch (err) {
        failed++;
        ctx.log.error('Auto-repay execution failed', { err, ruleId: rule.id });
      }
    }

    return { ok: true, detail: `Auto-repay: ${triggered} triggered, ${repaid} repaid, ${failed} failed` };
  } catch (err) {
    ctx.log.error('Auto-repay runner error', { err });
    return { ok: false, detail: String(err) };
  }
}

export function calculateRepayAmount(
  currentHF: number,
  targetHF: number,
  maxRepay: string,
): bigint {
  // Simplified: repay enough to restore target HF
  // Real implementation: use Aave HF formula from computeHealthFactor
  const repayRatio = 1 - targetHF / currentHF;
  const maxRepayBigInt = BigInt(maxRepay);
  return BigInt(Math.floor(Number(maxRepayBigInt) * Math.min(repayRatio, 1)));
}
