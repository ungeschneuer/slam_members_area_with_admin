// Performance Configuration for SLAM25 Application

export const performanceConfig = {
  // Cache Configuration
  cache: {
    defaultTTL: 5 * 60 * 1000, // 5 minutes
    maxMemorySize: 50 * 1024 * 1024, // 50MB
    cleanupInterval: 60 * 1000, // 1 minute
  },

  // Rate Limiting Configuration
  rateLimit: {
    enabled: true,
    defaultWindow: 60 * 1000, // 1 minute
    defaultMaxRequests: 100,
    blockDuration: 5 * 60 * 1000, // 5 minutes
    endpoints: {
      'api/participants': { maxRequests: 100, windowMs: 60000 },
      'api/rounds': { maxRequests: 100, windowMs: 60000 },
      'api/news': { maxRequests: 50, windowMs: 60000 },
      'api/timetable': { maxRequests: 50, windowMs: 60000 },
      'api/city-tips': { maxRequests: 30, windowMs: 60000 },
      'admin/login': { maxRequests: 5, windowMs: 300000 },
      'admin/create': { maxRequests: 20, windowMs: 60000 },
      'admin/update': { maxRequests: 50, windowMs: 60000 },
      'admin/delete': { maxRequests: 10, windowMs: 60000 },
      'search': { maxRequests: 30, windowMs: 60000 },
      'export': { maxRequests: 5, windowMs: 300000 },
      'upload': { maxRequests: 10, windowMs: 60000 }
    }
  },

  // Database Configuration
  database: {
    maxConnections: 10,
    connectionTimeout: 30 * 1000, // 30 seconds
    queryTimeout: 10 * 1000, // 10 seconds
    queryCacheTTL: 5 * 60 * 1000, // 5 minutes
    monitoringInterval: 10 * 60 * 1000, // 10 minutes
  },

  // Image Optimization Configuration
  images: {
    webpEnabled: true,
    retinaEnabled: true,
    lazyLoadingEnabled: true,
    cdnBaseUrl: import.meta.env.VITE_CDN_URL || '',
    defaultQuality: 85,
    maxWidth: 1920,
    maxHeight: 1080,
    thumbnailSize: 150,
  },

  // PWA Configuration
  pwa: {
    enabled: true,
    name: 'SLAM25 Members Area',
    shortName: 'SLAM25',
    themeColor: '#0f172a',
    backgroundColor: '#ffffff',
    display: 'standalone',
    orientation: 'portrait-primary',
    scope: '/',
    startUrl: '/',
    icons: [
      { src: '/icons/icon-72.png', sizes: '72x72', type: 'image/png' },
      { src: '/icons/icon-96.png', sizes: '96x96', type: 'image/png' },
      { src: '/icons/icon-128.png', sizes: '128x128', type: 'image/png' },
      { src: '/icons/icon-144.png', sizes: '144x144', type: 'image/png' },
      { src: '/icons/icon-152.png', sizes: '152x152', type: 'image/png' },
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-384.png', sizes: '384x384', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' }
    ]
  },

  // Service Worker Configuration
  serviceWorker: {
    enabled: true,
    cacheVersion: 'slam-cache-v3',
    staticCache: 'slam-static-v3',
    dynamicCache: 'slam-dynamic-v3',
    apiCache: 'slam-api-v3',
    staticAssets: [
      '/',
      '/index.html',
      '/manifest.json',
      '/icons/icon-192.png',
      '/icons/icon-512.png'
    ]
  },

  // Monitoring Configuration
  monitoring: {
    enabled: true,
    statsInterval: 30 * 1000, // 30 seconds
    performanceInterval: 10 * 60 * 1000, // 10 minutes
    logLevel: 'info',
    debugMode: import.meta.env.DEV || false,
  },

  // API Configuration
  api: {
    baseUrl: import.meta.env.VITE_API_BASE_URL || '/api',
    timeout: 10 * 1000, // 10 seconds
    retryAttempts: 3,
    retryDelay: 1000, // 1 second
  },

  // Session Configuration
  session: {
    timeout: 60 * 60 * 1000, // 1 hour
    rememberMeDuration: 7 * 24 * 60 * 60 * 1000, // 7 days
    maxLoginAttempts: 5,
    lockoutDuration: 5 * 60 * 1000, // 5 minutes
  }
};

export default performanceConfig;
