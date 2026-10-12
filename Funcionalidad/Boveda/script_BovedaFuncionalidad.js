/* Bóveda: contraseñas cifradas en el navegador con una contraseña maestra (AES-GCM + PBKDF2).
   Es una versión local de demostración: cuando exista el backend, la bóveda cifrada se guardará allí. */
const area = document.getElementById("vault-area");
const VAULT_KEY = "das-vault:" + (session ? session.email : "anon");
const SUGGESTED = [
  { id: "facebook", name: "Facebook" },
  { id: "instagram", name: "Instagram" },
  { id: "claude", name: "Claude" },
  { id: "spotify", name: "Spotify" }
];
/* DATOS DE EJEMPLO: sustituir por una fuente real (p. ej. brechas conocidas) cuando se defina. */
const RISK = {
  facebook: [["Phishing dirigido a usuarios", 78], ["Reutilización de contraseñas", 70], ["Exposición de datos personales", 65]],
  instagram: [["Phishing dirigido a usuarios", 72], ["Reutilización de contraseñas", 60], ["Exposición de datos personales", 55]],
  claude: [["Phishing dirigido a usuarios", 35], ["Reutilización de contraseñas", 40], ["Exposición de datos personales", 30]],
  spotify: [["Phishing dirigido a usuarios", 45], ["Reutilización de contraseñas", 55], ["Exposición de datos personales", 40]]
};
const COMMON = ["123456", "password", "contraseña", "qwerty", "abc123", "111111", "iloveyou", "admin", "letmein", "welcome", "colombia", "12345678"];

let vault = loadVault();
let cryptoKey = null;

/* ---------- Utilidades ---------- */
function loadVault() { try { return JSON.parse(store.get(VAULT_KEY) || "null"); } catch { return null; } }
function saveVault() { return store.set(VAULT_KEY, JSON.stringify(vault)); }
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const enc = new TextEncoder();
const dec = new TextDecoder();
const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const hasCrypto = !!(window.crypto && crypto.subtle);

async function deriveKey(master, saltB64) {
  const base = await crypto.subtle.importKey("raw", enc.encode(master), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt: unb64(saltB64), iterations: 250000, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}
async function encryptText(key, text) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(text));
  return { iv: b64(iv), data: b64(ct) };
}
async function decryptText(key, obj) {
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(obj.iv) }, key, unb64(obj.data));
  return dec.decode(pt);
}

function strength(pw) {
  if (!pw) return { level: "", label: "Escribe una contraseña" };
  let classes = 0;
  [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].forEach(r => { if (r.test(pw)) classes++; });
  const lower = pw.toLowerCase();
  const weak = COMMON.some(c => lower.includes(c)) || /(.)\1{3,}/.test(pw);
  let level = "Media";
  if (pw.length < 8 || weak || classes < 2) level = "Baja";
  else if (pw.length >= 12 && classes >= 3) level = "Alta";
  return { level, label: "Seguridad: " + level };
}
function bindMeter(inputEl, meterEl, labelEl) {
  const update = () => {
    const s = strength(inputEl.value);
    meterEl.dataset.level = s.level;
    labelEl.textContent = s.label;
  };
  inputEl.addEventListener("input", update);
  update();
}
const meterHTML = id => `<div class="meter" id="${id}" data-level=""><span></span></div><p class="meter-label" id="${id}-label">Escribe una contraseña</p>`;

function allApps() { return [...SUGGESTED, ...(vault.custom || [])]; }
function appById(id) { return allApps().find(a => a.id === id); }
function levelOf(id) {
  const data = RISK[id];
  if (!data) return null;
  const avg = data.reduce((sum, [, v]) => sum + v, 0) / data.length;
  return avg < 40 ? "Baja" : avg < 65 ? "Media" : "Alta";
}

/* ---------- Vistas ---------- */
function render(html) { area.innerHTML = html; }

function showStart() {
  if (!hasCrypto) {
    render(`<div class="panel vault-card"><span class="kicker">NO DISPONIBLE</span><h2 class="panel-title">Abre la página desde localhost</h2><p>La bóveda usa cifrado del navegador, que solo funciona en una dirección segura (https o localhost). Ábrela con Live Server o desde tu servidor local.</p></div>`);
    return;
  }
  if (!vault) return showCreate();
  if (!cryptoKey) return showLocked();
  if (!vault.apps.length) return showPick();
  showHome();
}

