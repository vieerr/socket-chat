const socket = io();

const sendButton = document.querySelector("#send-message");
const messagesContainer = document.querySelector("#all-messages");
const messageInput = document.querySelector("#message");
const typingIndicator = document.querySelector("#typing-indicator");

const TYPING_TIMEOUT_MS = 2000;

let typingTimeout;
let isTyping = false;
const typingUsers = new Set();
const avatarCache = new Map();

function getCurrentUser() {
  const entry = document.cookie
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith("username="));
  return entry ? decodeURIComponent(entry.split("=")[1] || "") : "";
}

const currentUser = getCurrentUser();

function hashStringToColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return `hsl(${Math.abs(hash) % 360}, 70%, 50%)`;
}

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

function getAvatarData(user) {
  if (!avatarCache.has(user)) {
    avatarCache.set(user, {
      color: hashStringToColor(user),
      initials: getInitials(user),
    });
  }
  return avatarCache.get(user);
}

function createAvatarHTML(user) {
  const { color, initials } = getAvatarData(user);
  return `<div class="avatar" style="--avatar-color: ${color};">${initials}</div>`;
}

function sendMessage() {
  const message = messageInput.value.trim();
  if (!message) return;

  socket.emit("message", message);
  messageInput.value = "";
  isTyping = false;
  clearTimeout(typingTimeout);
  socket.emit("stopTyping");
  messageInput.focus();
}

sendButton.addEventListener("click", sendMessage);

messageInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

messageInput.addEventListener("input", () => {
  if (!messageInput.value.trim()) return;

  if (!isTyping) {
    isTyping = true;
    socket.emit("typing");
  }

  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    isTyping = false;
    socket.emit("stopTyping");
  }, TYPING_TIMEOUT_MS);
});

socket.on("message", ({ user, message, date }) => {
  const isOwn = user === currentUser;
  const safeMessage = escapeHTML(message);
  const avatarHtml = isOwn ? "" : createAvatarHTML(user);

  const fragment = document.createRange().createContextualFragment(`
    <div class="message ${isOwn ? "own" : "other"}">
      <div class="image-container">${avatarHtml}</div>
      <div class="message-body">
        <div class="user-info">
          <span class="username">${escapeHTML(user)}</span>
          <span class="time">${date}</span>
        </div>
        <p>${safeMessage}</p>
      </div>
    </div>
  `);

  messagesContainer.append(fragment);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
});

socket.on("typing", ({ user }) => {
  typingUsers.add(user);
  updateTypingIndicator();
});

socket.on("stopTyping", ({ user }) => {
  typingUsers.delete(user);
  updateTypingIndicator();
});

socket.on("disconnect", () => {
  typingUsers.clear();
  updateTypingIndicator();
});

function updateTypingIndicator() {
  if (typingUsers.size === 0) {
    typingIndicator.innerHTML = "";
    return;
  }

  const users = Array.from(typingUsers);
  const displayed = users.slice(0, 2).map(escapeHTML).join(", ");
  const extra = users.length > 2 ? ` +${users.length - 2}` : "";
  const verb = users.length === 1 ? "está escribiendo" : "están escribiendo";

  typingIndicator.innerHTML = `<strong>${displayed}${extra}</strong> ${verb}<span class="typing-dots"><span>.</span><span>.</span><span>.</span></span>`;
}
