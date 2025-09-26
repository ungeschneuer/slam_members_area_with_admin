import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import sessionService from './services/sessionService.js'
import databaseService from './services/databaseService.js'
import hybridDataService from './services/hybridDataService.js'
import websocketService from './services/websocketService.js'
import errorHandler from './services/errorHandler.js'
import healthMonitor from './services/healthMonitor.js'
import { withResilience } from './services/resilientService.js'
import './index.css'

console.log('Main.jsx loading...');

// Initialize session service
sessionService.init();

// Initialize WebSocket service
websocketService.connect().catch(error => {
  console.error('Failed to connect WebSocket:', error);
});

// Initialize database services asynchronously
async function initializeServices() {
  try {
    console.log('Starting service initialization...');
    
    // Initialize database service first (without resilience wrapper for init)
    if (databaseService && typeof databaseService.init === 'function') {
      await databaseService.init();
      console.log('Database service initialized');
    } else {
      console.warn('Database service init method not available');
    }
    
    // Initialize hybrid data service (without resilience wrapper for init)
    if (hybridDataService && typeof hybridDataService.initializeData === 'function') {
      await hybridDataService.initializeData();
      console.log('Hybrid data service initialized');
    } else {
      console.warn('Hybrid data service initializeData method not available');
    }
    
    // Wrap services with resilience after initialization
    const resilientDatabaseService = withResilience(databaseService, {
      maxRetries: 3,
      timeout: 15000,
      circuitBreakerThreshold: 3
    });
    
    const resilientHybridService = withResilience(hybridDataService, {
      maxRetries: 2,
      timeout: 10000,
      circuitBreakerThreshold: 2
    });
    
    console.log('All services initialized successfully');
  } catch (error) {
    errorHandler.handleError(error, 'ServiceInitialization');
    console.error('Service initialization failed:', error);
  }
}

// Initialize services with delay to ensure server is ready
setTimeout(() => {
  initializeServices();
}, 2000); // Wait 2 seconds for server to be ready

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(console.error);
}

const root = createRoot(document.getElementById('root'));
console.log('Rendering React app...');
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

console.log('React app rendered');