function showCreate() {
  render(`<div class="panel vault-card">
    <span class="kicker">AÚN NO TIENES BÓVEDA</span>
    <h2 class="panel-title">Crea tu bóveda</h2>
    <p class="vault-text">Elige una contraseña maestra. Con ella se cifran todas las contraseñas que guardes aquí.</p>
    <form id="create-form" novalidate>
      <label>Contraseña maestra<input type="password" id="m1" autocomplete="new-password"></label>
      ${meterHTML("m1-meter")}
      <label>Repite la contraseña maestra<input type="password" id="m2" autocomplete="new-password"></label>
      <p class="form-msg" id="msg"></p>
      <button class="button button-red" type="submit">Crear bóveda <span>→</span></button>
    </form>
    <p class="vault-hint">Si olvidas la contraseña maestra no hay forma de recuperar lo guardado.</p>
  </div>`);
  const m1 = document.getElementById("m1");
  bindMeter(m1, document.getElementById("m1-meter"), document.getElementById("m1-meter-label"));
  document.getElementById("create-form").addEventListener("submit", async e => {
    e.preventDefault();
    const msg = document.getElementById("msg");
    const pw = m1.value;
    if (pw !== document.getElementById("m2").value) { msg.textContent = "Las contraseñas no coinciden."; return; }
    if (strength(pw).level === "Baja") { msg.textContent = "La contraseña maestra es muy débil. Usa al menos 8 caracteres combinando letras, números o símbolos."; return; }
    msg.textContent = "Creando bóveda…";
    const salt = b64(crypto.getRandomValues(new Uint8Array(16)));
    const key = await deriveKey(pw, salt);
    vault = { salt, check: await encryptText(key, "das-vault-ok"), apps: [], custom: [], items: {} };
    if (!saveVault()) { vault = null; msg.textContent = "Tu navegador no permite guardar datos (¿modo privado?)."; return; }
    cryptoKey = key;
    showPick();
  });
}

function showLocked() {
  render(`<div class="panel vault-card">
    <span class="kicker">BÓVEDA BLOQUEADA</span>
    <h2 class="panel-title">Desbloquea tu bóveda</h2>
    <form id="unlock-form" novalidate>
      <label>Contraseña maestra<input type="password" id="mu" autocomplete="current-password"></label>
      <p class="form-msg" id="msg"></p>
      <button class="button button-red" type="submit">Desbloquear <span>→</span></button>
    </form>
  </div>`);
  document.getElementById("unlock-form").addEventListener("submit", async e => {
    e.preventDefault();
    const msg = document.getElementById("msg");
    msg.textContent = "Comprobando…";
    try {
      const key = await deriveKey(document.getElementById("mu").value, vault.salt);
      if ((await decryptText(key, vault.check)) !== "das-vault-ok") throw new Error();
      cryptoKey = key;
      showStart();
    } catch { msg.textContent = "Contraseña maestra incorrecta."; }
  });
}

