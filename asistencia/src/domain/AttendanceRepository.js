class AttendanceRepository {
  async findEmployeeByLast5(last5) {
    throw new Error('Not implemented');
  }
  async getAttendanceForDate(last5, date) {
    throw new Error('Not implemented');
  }
  async insertCheckIn(last5, date, time, justification) {
    throw new Error('Not implemented');
  }
  async updateCheckOut(last5, date, time) {
    throw new Error('Not implemented');
  }
}
module.exports = AttendanceRepository;
