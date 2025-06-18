import AttendanceRepository from '../domain/AttendanceRepository.js';

export default class PostgresAttendanceRepository extends AttendanceRepository {
  constructor(pool) {
    super();
    this.pool = pool;
  }

  async findAll() {
    const res = await this.pool.query('SELECT * FROM control_asistencia');
    return res.rows;
  }
}
