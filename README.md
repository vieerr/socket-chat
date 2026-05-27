# ESPEChat — Informe de Refactorización

**Asignatura:** Programación Orientada a Objetos / Desarrollo Web  
**Proyecto:** ESPEChat — Chat en tiempo real con Socket.IO  
**Fecha:** 2026-05-26  
**Tecnologías:** Node.js, Express 5, Socket.IO 4, HTML/CSS/JS vanilla

---

## 1. Descripción del Proyecto

ESPEChat es una aplicación de chat en tiempo real construida sobre Node.js y Socket.IO. Permite a múltiples usuarios unirse con un nombre de usuario, enviar mensajes y ver quién está escribiendo en tiempo real. El presente informe documenta la refactorización realizada sobre el código original, aplicando principios de código limpio (*clean code*) y buenas prácticas de desarrollo de software.

---

## 2. Problemas Identificados en el Código Original

### 2.1 Backend

#### 2.1.1 `src/realTimeServer.js` — `require` dentro de función

**Antes:**
```js
module.exports = (httpServer) => {
  const { Server } = require("socket.io");  // ← require dentro del cuerpo
  const io = new Server(httpServer);
  ...
};
```

**Problema:** Las importaciones de módulos deben declararse en el ámbito superior del archivo. Colocarlas dentro de funciones dificulta el análisis estático, engaña al lector sobre las dependencias del módulo y genera una carga innecesaria en cada invocación.

**Después:**
```js
const { Server } = require("socket.io");  // ← nivel superior

module.exports = function initRealTimeServer(httpServer) {
  const io = new Server(httpServer);
  ...
};
```

---

#### 2.1.2 `src/realTimeServer.js` — Sin validación de mensajes

**Antes:**
```js
socket.on("message", (message) => {
  io.emit("message", { user, message, date: ... });
});
```

**Problema:** Se difundía cualquier valor recibido del cliente sin verificar si era un string, estaba vacío o excedía una longitud razonable. Esto permitía que mensajes vacíos o excesivamente largos se propagaran a todos los clientes.

**Después:**
```js
const MAX_MESSAGE_LENGTH = 500;

socket.on("message", (message) => {
  const trimmed = String(message).trim();
  if (!trimmed || trimmed.length > MAX_MESSAGE_LENGTH) return;
  io.emit("message", { user, message: trimmed, date: ... });
});
```

---

#### 2.1.3 `src/realTimeServer.js` — Parseo de cookies no encapsulado

**Antes:** La lógica de parseo de cookies estaba incrustada directamente en el callback de `connection`, mezclando responsabilidades.

**Después:** Extraída a una función pura con nombre descriptivo:

```js
function parseCookies(cookieHeader) { ... }
function getUserFromSocket(socket) { ... }
```

---

#### 2.1.4 `src/routes/index.js` — Concatenación de rutas con `+`

**Antes:**
```js
const views = path.join(__dirname, "/../views");
router.get("/", isLoggedIn, (req, res) => {
  res.sendFile(views + "/index.html");  // ← concatenación frágil
});
```

