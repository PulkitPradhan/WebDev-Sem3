const appEvents = require("../events/eventEmitter");

const initChatSocket = (io) => {
  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on("joinRoom", (payload) => {
      const room = typeof payload === "string" ? payload : payload?.room;
      const username = typeof payload === "object" ? payload?.username : null;

      if (!room) return;

      socket.join(room);
      console.log(`${socket.id} joined room ${room}`);

      io.to(room).emit("roomNotification", {
        type: "join",
        socketId: socket.id,
        username: username || socket.id,
        room,
        message: `${username || socket.id} joined room ${room}`
      });
    });

    socket.on("chatMessage", (data) => {
      const { room, username, message } = data || {};
      if (!room || !message) return;

      console.log(`[${room}] ${username || socket.id}: ${message}`);

      const chatPayload = {
        room,
        username: username || "Anonymous",
        message,
        timestamp: new Date().toISOString()
      };

      io.to(room).emit("message", chatPayload);
      appEvents.emit("chat:message", chatPayload);
    });

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.id}`);
    });
  });
};

module.exports = initChatSocket;
