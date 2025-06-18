const assert = require('assert');
const { Settings } = require('luxon');
const AttendanceService = require('../src/application/AttendanceService');

class MockRepo {
  constructor(employees = {}) {
    this.employees = employees;
    this.records = {};
  }
  async findEmployeeByLast5(last5) {
    return this.employees[last5] || null;
  }
  async getAttendanceForDate(last5, date) {
    return this.records[`${last5}-${date}`];
  }
  async insertCheckIn(last5, date, time, justification) {
    this.records[`${last5}-${date}`] = { last5, date, check_in: time, justification };
  }
  async updateCheckOut(last5, date, time) {
    const key = `${last5}-${date}`;
    if (this.records[key]) this.records[key].check_out = time;
  }
}

(async () => {
  // Test employee not found
  let repo = new MockRepo();
  let service = new AttendanceService(repo);
  Settings.now = () => new Date('2025-01-01T08:00:00-06:00').valueOf();
  let result = await service.registerAttendance('11111');
  assert.strictEqual(result.status, 404);

  // Test late check-in without justification
  repo = new MockRepo({ '12345': { checkin_time: '08:00', checkout_time: '17:00' } });
  service = new AttendanceService(repo);
  Settings.now = () => new Date('2025-01-01T08:10:00-06:00').valueOf();
  result = await service.registerAttendance('12345');
  assert.strictEqual(result.status, 422);
  assert.ok(result.requireJustification);

  // Test early check-in
  repo = new MockRepo({ '12345': { checkin_time: '08:00', checkout_time: '17:00' } });
  service = new AttendanceService(repo);
  Settings.now = () => new Date('2025-01-01T07:55:00-06:00').valueOf();
  result = await service.registerAttendance('12345', '');
  assert.strictEqual(result.status, 200);
  assert.strictEqual(result.message, '🎉 Felicidades, eres un empleado ejemplar.');

  console.log('AttendanceService tests passed');
})();