function showPick() {
  const selected = new Set(vault.apps);
  const draw = () => {
    render(`<div class="vault-head"><div><span class="kicker">PASO 2</span><h2 class="panel-title">Elige tus aplicaciones</h2><p class="vault-text">Selecciona las que quieres proteger. Puedes cambiarlas cuando quieras.</p></div></div>
    <p class="suggest-label">Aplicaciones sugeridas</p>
    <div class="app-grid" id="pick-grid">${allApps().map(a => `
      <button type="button" class="app-tile pick" data-id="${esc(a.id)}" aria-pressed="${selected.has(a.id)}">
        <span class="app-logo">${esc(a.name[0].toUpperCase())}</span><strong>${esc(a.name)}</strong><small>${selected.has(a.id) ? "Seleccionada" : "Toca para elegir"}</small>
      </button>`).join("")}</div>
    <form class="custom-add" id="custom-form" novalidate>
      <label class="sr-only" for="custom-name">Otra aplicación</label>
      <input id="custom-name" type="text" maxlength="30" placeholder="Otra aplicación (por ejemplo, Netflix)">
      <button class="button button-outline" type="submit">Añadir <span>+</span></button>
    </form>
    <p class="form-msg" id="msg"></p>
    <button class="button button-red" id="pick-save" type="button">Guardar selección <span>→</span></button>`);
    document.getElementById("pick-grid").addEventListener("click", e => {
      const tile = e.target.closest(".pick");
      if (!tile) return;
      const id = tile.dataset.id;
      selected.has(id) ? selected.delete(id) : selected.add(id);
      draw();
    });
    document.getElementById("custom-form").addEventListener("submit", e => {
      e.preventDefault();
      const name = document.getElementById("custom-name").value.trim();
      if (!name) return;
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "app";
      if (!appById(slug)) { vault.custom = vault.custom || []; vault.custom.push({ id: slug, name }); }
      selected.add(slug);
      draw();
    });
    document.getElementById("pick-save").addEventListener("click", () => {
      const msg = document.getElementById("msg");
      if (!selected.size) { msg.textContent = "Elige al menos una aplicación."; return; }
      const dropped = vault.apps.filter(id => !selected.has(id) && vault.items[id]);
      if (dropped.length && !confirm("Quitaste aplicaciones que tienen una contraseña guardada. Se borrarán esas contraseñas. ¿Continuar?")) return;
      dropped.forEach(id => delete vault.items[id]);
      vault.apps = [...selected];
      saveVault();
      showHome();
    });
  };
  draw();
}

function showHome() {
  const tiles = vault.apps.map(id => {
    const app = appById(id);
    if (!app) return "";
    const lvl = levelOf(id);
    return `<button type="button" class="app-tile open" data-id="${esc(id)}">
      <span class="app-logo">${esc(app.name[0].toUpperCase())}</span><strong>${esc(app.name)}</strong>
      <small>${vault.items[id] ? "Contraseña guardada" : "Sin contraseña"}</small>
      ${lvl ? `<span class="pill" data-level="${lvl}">Vulnerabilidad ${lvl}</span>` : `<span class="pill">Sin datos</span>`}
    </button>`;
  }).join("");
  render(`<div class="vault-head">
      <div><span class="kicker">TU BÓVEDA</span><h2 class="panel-title">Tus aplicaciones</h2></div>
      <div class="vault-actions"><button type="button" class="button button-outline" id="edit-apps">Editar apps <span>✎</span></button><button type="button" class="button button-outline" id="lock">Bloquear <span>●</span></button></div>
    </div>
    <div class="app-grid" id="home-grid">${tiles}</div>`);
  document.getElementById("home-grid").addEventListener("click", e => {
    const tile = e.target.closest(".open");
    if (tile) showApp(tile.dataset.id);
  });
  document.getElementById("edit-apps").addEventListener("click", showPick);
  document.getElementById("lock").addEventListener("click", () => { cryptoKey = null; showStart(); });
}

