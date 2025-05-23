const axios = require('axios');

async function checkServiceHealth(service, port) {
  try {
    const response = await axios.get(`http://localhost:${port}/health`);
    if (response.data.status === 'healthy') {
      console.log(`✅ ${service} health check passed`);
      return true;
    }
    console.error(`❌ ${service} health check failed: Unexpected response`);
    return false;
  } catch (error) {
    console.error(`❌ ${service} health check failed:`, error.message);
    return false;
  }
}

async function runHealthChecks() {
  const checks = [
    checkServiceHealth('bases_de_datos', 3000),
    checkServiceHealth('asistencia', 3003),
    checkServiceHealth('nomina', 3002)
  ];

  const results = await Promise.all(checks);
  const allPassed = results.every(result => result);

  if (!allPassed) {
    process.exit(1);
  }
}

runHealthChecks();
