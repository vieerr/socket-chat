module.exports = (httpServer) => {
  const { Server } = require("socket.io");
  const io = new Server(httpServer);
  io.on("connection", (socket) => {
    const cookie = socket.request.headers.cookie;
    const user = cookie.split("=").pop();

    socket.on("message", (message) => {
      io.emit("message", {
        user,
        message,
        date: new Date().toLocaleTimeString(),
      });
    });

    socket.on("typing", () => {
      socket.broadcast.emit("typing", {
        user,
      });
    });

    socket.on("stopTyping", () => {
      socket.broadcast.emit("stopTyping", {
        user,
      });
    });
  });
};
