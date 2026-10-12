/* Script común a todas las páginas de presentación:
   tema, espacios de imagen, perfil, acceso (registro/login de demostración) y menú móvil. */
const body = document.body;
const themeButton = document.querySelector(".theme-toggle");
const themeIcon = document.querySelector(".theme-icon");
const authDialog = document.querySelector(".auth-dialog");
const authForm = document.querySelector("#auth-form");
const formMessage = document.querySelector(".form-message");
let authMode = "login";

/* ---------- Almacenamiento seguro (no falla si el navegador lo bloquea) ---------- */
const store = {
  get(key) { try { return localStorage.getItem(key); } catch { return null; } },
  set(key, value) { try { localStorage.setItem(key, value); return true; } catch { return false; } },
  remove(key) { try { localStorage.removeItem(key); } catch {} }
};

/* ---------- Tema ---------- */
if (store.get("das-theme") === "dark") body.classList.add("dark");
updateThemeButton();
themeButton.addEventListener("click", () => {
  body.classList.toggle("dark");
  store.set("das-theme", body.classList.contains("dark") ? "dark" : "light");
  updateThemeButton();
});
function updateThemeButton() {
  const dark = body.classList.contains("dark");
  themeIcon.textContent = dark ? "☀" : "☾";
  themeButton.setAttribute("aria-label", dark ? "Cambiar a modo claro" : "Cambiar a modo oscuro");
  document.querySelector('meta[name="theme-color"]').content = dark ? "#0d0d0d" : "#f3f0e8";
}

/* ---------- Imagen: reducir y convertir para guardarla ---------- */
function readImage(file, maxSize = 1400) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

/* ---------- Espacios de imagen ---------- */
document.querySelectorAll(".img-slot").forEach(slot => {
  const id = "das-img-" + slot.dataset.slot;
  const img = slot.querySelector(".slot-img");
  const empty = slot.querySelector(".slot-empty");
  const edit = slot.querySelector(".slot-edit");
  const input = slot.querySelector('input[type="file"]');

  function show(src) {
    img.src = src;
    img.hidden = false;
    empty.hidden = true;
    edit.hidden = false;
  }

  const saved = store.get(id) || (slot.dataset.slot === "hero-1" ? store.get("das-img-hero") : null);
  if (saved) show(saved);

  slot.addEventListener("click", event => {
    if (event.target.closest(".play-button, .post-link")) return;
    if (slot.dataset.mode === "button" && !event.target.closest(".slot-edit, .slot-empty")) return;
    input.click();
  });

  input.addEventListener("change", async () => {
    const file = input.files[0];
    if (!file) return;
    try {
      const data = await readImage(file);
      show(data);
      if (!store.set(id, data)) alert("La imagen se muestra, pero no cabe en la memoria del navegador y se perderá al recargar.");
    } catch {
      alert("No se pudo leer esa imagen. Prueba con otro archivo.");
    }
    input.value = "";
  });
});

