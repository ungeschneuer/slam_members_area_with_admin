// Simplified Socket.io Service for SLAM25 Application
// Relies on Socket.io built-in features for reconnection and heartbeat

import { io } from 'socket.io-client';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.isConnecting = false;
    this.subscribers = new Map();
    this.offlineMode = false;
    this.networkOnline = true;
    this.baseURL = import.meta.env.VITE_SERVER_URL;
    
    // Validate environment variables
    if (!this.baseURL) {
      console.error('Socket.io Service: VITE_SERVER_URL is not defined in environment variables');
    }
    
    this.setupNetworkListeners();
  }

  // Setup network listeners for online/offline detection
  setupNetworkListeners() {
    window.addEventListener('online', () => {
      if (import.meta.env.DEV) {
        console.log('WebSocketService: Network came online');
      }
      this.networkOnline = true;
      if (!this.isConnected && !this.isConnecting) {
        this.connect();
      }
    });

    window.addEventListener('offline', () => {
      if (import.meta.env.DEV) {
        console.log('WebSocketService: Network went offline');
      }
      this.networkOnline = false;
      this.offlineMode = true;
    });
  }

  // Connect to Socket.io server
  async connect() {
    if (this.isConnected || this.isConnecting) {
      return;
    }

    if (!this.baseURL) {
      console.error('WebSocketService: Cannot connect - baseURL not defined');
      return;
    }

    this.isConnecting = true;

    try {
      if (import.meta.env.DEV) {
        console.log('WebSocketService: Connecting to', this.baseURL);
      }

      this.socket = io(this.baseURL, {
        transports: ['websocket', 'polling'],
        timeout: 20000,
        forceNew: true
      });

      this.setupEventListeners();
    } catch (error) {
      console.error('WebSocketService: Connection failed:', error);
      this.isConnecting = false;
    }
  }

  // Setup Socket.io event listeners
  setupEventListeners() {
    this.socket.on('connect', () => {
      this.isConnected = true;
      this.isConnecting = false;
      this.offlineMode = false;
      
      if (import.meta.env.DEV) {
        console.log('WebSocketService: Connected successfully');
      }
      
      this.notifySubscribers('connection-status', { 
        status: 'connected', 
        message: 'Connected to server' 
      });
    });

    this.socket.on('disconnect', (reason) => {
      this.isConnected = false;
      
      if (import.meta.env.DEV) {
        console.log('WebSocketService: Disconnected:', reason);
      }
      
      this.notifySubscribers('connection-status', { 
        status: 'disconnected', 
        message: 'Disconnected from server' 
      });
    });

    this.socket.on('data-update', (data) => {
      this.notifySubscribers('data-update', data);
    });

    this.socket.on('admin-update', (data) => {
      this.notifySubscribers('admin-update', data);
    });

    this.socket.on('cache-invalidation', (data) => {
      this.notifySubscribers('cache-invalidation', data);
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocketService: Connection error:', error);
      this.isConnecting = false;
      this.notifySubscribers('connection-status', { 
        status: 'error', 
        message: 'Connection failed' 
      });
    });
  }

  // Disconnect from server
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
    this.isConnecting = false;
  }

  // Subscribe to events
  subscribe(event, callback) {
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, new Set());
    }
    this.subscribers.get(event).add(callback);
    
    return () => this.unsubscribe(event, callback);
  }

  // Unsubscribe from events
  unsubscribe(event, callback) {
    if (this.subscribers.has(event)) {
      this.subscribers.get(event).delete(callback);
    }
  }

  // Emit events to server
  emit(event, data) {
    if (this.socket && this.isConnected) {
      this.socket.emit(event, data);
    } else {
      console.warn('WebSocketService: Cannot emit - not connected');
    }
  }

  // Join rooms
  joinMemberRoom() {
    if (this.socket && this.isConnected) {
      this.socket.emit('join-room', 'member');
    }
  }

  joinAdminRoom() {
    if (this.socket && this.isConnected) {
      this.socket.emit('join-room', 'admin');
    }
  }

  // Get connection status
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      isConnecting: this.isConnecting,
      offlineMode: this.offlineMode,
      networkOnline: this.networkOnline
    };
  }

  // Notify subscribers
  notifySubscribers(event, data) {
    if (this.subscribers.has(event)) {
      this.subscribers.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('WebSocketService: Error in subscriber callback:', error);
        }
      });
    }
  }
}

// Create singleton instance
const websocketService = new WebSocketService();

export default websocketService;