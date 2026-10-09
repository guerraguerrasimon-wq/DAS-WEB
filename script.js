const body = document.body;
const themeButton = document.querySelector(".theme-toggle");
const themeIcon = document.querySelector(".theme-icon");
const authDialog = document.querySelector(".auth-dialog");
const authForm = document.querySelector("#auth-form");
let authMode = "login";

/* ---------- Tema ---------- */
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

/* ---------- Utilidad: reducir y convertir una imagen para guardarla ---------- */
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

/* ---------- Espacios de imagen (hero y miniaturas) ---------- */
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

  const saved = localStorage.getItem(id);
  if (saved) show(saved);

  slot.addEventListener("click", event => {
    if (event.target.closest(".play-button")) return;
    input.click();
  });

  input.addEventListener("change", async () => {
    const file = input.files[0];
    if (!file) return;
    try {
      const data = await readImage(file);
      show(data);
      try { localStorage.setItem(id, data); }
      catch { alert("La imagen se muestra, pero no cabe en la memoria del navegador y se perderá al recargar."); }
    } catch {
      alert("No se pudo leer esa imagen. Prueba con otro archivo.");
    }
    input.value = "";
  });
});

/* ---------- Sesión y perfil ---------- */
const profileButton = document.querySelector(".profile-button");
const profileMenu = document.querySelector(".profile-menu");
const avatarInput = document.querySelector(".avatar-input");
const avatarImg = document.querySelector(".avatar-img");
const avatarInitials = document.querySelector(".avatar-initials");
const accountActions = document.querySelector(".account-actions");

function getSession() {
  try { return JSON.parse(localStorage.getItem("das-session") || "null"); }
  catch { return null; }
}

function initialsOf(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "◉";
  return (parts[0][0] + (parts[1] ? parts[1][0] : "")).toUpperCase();
}

function renderProfile() {
  const session = getSession();
  const photo = localStorage.getItem("das-avatar");
  accountActions.hidden = !!session;
  accountActions.style.display = session ? "none" : "";
  avatarInitials.textContent = session ? initialsOf(session.name || session.email) : "◉";
  if (session && photo) {
    avatarImg.src = photo;
    avatarImg.hidden = false;
    avatarInitials.hidden = true;
  } else {
    avatarImg.hidden = true;
    avatarInitials.hidden = false;
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
document.addEventListener("click", event => {
  if (!event.target.closest(".profile")) closeProfileMenu();
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape") closeProfileMenu();
});

profileMenu.addEventListener("click", event => {
  const action = event.target.dataset.action;
  if (action === "photo") avatarInput.click();
  if (action === "logout") {
    localStorage.removeItem("das-session");
    closeProfileMenu();
    renderProfile();
  }
});

avatarInput.addEventListener("change", async () => {
  const file = avatarInput.files[0];
  if (!file) return;
  try {
    const data = await readImage(file, 400);
    localStorage.setItem("das-avatar", data);
    renderProfile();
  } catch {
    alert("No se pudo cargar la foto. Prueba con otra imagen.");
  }
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
    localStorage.setItem("das-session", JSON.stringify({ email: account.email, name: account.name }));
    message.textContent = `¡Bienvenido/a, ${account.name}! Sesión de demostración iniciada.`;
    renderProfile();
    setTimeout(() => authDialog.close(), 900);
  } else {
    message.textContent = "No encontramos esa cuenta. Regístrate para probar el acceso.";
  }
});

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