**Problema:** La concatenación de rutas con `+` es frágil ante diferencias de plataforma (separador `/` vs `\` en Windows) y dificulta la lectura. El módulo `path` de Node.js existe precisamente para esto.

**Después:**
```js
const VIEWS_DIR = path.join(__dirname, "../views");
router.get("/", requireAuth, (req, res) => {
  res.sendFile(path.join(VIEWS_DIR, "index.html"));
});
```

---

#### 2.1.5 `src/middleware/isLoggedIn.js` — Nombre y validación débil

**Antes:**
```js
module.exports = (req, res, next) => {
  if (req.cookies.username) { next(); }
  else { res.redirect("/register"); }
};
```

**Problema:** El nombre `isLoggedIn` es un adjetivo predicativo; los middlewares de guardia se nombran convencionalmente como verbos imperativos (`requireAuth`, `ensureAuthenticated`). Además, una cookie con valor de espacios en blanco pasaría la guarda.

**Después:**
```js
module.exports = function requireAuth(req, res, next) {
  const username = req.cookies.username?.trim();
  if (username) { next(); }
  else { res.redirect("/register"); }
};
```

---

### 2.2 Frontend JavaScript

#### 2.2.1 `public/js/register.js` — Seguridad y UX de cookie

**Antes:**
```js
if (user != "") {
  document.cookie = `username=${user}`;  // sin path, SameSite ni expiración
  document.location.href = "/";
} else {
  alert("Please enter a username");  // bloquea el hilo de UI
}
```

**Problemas:**
- Operador de igualdad débil (`!=` en lugar de `!==`).
- Cookie sin atributos `path`, `SameSite` ni `max-age`: la cookie solo aplica al path actual y es vulnerable a ataques CSRF en contextos más complejos.
- `alert()` bloquea el hilo del navegador y presenta una experiencia de usuario anticuada.
- No se hace `trim()` al valor: un nombre de solo espacios pasaría la validación.

**Después:**
```js
const username = document.querySelector("#username").value.trim();
if (!username) {
  errorMessage.textContent = "Por favor ingresa un nombre de usuario.";
  return;
}
document.cookie = `username=${encodeURIComponent(username)}; path=/; SameSite=Strict; max-age=86400`;
window.location.href = "/";
```

---

#### 2.2.2 `public/js/script.js` — Estilos inline en JavaScript

**Antes:**
```js
function createAvatar(user) {
  return `<div style="width: 50px; height: 50px; background-color: ${userColors[user]};
    border-radius: 50%; display: flex; align-items: center; justify-content: center;
    color: white; font-weight: bold; font-size: 18px; box-shadow: ...">
    ${userInitials[user]}
  </div>`;
}
```

**Problema:** Mezcla responsabilidades: JavaScript define estructura y estilos visuales. Viola el principio de separación de responsabilidades entre lógica (JS), estructura (HTML) y presentación (CSS). Los estilos son difíciles de mantener o sobreescribir.

**Después (JS):**
```js
function createAvatarHTML(user) {
  const { color, initials } = getAvatarData(user);
  return `<div class="avatar" style="--avatar-color: ${color};">${initials}</div>`;
}
```

**Después (CSS):**
```css
.avatar {
  width: 50px;
  height: 50px;
  background-color: var(--avatar-color);
  border-radius: 50%;
  /* ... */
}
```

El color dinámico se inyecta como variable CSS personalizada (`--avatar-color`), manteniendo toda la presentación estática en la hoja de estilos.

---

#### 2.2.3 `public/js/script.js` — Caches duplicadas

**Antes:**
```js
const userColors = {};
const userInitials = {};
```

**Problema:** Dos estructuras de datos paralelas para representar una sola entidad (el avatar de un usuario). Requieren sincronización manual y ocupan espacio mental innecesario.

**Después:**
```js
const avatarCache = new Map();

function getAvatarData(user) {
  if (!avatarCache.has(user)) {
    avatarCache.set(user, {
      color: hashStringToColor(user),
      initials: getInitials(user),
    });
  }
  return avatarCache.get(user);
}
```

---

#### 2.2.4 `public/js/script.js` — Listeners de foco redundantes

**Antes:**
```js
messageInput.addEventListener("focus", () => {
  messageInput.style.borderColor = "#006633";
});
messageInput.addEventListener("blur", () => {
  messageInput.style.borderColor = "#c6cbd1";
});
```

**Problema:** Este comportamiento ya estaba declarado en CSS mediante `.send-message input:focus { border-color: #006633; }`. Duplicar la lógica en JS crea dos fuentes de verdad para el mismo comportamiento visual.

**Después:** Listeners eliminados. CSS es la única fuente de verdad para el estilo.

---

#### 2.2.5 `public/js/script.js` — `console.log` en código de producción

**Antes:**
```js
socket.on("connect", () => { console.log("Conectado al servidor"); });
socket.on("disconnect", () => { console.log("Desconectado del servidor"); });
```

**Problema:** Los `console.log` de depuración no deben existir en código de producción. Exponen detalles de implementación y ensucian la consola del usuario.

**Después:** Eliminados. El evento `disconnect` conserva su handler para limpiar `typingUsers`.

---

#### 2.2.6 `public/js/script.js` — Números mágicos

**Antes:**
```js
typingTimeout = setTimeout(() => { ... }, 2000);
```

**Después:**
```js
const TYPING_TIMEOUT_MS = 2000;
// ...
typingTimeout = setTimeout(() => { ... }, TYPING_TIMEOUT_MS);
```

---

### 2.3 HTML

#### 2.3.1 Atributo `lang` incorrecto

**Antes:**
```html
<html lang="en">
```

**Problema:** Todo el contenido de la interfaz está en español. El atributo `lang` incorrecto afecta a lectores de pantalla, motores de búsqueda y herramientas de traducción automática.

**Después:**
```html
<html lang="es">
```

#### 2.3.2 Mensaje de error accesible en registro

**Antes:** Los errores de validación se mostraban con `alert()`.

**Después:** Se añade un elemento `<span>` con `role="alert"` que los lectores de pantalla anuncian automáticamente:
```html
<span id="error-message" class="error-message" role="alert"></span>
```

---

### 2.4 CSS

#### 2.4.1 Selector `input` demasiado amplio

**Antes (`style.css`):**
```css
input {
  border: 1px solid #006633;
  outline: none;
  padding: 10px;
  border-radius: 3px;
}
```

**Problema:** Este selector afecta a **todos** los elementos `input` del documento, incluyendo el campo de chat, que tiene sus propios estilos declarados en `.send-message input`. Genera conflictos de especificidad.

**Después:** Selector acotado al contexto de formulario:
```css
.input-group input {
  border: 1px solid #006633;
  /* ... */
}
```

---

## 3. Cambios Estructurales

| Archivo original | Archivo final | Razón |
|---|---|---|
| `src/routes/index.js` | `src/routes/chat.js` | Nombre descriptivo del dominio |
| `src/middleware/isLoggedIn.js` | `src/middleware/auth.js` | Nombre de módulo más conciso y estándar |

---

## 4. Resumen de Mejoras

| Categoría | Problema | Solución |
|---|---|---|
| Modularidad | `require` dentro de función | Importaciones en ámbito superior |
| Seguridad | Sin validación de mensajes | Longitud máxima + trim() en servidor |
| Seguridad | Cookie sin atributos | `path`, `SameSite=Strict`, `max-age` |
| Separación de responsabilidades | Estilos inline en JS | Clase CSS + variable CSS personalizada |
| DRY | Caches duplicadas (`userColors`, `userInitials`) | Un solo `Map` con objeto compuesto |
| DRY | Listeners de foco redundantes con CSS | Eliminados |
| Mantenibilidad | Números mágicos | Constantes con nombre descriptivo |
| Nomenclatura | `isLoggedIn` como middleware | Renombrado a `requireAuth` |
| Construcción de rutas | Concatenación con `+` | `path.join()` |
| Validación | `!= ""` sin trim | `!== ""` tras `trim()` |
| UX | `alert()` para errores | Elemento DOM con `role="alert"` |
| Depuración | `console.log` de producción | Eliminados |
| Accesibilidad | `lang="en"` en contenido español | `lang="es"` |

---

## 5. Estructura Final del Proyecto

```
src/
├── index.js                  # Punto de entrada; configuración de Express
├── realTimeServer.js         # Lógica de Socket.IO
├── middleware/
│   └── auth.js               # Guarda de autenticación
├── routes/
│   └── chat.js               # Rutas HTTP
├── views/
│   ├── index.html            # Interfaz del chat
│   └── register.html         # Formulario de acceso
└── public/
    ├── css/
    │   ├── style.css         # Estilos globales y componentes reutilizables
    │   ├── chat.css          # Estilos del chat (incluye clase .avatar)
    │   └── register.css      # Estilos del formulario de registro
    └── js/
        ├── script.js         # Lógica del cliente de chat
        └── register.js       # Lógica del formulario de registro
```

---

## 6. Ejecución

```bash
npm install
npm start        # nodemon src/index.js
```

Abrir `http://localhost:3000` en el navegador.