async function showApp(id) {
  const app = appById(id);
  if (!app) return showHome();
  const data = RISK[id];
  const lvl = levelOf(id);
  let saved = null;
  if (vault.items[id]) { try { saved = JSON.parse(await decryptText(cryptoKey, vault.items[id])); } catch { saved = null; } }

  const stats = data ? `
    <p class="level-big" data-level="${lvl}">${lvl}</p>
    ${data.map(([label, v]) => `<div class="stat"><div class="stat-row"><span>${esc(label)}</span><b>${v}%</b></div><div class="progress"><span style="width:${v}%"></span></div></div>`).join("")}
    <p class="vault-hint">Datos de ejemplo. Se reemplazarán por una fuente real.</p>`
    : `<p class="vault-text">Aún no tenemos datos de vulnerabilidad para esta aplicación.</p>`;

  render(`<button type="button" class="back" id="back">← Volver a mis aplicaciones</button>
    <div class="app-profile panel">
      <span class="app-logo big">${esc(app.name[0].toUpperCase())}</span>
      <div><span class="kicker">PERFIL DE LA APLICACIÓN</span><h2 class="app-name">${esc(app.name)}</h2>
      <p class="vault-text">${saved ? "Tienes una contraseña guardada para esta aplicación." : "Todavía no guardas una contraseña para esta aplicación."}</p></div>
    </div>
    <div class="app-columns">
      <article class="panel"><span class="kicker">ESTADÍSTICAS</span><h3 class="panel-title">Vulnerabilidad de la aplicación</h3>${stats}</article>
      <article class="panel">
        <span class="kicker">CONTRASEÑA</span><h3 class="panel-title">${saved ? "Contraseña guardada" : "Agregar contraseña"}</h3>
        ${saved ? `<div class="saved-box"><p><small>Usuario o correo</small><br><b>${esc(saved.user || "—")}</b></p>
          <p><small>Contraseña</small><br><b id="saved-pw">••••••••••</b></p>
          <div class="vault-actions"><button type="button" class="button button-outline" id="reveal">Mostrar <span>◉</span></button><button type="button" class="button button-outline" id="remove">Eliminar <span>×</span></button></div></div>
          <p class="suggest-label">Cambiar contraseña</p>` : ""}
        <form id="pw-form" novalidate>
          <label>Usuario o correo de la cuenta<input type="text" id="acc-user" autocomplete="off" value="${esc(saved ? saved.user || "" : "")}"></label>
          <label>Contraseña<div class="pw-row"><input type="password" id="acc-pw" autocomplete="new-password"><button type="button" class="button button-outline" id="pw-toggle">Mostrar</button></div></label>
          ${meterHTML("pw-meter")}
          <p class="form-msg" id="msg"></p>
          <button class="button button-red" type="submit">${saved ? "Actualizar contraseña" : "Agregar contraseña"} <span>+</span></button>
        </form>
      </article>
    </div>`);

  document.getElementById("back").addEventListener("click", showHome);
  const pw = document.getElementById("acc-pw");
  bindMeter(pw, document.getElementById("pw-meter"), document.getElementById("pw-meter-label"));
  document.getElementById("pw-toggle").addEventListener("click", e => {
    const show = pw.type === "password";
    pw.type = show ? "text" : "password";
    e.currentTarget.textContent = show ? "Ocultar" : "Mostrar";
  });
  if (saved) {
    let shown = false;
    document.getElementById("reveal").addEventListener("click", e => {
      shown = !shown;
      document.getElementById("saved-pw").textContent = shown ? saved.pw : "••••••••••";
      e.currentTarget.firstChild.textContent = shown ? "Ocultar " : "Mostrar ";
    });
    document.getElementById("remove").addEventListener("click", () => {
      if (!confirm("¿Eliminar la contraseña guardada de " + app.name + "?")) return;
      delete vault.items[id];
      saveVault();
      showApp(id);
    });
  }
  document.getElementById("pw-form").addEventListener("submit", async e => {
    e.preventDefault();
    const msg = document.getElementById("msg");
    const value = pw.value;
    if (!value) { msg.className = "form-msg"; msg.textContent = "Escribe la contraseña que quieres guardar."; return; }
    const user = document.getElementById("acc-user").value.trim();
    // ¿La repites en otra aplicación?
    let reused = null;
    for (const otherId of vault.apps) {
      if (otherId === id || !vault.items[otherId]) continue;
      try {
        const other = JSON.parse(await decryptText(cryptoKey, vault.items[otherId]));
        if (other.pw === value) { reused = appById(otherId); break; }
      } catch {}
    }
    vault.items[id] = await encryptText(cryptoKey, JSON.stringify({ user, pw: value, saved: Date.now() }));
    if (!saveVault()) { msg.className = "form-msg"; msg.textContent = "No se pudo guardar en este navegador."; return; }
    const s = strength(value).level;
    const notes = [];
    if (reused) notes.push(`también la usas en ${reused.name}; usa una distinta para cada cuenta`);
    if (s === "Baja") notes.push("es una contraseña de seguridad Baja");
    await showApp(id);
    const after = document.getElementById("msg");
    after.className = "form-msg" + (notes.length ? "" : " ok");
    after.textContent = notes.length ? "Guardada, pero ojo: " + notes.join(" y ") + "." : "Contraseña guardada y cifrada.";
  });
}

showStart();