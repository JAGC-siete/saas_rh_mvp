import AWS from 'aws-sdk';

export default class Monitoring {
  constructor(serviceName) {
    if (!serviceName) {
      throw new Error('Service name is required');
    }
    this.serviceName = serviceName;
    this.namespace = 'SAAS-RH';
    try {
      this.cloudwatch = new AWS.CloudWatch({
        apiVersion: '2010-08-01',
        region: process.env.AWS_REGION || 'us-east-1'
      });
      console.log('CloudWatch client initialized successfully');
    } catch (error) {
      console.error('Failed to initialize CloudWatch:', error);
      throw error;
    }
  }

  // Basic metrics for MVP monitoring
  async recordMetric(metricName, value, unit = 'Count') {
    try {
      await this.cloudwatch.putMetricData({
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
    const used = process.memoryUsage();
    await this.recordMetric('HeapUsed', used.heapUsed / 1024 / 1024, 'Megabytes');
  }
}
