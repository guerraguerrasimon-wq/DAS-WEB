/* Script común de la aplicación: sesión, tema, perfil, pantalla de carga y menú móvil. */
const LOGIN_URL = "../presentacion/index_inicio_presentacion.html";
const body = document.body;

/* ---------- Almacenamiento seguro ---------- */
const store = {
  get(key) { try { return localStorage.getItem(key); } catch { return null; } },
  set(key, value) { try { localStorage.setItem(key, value); return true; } catch { return false; } },
  remove(key) { try { localStorage.removeItem(key); } catch {} }
};

/* ---------- Sesión: sin sesión se vuelve al sitio ---------- */
function getSession() {
  try { return JSON.parse(store.get("das-session") || "null"); } catch { return null; }
}
const session = getSession();
if (!session) location.replace(LOGIN_URL);

/* ---------- Tema ---------- */
const themeButton = document.querySelector(".theme-toggle");
const themeIcon = document.querySelector(".theme-icon");
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

/* ---------- Perfil ---------- */
const profileButton = document.querySelector(".profile-button");
const profileMenu = document.querySelector(".profile-menu");
const avatarImg = document.querySelector(".avatar-img");
const avatarInitials = document.querySelector(".avatar-initials");

function initialsOf(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "◉";
  return (parts[0][0] + (parts[1] ? parts[1][0] : "")).toUpperCase();
}
(function renderProfile() {
  const photo = store.get("das-avatar");
  avatarInitials.textContent = session ? initialsOf(session.name || session.email) : "◉";
  if (session && photo) { avatarImg.src = photo; avatarImg.hidden = false; avatarInitials.hidden = true; }
  document.querySelector(".profile-name").textContent = session ? (session.name || session.email) : "";
})();
function closeProfileMenu() {
  profileMenu.hidden = true;
  profileButton.setAttribute("aria-expanded", "false");
}
profileButton.addEventListener("click", event => {
  event.stopPropagation();
  const willOpen = profileMenu.hidden;
  profileMenu.hidden = !willOpen;
  profileButton.setAttribute("aria-expanded", String(willOpen));
});
document.addEventListener("click", event => { if (!event.target.closest(".profile")) closeProfileMenu(); });
document.addEventListener("keydown", event => { if (event.key === "Escape") closeProfileMenu(); });
profileMenu.addEventListener("click", event => {
  const action = event.target.dataset.action;
  if (action === "site") location.href = LOGIN_URL;
  if (action === "logout") { store.remove("das-session"); location.href = LOGIN_URL; }
});

/* ---------- Pantalla de carga (3 segundos, solo tras iniciar sesión) ---------- */
const boot = document.getElementById("boot");
let shouldBoot = false;
try { shouldBoot = sessionStorage.getItem("das-boot") === "1"; } catch {}
if (shouldBoot && session) {
  boot.hidden = false;
  body.classList.add("is-booting");
  try { sessionStorage.removeItem("das-boot"); } catch {}
  setTimeout(() => {
    boot.classList.add("is-done");
    setTimeout(() => { boot.hidden = true; body.classList.remove("is-booting"); }, 400);
  }, 3000);
}

/* ---------- Menú móvil ---------- */
const menuButton = document.querySelector(".menu-toggle");
const mainNav = document.querySelector(".main-nav");
menuButton.addEventListener("click", () => {
  const expanded = menuButton.getAttribute("aria-expanded") === "true";
  menuButton.setAttribute("aria-expanded", String(!expanded));
  menuButton.setAttribute("aria-label", expanded ? "Abrir menú" : "Cerrar menú");
  mainNav.classList.toggle("open", !expanded);
});