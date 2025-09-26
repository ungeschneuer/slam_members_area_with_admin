// WebSocket service for emitting events
let io = null;

export const setSocketIO = (socketIO) => {
  io = socketIO;
};

export const emitDataUpdate = (dataType, data) => {
  if (io) {
    io.to('member').emit('data-update', { type: dataType, data });
  }
};

export const emitAdminUpdate = (dataType, data) => {
  if (io) {
    io.to('admin').emit('admin-update', { type: dataType, data });
  }
};