/* ---------- Cuentas de demostración (temporal, hasta tener backend) ---------- */
function getAccounts() {
  try { return JSON.parse(store.get("das-accounts") || "{}"); } catch { return {}; }
}
function getSession() {
  try { return JSON.parse(store.get("das-session") || "null"); } catch { return null; }
}
async function hashPassword(password, email) {
  if (!(window.crypto && crypto.subtle)) return "plain:" + password;
  const bytes = new TextEncoder().encode(email + "::" + password);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return "sha256:" + [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("");
}
// Migra la cuenta de la versión anterior, si existía.
(function migrateLegacy() {
  const legacy = store.get("das-demo-account");
  if (!legacy || Object.keys(getAccounts()).length) return;
  try {
    const a = JSON.parse(legacy);
    store.set("das-accounts", JSON.stringify({ [a.email]: { name: a.name, hash: "plain:" + a.password } }));
  } catch {}
})();

function say(text) { formMessage.textContent = text; }

authForm.noValidate = true;
authForm.addEventListener("submit", async event => {
  event.preventDefault();
  const data = new FormData(authForm);
  const email = String(data.get("email")).trim().toLowerCase();
  const password = String(data.get("password"));
  const name = String(data.get("name") || "").trim();

  if (!/^\S+@\S+\.\S+$/.test(email)) return say("Escribe un correo válido, por ejemplo tu@correo.com.");
  if (password.length < 8) return say("La contraseña debe tener al menos 8 caracteres.");
  const accounts = getAccounts();

  if (authMode === "register") {
    if (name.length < 2) return say("Escribe tu nombre y apellido.");
    if (accounts[email]) return say("Ese correo ya tiene una cuenta. Inicia sesión.");
    accounts[email] = { name, hash: await hashPassword(password, email) };
    if (!store.set("das-accounts", JSON.stringify(accounts))) {
      return say("Tu navegador no permite guardar la cuenta (¿modo privado?). Prueba en una ventana normal.");
    }
    store.set("das-session", JSON.stringify({ email, name }));
    say(`¡Cuenta creada! Bienvenido/a, ${name}.`);
    authForm.reset();
    renderProfile();
    setTimeout(goToApp, 900);
    return;
  }

  const account = accounts[email];
  if (account && account.hash === await hashPassword(password, email)) {
    store.set("das-session", JSON.stringify({ email, name: account.name }));
    say(`¡Bienvenido/a, ${account.name}!`);
    authForm.reset();
    renderProfile();
    setTimeout(goToApp, 900);
  } else {
    say("Correo o contraseña incorrectos. Si no tienes cuenta, regístrate.");
  }
});

/* ---------- Ir a la aplicación (con pantalla de carga) ---------- */
const APP_URL = "../funcionalidad/index_links_funcionalidad.html";
function goToApp(withBoot = true) {
  if (withBoot) { try { sessionStorage.setItem("das-boot", "1"); } catch {} }
  location.href = APP_URL;
}

/* ---------- Perfil ---------- */
const profileButton = document.querySelector(".profile-button");
const profileMenu = document.querySelector(".profile-menu");
const avatarInput = document.querySelector(".avatar-input");
const avatarImg = document.querySelector(".avatar-img");
const avatarInitials = document.querySelector(".avatar-initials");
const accountActions = document.querySelector(".account-actions");

function initialsOf(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "◉";
  return (parts[0][0] + (parts[1] ? parts[1][0] : "")).toUpperCase();
}
function renderProfile() {
  const session = getSession();
  const photo = store.get("das-avatar");
  accountActions.style.display = session ? "none" : "";
  avatarInitials.textContent = session ? initialsOf(session.name || session.email) : "◉";
  if (session && photo) {
    avatarImg.src = photo; avatarImg.hidden = false; avatarInitials.hidden = true;
  } else {
    avatarImg.hidden = true; avatarInitials.hidden = false;
  }
  document.querySelector(".profile-name").textContent = session ? (session.name || session.email) : "";
  profileButton.setAttribute("aria-label", session ? "Abrir menú de perfil" : "Abrir acceso de perfil");
}
function closeProfileMenu() {
  profileMenu.hidden = true;
  profileButton.setAttribute("aria-expanded", "false");
}
profileButton.addEventListener("click", event => {
  event.stopPropagation();
  if (!getSession()) { openAuth("login"); return; }
  const willOpen = profileMenu.hidden;
  profileMenu.hidden = !willOpen;
  profileButton.setAttribute("aria-expanded", String(willOpen));
});
document.addEventListener("click", event => { if (!event.target.closest(".profile")) closeProfileMenu(); });
document.addEventListener("keydown", event => { if (event.key === "Escape") closeProfileMenu(); });
profileMenu.addEventListener("click", event => {
  const action = event.target.dataset.action;
  if (action === "photo") avatarInput.click();
  if (action === "app") goToApp(false);
  if (action === "logout") { store.remove("das-session"); closeProfileMenu(); renderProfile(); }
});
avatarInput.addEventListener("change", async () => {
  const file = avatarInput.files[0];
  if (!file) return;
  try {
    store.set("das-avatar", await readImage(file, 400));
    renderProfile();
  } catch { alert("No se pudo cargar la foto. Prueba con otra imagen."); }
  avatarInput.value = "";
  closeProfileMenu();
});
renderProfile();

/* ---------- Ventana de acceso ---------- */
function openAuth(mode) {
  authMode = mode;
  const registering = mode === "register";
  document.querySelector("#auth-title").textContent = registering ? "Crea tu cuenta" : "Inicia sesión";
  document.querySelector("#auth-kicker").textContent = registering ? "ACTIVA TU DEFENSA" : "TU SEGURIDAD EMPIEZA AQUÍ";
  document.querySelector(".auth-description").textContent = registering ? "Regístrate para empezar a navegar con más criterio." : "Continúa con tu cuenta DAS.";
  document.querySelector(".name-field").hidden = !registering;
  document.querySelector('[name="password"]').autocomplete = registering ? "new-password" : "current-password";
  document.querySelector(".submit-button").innerHTML = registering ? 'Crear cuenta <span>↗</span>' : 'Entrar <span>↗</span>';
  document.querySelector(".auth-switch").hidden = registering;
  document.querySelector(".register-switch").hidden = !registering;
  say("");
  if (!authDialog.open) authDialog.showModal();
}
document.querySelectorAll("[data-auth]").forEach(button => {
  button.addEventListener("click", () => openAuth(button.dataset.auth));
});
document.querySelector(".dialog-close").addEventListener("click", () => authDialog.close());
authDialog.addEventListener("click", event => { if (event.target === authDialog) authDialog.close(); });

/* ---------- Menú móvil ---------- */
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