// Enhanced Socket.io service for real-time communication with TanStack Query integration
let io = null;
let connectionMetrics = {
  totalConnections: 0,
  activeConnections: 0,
  totalDisconnections: 0,
  averageConnectionDuration: 0,
  connectionStartTimes: new Map(),
  rooms: {
    member: new Set(),
    admin: new Set()
  }
};

const setSocketIO = (socketIO) => {
  io = socketIO;
  
  // Enhanced Socket.io connection handling with room management
  io.on('connection', (socket) => {
    connectionMetrics.totalConnections++;
    connectionMetrics.activeConnections++;
    connectionMetrics.connectionStartTimes.set(socket.id, Date.now());
    
    console.log(`Socket.io: Client connected (${socket.id}). Total: ${connectionMetrics.totalConnections}, Active: ${connectionMetrics.activeConnections}`);
    
    // Rely on Socket.io built-in heartbeat for connection liveness
    
    // Enhanced room management for Socket.io
    socket.on('join-member', () => {
      socket.join('member');
      connectionMetrics.rooms.member.add(socket.id);
      console.log(`Socket.io: Client ${socket.id} joined member room`);
      socket.emit('connection-status', { status: 'connected', room: 'member' });
    });
    
    socket.on('join-admin', () => {
      socket.join('admin');
      connectionMetrics.rooms.admin.add(socket.id);
      console.log(`Socket.io: Client ${socket.id} joined admin room`);
      socket.emit('connection-status', { status: 'connected', room: 'admin' });
    });
    
    // Enhanced disconnect handling
    socket.on('disconnect', (reason) => {
      connectionMetrics.activeConnections--;
      connectionMetrics.totalDisconnections++;
      
      const connectionDuration = Date.now() - (connectionMetrics.connectionStartTimes.get(socket.id) || Date.now());
      connectionMetrics.connectionStartTimes.delete(socket.id);
      
      // Remove from rooms
      connectionMetrics.rooms.member.delete(socket.id);
      connectionMetrics.rooms.admin.delete(socket.id);
      
      // Update average connection duration
      if (connectionMetrics.totalDisconnections > 0) {
        connectionMetrics.averageConnectionDuration = 
          (connectionMetrics.averageConnectionDuration * (connectionMetrics.totalDisconnections - 1) + connectionDuration) / 
          connectionMetrics.totalDisconnections;
      }
      
      console.log(`Socket.io: Client disconnected (${socket.id}). Reason: ${reason}. Duration: ${Math.round(connectionDuration/1000)}s`);
      console.log(`Socket.io: Active connections: ${connectionMetrics.activeConnections}`);
      
      // No custom heartbeat interval to clear
    });
    
    // Handle connection errors
    socket.on('error', (error) => {
      console.error(`Socket.io: Socket error for ${socket.id}:`, error);
    });
  });
};

// Enhanced Socket.io emit functions with TanStack Query optimization
const emitDataUpdate = (dataType, data, options = {}) => {
  if (io) {
    const startTime = Date.now();
    const payload = {
      type: dataType,
      data,
      timestamp: Date.now(),
      ...options
    };
    
    // Emit to member room with optimized payload
    io.to('member').emit('data-update', payload);
    const emitTime = Date.now() - startTime;
    
    if (emitTime > 100) {
      console.warn(`Socket.io: Slow data-update emit (${emitTime}ms) for type: ${dataType}`);
    }
    
    console.log(`Socket.io: Emitted data-update to member room. Type: ${dataType}, Time: ${emitTime}ms, Recipients: ${connectionMetrics.rooms.member.size}`);
  }
};

const emitAdminUpdate = (dataType, data, options = {}) => {
  if (io) {
    const startTime = Date.now();
    const payload = {
      type: dataType,
      data,
      timestamp: Date.now(),
      ...options
    };
    
    // Emit to admin room with optimized payload
    io.to('admin').emit('admin-update', payload);
    const emitTime = Date.now() - startTime;
    
    if (emitTime > 100) {
      console.warn(`Socket.io: Slow admin-update emit (${emitTime}ms) for type: ${dataType}`);
    }
    
    console.log(`Socket.io: Emitted admin-update to admin room. Type: ${dataType}, Time: ${emitTime}ms, Recipients: ${connectionMetrics.rooms.admin.size}`);
  }
};

// New function for targeted updates to specific clients
const emitTargetedUpdate = (socketId, eventType, data) => {
  if (io) {
    const startTime = Date.now();
    const payload = {
      type: eventType,
      data,
      timestamp: Date.now()
    };
    
    io.to(socketId).emit('targeted-update', payload);
    const emitTime = Date.now() - startTime;
    
    console.log(`Socket.io: Emitted targeted update to ${socketId}. Type: ${eventType}, Time: ${emitTime}ms`);
  }
};

// New function for cache invalidation events
const emitCacheInvalidation = (queryKeys, room = 'member') => {
  if (io) {
    const startTime = Date.now();
    const payload = {
      type: 'cache-invalidation',
      queryKeys: Array.isArray(queryKeys) ? queryKeys : [queryKeys],
      timestamp: Date.now()
    };
    
    io.to(room).emit('cache-invalidation', payload);
    const emitTime = Date.now() - startTime;
    
    console.log(`Socket.io: Emitted cache invalidation to ${room} room. Keys: ${JSON.stringify(payload.queryKeys)}, Time: ${emitTime}ms`);
  }
};

// Get connection metrics
const getConnectionMetrics = () => {
  return {
    ...connectionMetrics,
    averageConnectionDurationMs: connectionMetrics.averageConnectionDuration,
    averageConnectionDurationMinutes: Math.round(connectionMetrics.averageConnectionDuration / 60000)
  };
};

// Broadcast to all connected clients
const broadcastToAll = (event, data) => {
  if (io) {
    io.emit(event, data);
    console.log(`WebSocket: Broadcasted ${event} to all clients`);
  }
};

// Get active connection count
const getActiveConnectionCount = () => {
  return connectionMetrics.activeConnections;
};

// Check if WebSocket is healthy
const isHealthy = () => {
  return io && connectionMetrics.activeConnections >= 0;
};

export {
  setSocketIO,
  emitDataUpdate,
  emitAdminUpdate,
  emitTargetedUpdate,
  emitCacheInvalidation,
  getConnectionMetrics,
  broadcastToAll,
  getActiveConnectionCount,
  isHealthy
};

