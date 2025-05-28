import { exec } from 'child_process';
import { promisify } from 'util';
import axios from 'axios';
import pg from 'pg';
import chalk from 'chalk';

const execAsync = promisify(exec);
const { Pool } = pg;

// Configuration
const config = {
  services: [
    { name: 'bases_de_datos', port: 3000 },
    { name: 'asistencia', port: 3003 },
    { name: 'nomina', port: 3002 }
  ],
  postgres: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'admin',
    password: process.env.DB_PASSWORD || 'secret',
    database: process.env.DB_NAME || 'saas_db'
  }
};

async function checkContainers() {
  console.log(chalk.blue('\n🔍 Checking Docker containers...'));
  try {
    const { stdout } = await execAsync('docker ps --format "{{.Names}}\t{{.Status}}"');
    const containers = stdout.split('\n').filter(Boolean);
    
    for (const container of containers) {
      const [name, status] = container.split('\t');
      if (status.includes('Up')) {
        console.log(chalk.green(`✅ Container ${name} is running`));
      } else {
        console.log(chalk.red(`❌ Container ${name} is not running properly: ${status}`));
      }
    }
  } catch (error) {
    console.error(chalk.red('❌ Error checking containers:'), error.message);
  }
}

async function checkEndpoints() {
  console.log(chalk.blue('\n🔍 Checking service endpoints...'));
  for (const service of config.services) {
    try {
      const response = await axios.get(`http://localhost:${service.port}/health`, { timeout: 5000 });
      if (response.data.status === 'healthy') {
        console.log(chalk.green(`✅ ${service.name} health check passed`));
      } else {
        console.log(chalk.yellow(`⚠️  ${service.name} reports unhealthy status:`, response.data));
      }
    } catch (error) {
      console.error(chalk.red(`❌ ${service.name} health check failed:`), error.message);
    }
  }
}

async function checkPostgres() {
  console.log(chalk.blue('\n🔍 Checking PostgreSQL connection...'));
  const pool = new Pool(config.postgres);

  try {
    const client = await pool.connect();
    console.log(chalk.green('✅ Successfully connected to PostgreSQL'));

    const result = await client.query('SELECT version()');
    console.log(chalk.green('✅ Database version:'), result.rows[0].version);

    // Check connection pool status
    const poolStatus = await pool.query('SELECT count(*) from pg_stat_activity');
    console.log(chalk.green('✅ Active connections:'), poolStatus.rows[0].count);

    client.release();
  } catch (error) {
    console.error(chalk.red('❌ PostgreSQL connection failed:'), error.message);
  } finally {
    await pool.end();
  }
}

async function runAllChecks() {
  console.log(chalk.yellow('Starting health checks...\n'));
  
  try {
    await checkContainers();
    await checkEndpoints();
    await checkPostgres();
    
    console.log(chalk.yellow('\nHealth checks completed.'));
  } catch (error) {
    console.error(chalk.red('\nError during health checks:'), error);
    process.exit(1);
  }
}

// Run all checks
runAllChecks();
