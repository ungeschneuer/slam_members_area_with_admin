// WebSocket Service for SLAM25 Application
// Handles real-time communication with the backend

import { io } from 'socket.io-client';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.subscribers = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.baseURL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
    this.isConnecting = false;
  }

  connect() {
    // Prevent multiple connection attempts
    if (this.isConnecting || this.isConnected) {
      console.log('WebSocketService: Already connecting or connected, skipping...');
      return Promise.resolve();
    }
    
    this.isConnecting = true;
    console.log('WebSocketService: Connecting to WebSocket server at:', this.baseURL);
    
    return new Promise((resolve, reject) => {
      try {
        this.socket = io(this.baseURL, {
          transports: ['websocket', 'polling'],
          timeout: 5000,
          forceNew: false
        });
        
        this.setupEventHandlers();
        console.log('WebSocketService: WebSocket connection initiated');
        
        // Resolve when connected or reject on error
        const connectTimeout = setTimeout(() => {
          if (!this.isConnected) {
            console.warn('WebSocketService: Connection timeout');
            this.isConnecting = false;
            reject(new Error('Connection timeout'));
          }
        }, 10000);
        
        this.socket.once('connect', () => {
          clearTimeout(connectTimeout);
          resolve();
        });
        
        this.socket.once('connect_error', (error) => {
          clearTimeout(connectTimeout);
          this.isConnecting = false;
          reject(error);
        });
        
      } catch (error) {
        console.error('WebSocketService: Failed to create WebSocket connection:', error);
        this.isConnecting = false;
        this.isConnected = false;
        reject(error);
      }
    });
  }

  // Setup event handlers
  setupEventHandlers() {
    this.socket.on('connect', () => {
      this.isConnected = true;
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      console.log('WebSocketService: Connected successfully');
      
      // Join appropriate room based on user role
      this.joinMemberRoom();
    });

    this.socket.on('disconnect', (reason) => {
      this.isConnected = false;
      this.isConnecting = false;
      console.log('WebSocketService: Disconnected:', reason);
      
      if (reason === 'io server disconnect') {
        // Server disconnected us, try to reconnect
        console.log('WebSocketService: Server disconnected, attempting to reconnect...');
        setTimeout(() => {
          if (!this.isConnected && !this.isConnecting) {
            this.connect();
          }
        }, 1000);
      }
    });

    this.socket.on('connect_error', (error) => {
      this.isConnected = false;
      this.isConnecting = false;
      this.reconnectAttempts++;
      console.error('WebSocketService: Connection error:', error);
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('WebSocketService: Max reconnection attempts reached');
      } else {
        // Try to reconnect after delay
        setTimeout(() => {
          if (!this.isConnected && !this.isConnecting) {
            console.log('WebSocketService: Attempting to reconnect...');
            this.connect();
          }
        }, this.reconnectDelay * this.reconnectAttempts);
      }
    });

    this.socket.on('reconnect', (attemptNumber) => {
      this.isConnected = true;
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      console.log('WebSocketService: Reconnected after', attemptNumber, 'attempts');
      
      // Rejoin rooms after reconnection
      this.joinMemberRoom();
    });

    // Handle data updates
    this.socket.on('data-update', (data) => {
      console.log('WebSocketService: Received data update:', data);
      this.notifySubscribers('data-update', data);
    });

    // Handle admin updates
    this.socket.on('admin-update', (data) => {
      console.log('WebSocketService: Received admin update:', data);
      this.notifySubscribers('admin-update', data);
    });
  }

  // Join member room
  joinMemberRoom() {
    if (this.socket && this.isConnected) {
      this.socket.emit('join-member');
    }
  }

  // Join admin room
  joinAdminRoom() {
    if (this.socket && this.isConnected) {
      this.socket.emit('join-admin');
    }
  }

  // Subscribe to WebSocket events
  subscribe(eventType, callback) {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Set());
    }
    this.subscribers.get(eventType).add(callback);

    // Return unsubscribe function
    return () => {
      const eventSubscribers = this.subscribers.get(eventType);
      if (eventSubscribers) {
        eventSubscribers.delete(callback);
        if (eventSubscribers.size === 0) {
          this.subscribers.delete(eventType);
        }
      }
    };
  }

  // Notify subscribers
  notifySubscribers(eventType, data) {
    const eventSubscribers = this.subscribers.get(eventType);
    if (eventSubscribers) {
      eventSubscribers.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('WebSocket: Error in subscriber callback:', error);
        }
      });
    }
  }

  // Disconnect WebSocket
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      console.log('WebSocket: Disconnected');
    }
  }

  // Get connection status
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts
    };
  }

  // Emit custom event (for future use)
  emit(event, data) {
    if (this.socket && this.isConnected) {
      this.socket.emit(event, data);
    } else {
      console.warn('WebSocket: Cannot emit event, not connected');
    }
  }
}

// Create singleton instance
const websocketService = new WebSocketService();

export default websocketService;
