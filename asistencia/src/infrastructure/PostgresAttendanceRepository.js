const AttendanceRepository = require('../domain/AttendanceRepository');

class PostgresAttendanceRepository extends AttendanceRepository {
  constructor(pool) {
    super();
    this.pool = pool;
  }

  async findEmployeeByLast5(last5) {
    const res = await this.pool.query(
      'SELECT * FROM employees WHERE RIGHT(REPLACE(dni, ''-'', ''''), 5) = $1',
      [last5]
    );
    return res.rows[0];
  }

  async getAttendanceForDate(last5, date) {
    const res = await this.pool.query(
      'SELECT * FROM control_asistencia WHERE last5 = $1 AND date = $2',
      [last5, date]
    );
    return res.rows[0];
  }

  async insertCheckIn(last5, date, time, justification) {
    await this.pool.query(
      `INSERT INTO control_asistencia (last5, date, check_in, justification)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (last5, date) DO UPDATE
       SET check_in = EXCLUDED.check_in, justification = EXCLUDED.justification`,
      [last5, date, time, justification]
    );
  }

  async updateCheckOut(last5, date, time) {
    await this.pool.query(
      'UPDATE control_asistencia SET check_out = $1 WHERE last5 = $2 AND date = $3',
      [time, last5, date]
    );
  }
}

module.exports = PostgresAttendanceRepository;
