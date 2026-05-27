const form = document.querySelector("#form");
const errorMessage = document.querySelector("#error-message");

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const username = document.querySelector("#username").value.trim();

  if (!username) {
    errorMessage.textContent = "Por favor ingresa un nombre de usuario.";
    return;
  }

  document.cookie = `username=${encodeURIComponent(username)}; path=/; SameSite=Strict; max-age=86400`;
  window.location.href = "/";
});
