// Health Monitoring Service
class HealthMonitor {
  constructor() {
    this.services = new Map();
    this.healthChecks = new Map();
    this.performanceMetrics = new Map();
    this.isMonitoring = false;
    this.checkInterval = 30000; // 30 seconds
    this.intervalId = null;
  }

  // Register a service for monitoring
  registerService(name, healthCheckFn, options = {}) {
    this.services.set(name, {
      name,
      healthCheckFn,
      status: 'unknown',
      lastCheck: null,
      lastSuccess: null,
      errorCount: 0,
      responseTime: null,
      options: {
        critical: false,
        retryCount: 3,
        timeout: 5000,
        ...options
      }
    });

    console.log(`[HealthMonitor] Registered service: ${name}`);
  }

  // Start monitoring
  startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.intervalId = setInterval(() => {
      this.runHealthChecks();
    }, this.checkInterval);
    
    console.log('[HealthMonitor] Started monitoring');
  }

  // Stop monitoring
  stopMonitoring() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isMonitoring = false;
    console.log('[HealthMonitor] Stopped monitoring');
  }

  // Run health checks for all services
  async runHealthChecks() {
    const checks = Array.from(this.services.values()).map(service => 
      this.checkServiceHealth(service)
    );
    
    await Promise.allSettled(checks);
    this.updateOverallHealth();
  }

  // Check health of a specific service
  async checkServiceHealth(service) {
    const startTime = performance.now();
    
    try {
      const result = await Promise.race([
        service.healthCheckFn(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), service.options.timeout)
        )
      ]);
      
      const responseTime = performance.now() - startTime;
      
      service.status = 'healthy';
      service.lastCheck = new Date();
      service.lastSuccess = new Date();
      service.errorCount = 0;
      service.responseTime = responseTime;
      
      this.recordPerformance(service.name, responseTime);
      
    } catch (error) {
      service.status = 'unhealthy';
      service.lastCheck = new Date();
      service.errorCount++;
      service.responseTime = null;
      
      console.warn(`[HealthMonitor] Service ${service.name} is unhealthy:`, error.message);
      
      // Handle critical service failures
      if (service.options.critical && service.errorCount >= service.options.retryCount) {
        this.handleCriticalServiceFailure(service, error);
      }
    }
  }

  // Record performance metrics
  recordPerformance(serviceName, responseTime) {
    if (!this.performanceMetrics.has(serviceName)) {
      this.performanceMetrics.set(serviceName, []);
    }
    
    const metrics = this.performanceMetrics.get(serviceName);
    metrics.push({
      timestamp: Date.now(),
      responseTime
    });
    
    // Keep only last 100 measurements
    if (metrics.length > 100) {
      metrics.shift();
    }
  }

  // Handle critical service failures
  handleCriticalServiceFailure(service, error) {
    console.error(`[HealthMonitor] Critical service ${service.name} failed:`, error);
    
    // Emit event for UI to handle
    window.dispatchEvent(new CustomEvent('critical-service-failure', {
      detail: { service: service.name, error: error.message }
    }));
  }

  // Update overall health status
  updateOverallHealth() {
    const services = Array.from(this.services.values());
    const healthyServices = services.filter(s => s.status === 'healthy');
    const criticalServices = services.filter(s => s.options.critical);
    const criticalHealthy = criticalServices.filter(s => s.status === 'healthy');
    
    const overallHealth = {
      total: services.length,
      healthy: healthyServices.length,
      unhealthy: services.length - healthyServices.length,
      critical: criticalServices.length,
      criticalHealthy: criticalHealthy.length,
      isHealthy: criticalHealthy.length === criticalServices.length
    };
    
    // Store overall health
    this.overallHealth = overallHealth;
    
    // Emit health update event
    window.dispatchEvent(new CustomEvent('health-update', {
      detail: overallHealth
    }));
  }

  // Get service status
  getServiceStatus(serviceName) {
    return this.services.get(serviceName);
  }

  // Get all service statuses
  getAllServiceStatuses() {
    return Array.from(this.services.values());
  }

  // Get overall health
  getOverallHealth() {
    return this.overallHealth || { isHealthy: false };
  }

  // Get performance metrics
  getPerformanceMetrics(serviceName) {
    const metrics = this.performanceMetrics.get(serviceName) || [];
    if (metrics.length === 0) return null;
    
    const responseTimes = metrics.map(m => m.responseTime);
    return {
      average: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
      min: Math.min(...responseTimes),
      max: Math.max(...responseTimes),
      count: responseTimes.length
    };
  }

  // Manual health check
  async checkService(serviceName) {
    const service = this.services.get(serviceName);
    if (!service) {
      throw new Error(`Service ${serviceName} not found`);
    }
    
    await this.checkServiceHealth(service);
    return service;
  }
}

const healthMonitor = new HealthMonitor();
export default healthMonitor;
