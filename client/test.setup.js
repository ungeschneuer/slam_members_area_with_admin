// jsdom setup for client tests
Object.defineProperty(HTMLCanvasElement.prototype, 'toDataURL', {
  value: () => 'data:image/png;base64,test',
});

// Stub import.meta.env for client tests
globalThis.import = { 
  meta: { 
    env: {
      VITE_API_URL: 'http://localhost:3005/api',
      VITE_API_BASE_URL: 'http://localhost:3005/api',
      VITE_WS_URL: 'ws://localhost:3005',
      MODE: 'test'
    } 
  } 
};


