import { test } from 'node:test';
import assert from 'node:assert';
import { calcularISR, formatoLempiras } from '../nomina/utils.js';

test('calcularISR returns zero for salary below threshold', () => {
  assert.strictEqual(calcularISR(10000), 0);
});

test('formatoLempiras returns formatted string', () => {
  const formatted = formatoLempiras(1000);
  assert.strictEqual(typeof formatted, 'string');
  assert.ok(formatted.includes('1,000'));
});
