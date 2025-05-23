const AWS = require('aws-sdk');
const cloudwatch = new AWS.CloudWatch();

class Monitoring {
  constructor(serviceName) {
    this.serviceName = serviceName;
    this.namespace = 'SAAS-RH';
  }

  // Basic metrics for MVP monitoring
  async recordMetric(metricName, value, unit = 'Count') {
    try {
      await cloudwatch.putMetricData({
        Namespace: this.namespace,
        MetricData: [{
          MetricName: metricName,
          Value: value,
          Unit: unit,
          Dimensions: [{
            Name: 'Service',
            Value: this.serviceName
          }],
          Timestamp: new Date()
        }]
      }).promise();
    } catch (error) {
      console.error('Error recording metric:', error);
    }
  }

  // Record response time
  async recordResponseTime(duration) {
    await this.recordMetric('ResponseTime', duration, 'Milliseconds');
  }

  // Record error rate
  async recordError() {
    await this.recordMetric('ErrorCount', 1);
  }

  // Record successful requests
  async recordSuccess() {
    await this.recordMetric('SuccessCount', 1);
  }

  // Record database connection status
  async recordDBConnection(isConnected) {
    await this.recordMetric('DBConnection', isConnected ? 1 : 0);
  }

  // Record Redis connection status
  async recordRedisConnection(isConnected) {
    await this.recordMetric('RedisConnection', isConnected ? 1 : 0);
  }

  // Record memory usage
  async recordMemoryUsage() {
    const used = process.memoryUsage().heapUsed / 1024 / 1024;
    await this.recordMetric('MemoryUsageMB', Math.round(used * 100) / 100, 'Megabytes');
  }
}
