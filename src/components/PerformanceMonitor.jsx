import React, { useState, useEffect } from 'react';
import healthMonitor from '../services/healthMonitor.js';
import errorHandler from '../services/errorHandler.js';

export default function PerformanceMonitor() {
  const [isVisible, setIsVisible] = useState(false);
  const [metrics, setMetrics] = useState({
    services: [],
    errors: {},
    performance: {},
    overallHealth: { isHealthy: false }
  });

  useEffect(() => {
    const updateMetrics = () => {
      const services = healthMonitor.getAllServiceStatuses();
      const overallHealth = healthMonitor.getOverallHealth();
      const errorStats = errorHandler.getErrorStats();
      
      const performance = {};
      services.forEach(service => {
        const serviceMetrics = healthMonitor.getPerformanceMetrics(service.name);
        if (serviceMetrics) {
          performance[service.name] = serviceMetrics;
        }
      });

      setMetrics({
        services,
        errors: errorStats,
        performance,
        overallHealth
      });
    };

    // Update metrics every 5 seconds
    const interval = setInterval(updateMetrics, 5000);
    updateMetrics(); // Initial update

    // Listen for health updates
    const handleHealthUpdate = (event) => {
      updateMetrics();
    };

    window.addEventListener('health-update', handleHealthUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('health-update', handleHealthUpdate);
    };
  }, []);

  if (!import.meta.env.DEV) {
    return null; // Only show in development
  }

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="fixed bottom-4 right-4 z-50 p-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        title="Performance Monitor"
      >
        📊
      </button>

      {/* Monitor Panel */}
      {isVisible && (
        <div className="fixed bottom-16 right-4 z-50 w-80 max-h-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Performance Monitor
              </h3>
              <button
                onClick={() => setIsVisible(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="p-4 space-y-4 max-h-80 overflow-y-auto">
            {/* Overall Health */}
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900 dark:text-white">System Health</h4>
              <div className={`p-2 rounded text-sm ${
                metrics.overallHealth.isHealthy 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
              }`}>
                Status: {metrics.overallHealth.isHealthy ? 'Healthy' : 'Unhealthy'}
                <br />
                Services: {metrics.overallHealth.healthy}/{metrics.overallHealth.total}
              </div>
            </div>

            {/* Service Status */}
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900 dark:text-white">Services</h4>
              <div className="space-y-1">
                {metrics.services.map(service => (
                  <div key={service.name} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700 dark:text-gray-300">{service.name}</span>
                    <div className="flex items-center space-x-2">
                      <span className={`w-2 h-2 rounded-full ${
                        service.status === 'healthy' ? 'bg-green-500' : 'bg-red-500'
                      }`}></span>
                      {metrics.performance[service.name] && (
                        <span className="text-xs text-gray-500">
                          {Math.round(metrics.performance[service.name].average)}ms
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Error Statistics */}
            {Object.keys(metrics.errors).length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900 dark:text-white">Errors</h4>
                <div className="space-y-1">
                  {Object.entries(metrics.errors).map(([error, count]) => (
                    <div key={error} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700 dark:text-gray-300 truncate">{error}</span>
                      <span className="text-red-600 dark:text-red-400 font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Performance Metrics */}
            {Object.keys(metrics.performance).length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900 dark:text-white">Performance</h4>
                <div className="space-y-1">
                  {Object.entries(metrics.performance).map(([service, perf]) => (
                    <div key={service} className="text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-700 dark:text-gray-300">{service}</span>
                        <span className="text-gray-500">avg: {Math.round(perf.average)}ms</span>
                      </div>
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>min: {Math.round(perf.min)}ms</span>
                        <span>max: {Math.round(perf.max)}ms</span>
                        <span>calls: {perf.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  errorHandler.clearErrors();
                  healthMonitor.reset();
                }}
                className="flex-1 px-3 py-2 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Reset
              </button>
              <button
                onClick={() => {
                  const errors = JSON.parse(localStorage.getItem('app_errors') || '[]');
                  console.log('Stored errors:', errors);
                }}
                className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Log Errors
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
