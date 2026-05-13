module.exports = (httpServer) => {
  const { Server } = require("socket.io");
  const io = new Server(httpServer);
  io.on("connection", (socket) => {
    const cookieHeader = socket.request.headers.cookie || "";
    const cookies = Object.fromEntries(
      cookieHeader.split(";").map((c) => {
        const [k, ...v] = c.split("=");
        if (!k) return ["", ""];
        return [k.trim(), decodeURIComponent((v || []).join("=").trim())];
      })
    );
    const user = cookies.username || "anonymous";

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
