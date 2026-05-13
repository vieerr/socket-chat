const socket = io();

const send = document.querySelector("#send-message");
const allMessages = document.querySelector("#all-messages");
const messageInput = document.querySelector("#message");
const typingIndicator = document.querySelector("#typing-indicator");

let typingTimeout;
let isTyping = false;
const typingUsers = new Set();
const userColors = {};
const userInitials = {};

function getCurrentUser() {
  const cookieUser = document.cookie
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith("username="));

  if (!cookieUser) return "";
  return decodeURIComponent(cookieUser.split("=")[1] || "");
}

const currentUser = getCurrentUser();

// Función para generar un color único basado en el nombre
function hashStringToColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = hash % 360;
  return `hsl(${hue}, 70%, 50%)`;
}

// Función para generar iniciales
function getInitials(name) {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function escapeHTML(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// Función para crear un avatar con iniciales
function createAvatar(user) {
  if (!userColors[user]) {
    userColors[user] = hashStringToColor(user);
    userInitials[user] = getInitials(user);
  }
  return `<div style="width: 50px; height: 50px; background-color: ${userColors[user]}; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 18px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15); transition: all 0.3s ease;">${userInitials[user]}</div>`;
}

// Enviar mensaje
send.addEventListener("click", () => {
  const message = messageInput.value;
  if (message.trim()) {
    socket.emit("message", message);
    messageInput.value = "";
    isTyping = false;
    clearTimeout(typingTimeout);
    socket.emit("stopTyping");
    messageInput.focus();
  }
});

// Enviar mensaje con Enter
messageInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    send.click();
  }
});

// Event listeners para detectar cuando el usuario está escribiendo
messageInput.addEventListener("input", () => {
  if (messageInput.value.trim()) {
    if (!isTyping) {
      isTyping = true;
      socket.emit("typing");
    }

    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      isTyping = false;
      socket.emit("stopTyping");
    }, 2000);
  }
});

// Escuchar mensajes
socket.on("message", ({ user, message, date }) => {
  const isOwn = user === currentUser;
  const safeMessage = escapeHTML(message);

  const avatarHtml = isOwn ? "" : createAvatar(user);
  const msg = document.createRange().createContextualFragment(`
    <div class="message ${isOwn ? "own" : "other"}">
      <div class="image-container">
        ${avatarHtml}
      </div>
      <div class="message-body">
        <div class="user-info">
          <span class="username">${user}</span>
          <span class="time">${date}</span>
        </div>
        <p>${safeMessage}</p>
      </div>
    </div>
  `);
  allMessages.append(msg);
  allMessages.scrollTop = allMessages.scrollHeight;
});

// Escuchar evento de usuario escribiendo
socket.on("typing", ({ user }) => {
  typingUsers.add(user);
  updateTypingIndicator();
});

// Escuchar evento de usuario dejó de escribir
socket.on("stopTyping", ({ user }) => {
  typingUsers.delete(user);
  updateTypingIndicator();
});

// Actualizar el indicador de escritura
function updateTypingIndicator() {
  if (typingUsers.size === 0) {
    typingIndicator.innerHTML = "";
  } else if (typingUsers.size === 1) {
    const user = Array.from(typingUsers)[0];
    typingIndicator.innerHTML = `<strong>${user}</strong> está escribiendo<span class="typing-dots"><span>.</span><span>.</span><span>.</span></span>`;
  } else {
    const users = Array.from(typingUsers).slice(0, 2).join(", ");
    const extra = typingUsers.size > 2 ? ` +${typingUsers.size - 2}` : "";
    typingIndicator.innerHTML = `<strong>${users}${extra}</strong> están escribiendo<span class="typing-dots"><span>.</span><span>.</span><span>.</span></span>`;
  }
}

// Detectar conexión
socket.on("connect", () => {
  console.log("Conectado al servidor");
});

// Detectar desconexión
socket.on("disconnect", () => {
  console.log("Desconectado del servidor");
  typingUsers.clear();
  updateTypingIndicator();
});

// Efecto de entrada en foco
messageInput.addEventListener("focus", () => {
  messageInput.style.borderColor = "#006633";
});

messageInput.addEventListener("blur", () => {
  messageInput.style.borderColor = "#c6cbd1";
});
