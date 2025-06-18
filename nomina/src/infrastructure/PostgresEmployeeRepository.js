import EmployeeRepository from '../domain/EmployeeRepository.js';

export default class PostgresEmployeeRepository extends EmployeeRepository {
  constructor(pool) {
    super();
    this.pool = pool;
  }

  async findAll() {
    const res = await this.pool.query('SELECT * FROM employees');
    return res.rows;
  }
}
