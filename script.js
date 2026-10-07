const body = document.body;
const themeButton = document.querySelector(".theme-toggle");
const themeIcon = document.querySelector(".theme-icon");
const authDialog = document.querySelector(".auth-dialog");
const authForm = document.querySelector("#auth-form");
let authMode = "login";

// Recuerda el tema elegido en este navegador.
const savedTheme = localStorage.getItem("das-theme");
if (savedTheme === "dark") body.classList.add("dark");
updateThemeButton();

themeButton.addEventListener("click", () => {
  body.classList.toggle("dark");
  localStorage.setItem("das-theme", body.classList.contains("dark") ? "dark" : "light");
  updateThemeButton();
});

function updateThemeButton() {
  const dark = body.classList.contains("dark");
  themeIcon.textContent = dark ? "☀" : "☾";
  themeButton.setAttribute("aria-label", dark ? "Cambiar a modo claro" : "Cambiar a modo oscuro");
  document.querySelector('meta[name="theme-color"]').content = dark ? "#0d0d0d" : "#f3f0e8";
}

function openAuth(mode) {
  authMode = mode;
  const registering = mode === "register";
  document.querySelector("#auth-title").textContent = registering ? "Crea tu cuenta" : "Inicia sesión";
  document.querySelector("#auth-kicker").textContent = registering ? "ACTIVA TU DEFENSA" : "TU SEGURIDAD EMPIEZA AQUÍ";
  document.querySelector(".auth-description").textContent = registering ? "Regístrate para empezar a navegar con más criterio." : "Continúa con tu cuenta DAS.";
  document.querySelector(".name-field").hidden = !registering;
  document.querySelector('[name="name"]').required = registering;
  document.querySelector('[name="password"]').autocomplete = registering ? "new-password" : "current-password";
  document.querySelector(".submit-button").innerHTML = registering ? 'Crear cuenta <span>↗</span>' : 'Entrar <span>↗</span>';
  document.querySelector(".auth-switch").hidden = registering;
  document.querySelector(".register-switch").hidden = !registering;
  document.querySelector(".form-message").textContent = "";
  if (!authDialog.open) authDialog.showModal();
}

document.querySelectorAll("[data-auth]").forEach(button => {
  button.addEventListener("click", () => openAuth(button.dataset.auth));
});
document.querySelector(".dialog-close").addEventListener("click", () => authDialog.close());
authDialog.addEventListener("click", event => {
  if (event.target === authDialog) authDialog.close();
});

authForm.addEventListener("submit", event => {
  event.preventDefault();
  const data = new FormData(authForm);
  const email = String(data.get("email")).trim().toLowerCase();
  const password = String(data.get("password"));
  const message = document.querySelector(".form-message");

  if (authMode === "register") {
    const account = { email, password, name: String(data.get("name")).trim() };
    localStorage.setItem("das-demo-account", JSON.stringify(account));
    message.textContent = "Cuenta de demostración creada. Ya puedes iniciar sesión.";
    authForm.reset();
    return;
  }

  const account = JSON.parse(localStorage.getItem("das-demo-account") || "null");
  if (account && account.email === email && account.password === password) {
    message.textContent = `¡Bienvenido/a, ${account.name}! Sesión de demostración iniciada.`;
  } else {
    message.textContent = "No encontramos esa cuenta. Regístrate para probar el acceso.";
  }
});

const menuButton = document.querySelector(".menu-toggle");
const mainNav = document.querySelector(".main-nav");
menuButton.addEventListener("click", () => {
  const expanded = menuButton.getAttribute("aria-expanded") === "true";
  menuButton.setAttribute("aria-expanded", String(!expanded));
  menuButton.setAttribute("aria-label", expanded ? "Abrir menú" : "Cerrar menú");
  mainNav.classList.toggle("open", !expanded);
});
mainNav.querySelectorAll("a").forEach(link => link.addEventListener("click", () => {
  mainNav.classList.remove("open");
  menuButton.setAttribute("aria-expanded", "false");
}));
