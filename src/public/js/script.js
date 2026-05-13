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
    .map(word => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// Función para crear un avatar con iniciales
function createAvatar(user) {
  if (!userColors[user]) {
    userColors[user] = hashStringToColor(user);
    userInitials[user] = getInitials(user);
  }
  return `<div style="width: 50px; height: 50px; background-color: ${userColors[user]}; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 18px;">${userInitials[user]}</div>`;
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
    }, 2000); // Si no escribe por 2 segundos, se considera que dejó de escribir
  }
});

// Escuchar mensajes
socket.on("message", ({ user, message, date }) => {
  const msg = document.createRange().createContextualFragment(`
    <div class="message">
      <div class="image-container">
        ${createAvatar(user)}
      </div>
      <div class="message-body">
        <div class="user-info">
          <span class="username">${user}</span>
          <span class="time">${date}</span>
          <p>
            ${message}
          </p>
        </div>
      </div>
    </div>
  `);
  allMessages.append(msg);
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
    const users = Array.from(typingUsers).join(", ");
    typingIndicator.innerHTML = `<strong>${users}</strong> están escribiendo<span class="typing-dots"><span>.</span><span>.</span><span>.</span></span>`;
  }
}
