const { Server } = require("socket.io");

let io = null;

/**
 * Initialize Socket.IO.
 */
const initializeSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin:
        process.env.CLIENT_URL ||
        "http://localhost:5173",
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log(
      `Socket connected: ${socket.id}`
    );

    /**
     * Frontend sends authenticated user ID.
     *
     * Example:
     * socket.emit("join_user_room", userId)
     */
    socket.on(
      "join_user_room",
      (userId) => {
        if (!userId) {
          return;
        }

        const roomName = `user:${String(
          userId
        )}`;

        socket.join(roomName);

        console.log(
          `Socket ${socket.id} joined ${roomName}`
        );
      }
    );

    socket.on("disconnect", (reason) => {
      console.log(
        `Socket disconnected: ${socket.id} (${reason})`
      );
    });
  });

  return io;
};

/**
 * Get Socket.IO instance.
 */
const getIO = () => {
  if (!io) {
    throw new Error(
      "Socket.IO has not been initialized."
    );
  }

  return io;
};

/**
 * Emit notification to one user.
 */
const emitNotification = (
  userId,
  notification
) => {
  if (!userId || !notification) {
    return;
  }

  const roomName = `user:${String(userId)}`;

  getIO()
    .to(roomName)
    .emit("notification:new", notification);
};

module.exports = {
  initializeSocket,
  getIO,
  emitNotification,
};