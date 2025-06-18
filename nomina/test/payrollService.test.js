import assert from 'assert';
import PayrollService from '../src/application/PayrollService.js';

class DummyRepo {
  async findAll() { return []; }
}

const service = new PayrollService(new DummyRepo(), new DummyRepo());

assert.strictEqual(service.calcularISR(10000), 0);
const isr = service.calcularISR(40000);
assert.ok(isr > 0);
console.log('PayrollService tests passed');
