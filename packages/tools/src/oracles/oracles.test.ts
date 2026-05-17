import { describe, expect, test } from 'vitest';
import { getBalance, getHealthFactor, getPrice } from './index.js';

describe('oracle helpers fail closed', () => {
  test('price oracle refuses unconfigured reads', async () => {
    await expect(getPrice('ETH')).rejects.toThrow('price_oracle_not_configured:ETH');
  });

  test('balance oracle refuses unconfigured reads', async () => {
    await expect(getBalance('0x1234', 'USDC')).rejects.toThrow('balance_oracle_not_configured');
  });

  test('Aave position oracle refuses unconfigured reads', async () => {
    await expect(getHealthFactor('0x1234')).rejects.toThrow('aave_position_oracle_not_configured');
  });
});
