const { Server } = require("socket.io");

const MAX_MESSAGE_LENGTH = 500;
const TYPING_BROADCAST_EVENT = "typing";
const STOP_TYPING_EVENT = "stopTyping";

function parseCookies(cookieHeader) {
  return Object.fromEntries(
    (cookieHeader || "").split(";").map((pair) => {
      const [key, ...value] = pair.split("=");
      if (!key?.trim()) return ["", ""];
      return [key.trim(), decodeURIComponent(value.join("=").trim())];
    })
  );
}

function getUserFromSocket(socket) {
  const cookies = parseCookies(socket.request.headers.cookie);
  return cookies.username?.trim() || "anonymous";
}

module.exports = function initRealTimeServer(httpServer) {
  const io = new Server(httpServer);

  io.on("connection", (socket) => {
    const user = getUserFromSocket(socket);

    socket.on("message", (message) => {
      const trimmed = String(message).trim();
      if (!trimmed || trimmed.length > MAX_MESSAGE_LENGTH) return;

      io.emit("message", {
        user,
        message: trimmed,
        date: new Date().toLocaleTimeString(),
      });
    });

    socket.on(TYPING_BROADCAST_EVENT, () => {
      socket.broadcast.emit(TYPING_BROADCAST_EVENT, { user });
    });

    socket.on(STOP_TYPING_EVENT, () => {
      socket.broadcast.emit(STOP_TYPING_EVENT, { user });
    });
  });
};
