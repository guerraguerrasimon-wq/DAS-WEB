/* Escaneo de links: análisis heurístico + explicación del Profe DAS.
   Es un análisis preliminar basado en el texto del link; no abre el sitio.
   Un servicio real (Safe Browsing, VirusTotal) se conectará desde el backend. */

/* ---------- Datos ---------- */
const BRANDS = [
  { name: "Google", token: "google", domains: ["google.com", "gmail.com", "youtube.com", "google.com.co"], what: "ofrece el buscador, el correo y YouTube" },
  { name: "Facebook", token: "facebook", domains: ["facebook.com", "fb.com"], what: "es la red social de Meta" },
  { name: "Instagram", token: "instagram", domains: ["instagram.com"], what: "es la red social de fotos de Meta" },
  { name: "WhatsApp", token: "whatsapp", domains: ["whatsapp.com", "wa.me"], what: "es la app de mensajería de Meta" },
  { name: "Microsoft", token: "microsoft", domains: ["microsoft.com", "live.com", "office.com", "outlook.com"], what: "ofrece Windows, Office y Outlook" },
  { name: "Apple", token: "apple", domains: ["apple.com", "icloud.com"], what: "ofrece iPhone, iCloud y su tienda" },
  { name: "Amazon", token: "amazon", domains: ["amazon.com"], what: "es una tienda en línea" },
  { name: "Netflix", token: "netflix", domains: ["netflix.com"], what: "ofrece series y películas por suscripción" },
  { name: "Spotify", token: "spotify", domains: ["spotify.com"], what: "ofrece música por suscripción" },
  { name: "PayPal", token: "paypal", domains: ["paypal.com"], what: "gestiona pagos en línea" },
  { name: "Bancolombia", token: "bancolombia", domains: ["bancolombia.com", "grupobancolombia.com"], what: "es un banco" },
  { name: "Nequi", token: "nequi", domains: ["nequi.com.co", "nequi.com"], what: "es una billetera digital" },
  { name: "Mercado Libre", token: "mercadolibre", domains: ["mercadolibre.com", "mercadolibre.com.co", "mercadopago.com"], what: "es una tienda y plataforma de pagos" },
  { name: "Claude (Anthropic)", token: "claude", domains: ["claude.ai", "anthropic.com"], what: "ofrece el asistente de IA Claude" },
  { name: "GitHub", token: "github", domains: ["github.com"], what: "aloja código de programación" },
  { name: "SENA", token: null, domains: ["sena.edu.co"], what: "es la institución de formación nacional" }
];
const SECOND_LEVEL = new Set(["com.co", "edu.co", "gov.co", "org.co", "net.co", "co.uk", "com.mx", "com.ar", "com.br", "com.pe"]);
const SHORTENERS = ["bit.ly", "tinyurl.com", "t.co", "goo.gl", "is.gd", "cutt.ly", "ow.ly", "rebrand.ly", "shorturl.at", "tiny.cc"];
const RISKY_TLDS = ["zip", "xyz", "top", "tk", "ml", "ga", "cf", "gq", "click", "work", "country", "support", "loan", "icu"];
const CREDENTIAL_WORDS = ["login", "signin", "verify", "verifica", "password", "clave", "secure", "segur", "account", "cuenta", "update", "actualiza", "confirm", "suspend", "bloquead", "wallet", "bank", "banco"];
const MONEY_WORDS = ["premio", "prize", "gratis", "free", "gana", "winner", "claim", "bonus", "pago", "regalo", "sorteo"];
const DOWNLOAD_EXT = [".exe", ".apk", ".scr", ".bat", ".msi", ".zip", ".rar", ".jar"];

/* ---------- Análisis ---------- */
function parseInput(raw) {
  const text = String(raw || "").trim();
  if (!text) return { error: "Pega un link para analizar." };
  if (/\s/.test(text)) return { error: "El link no debe tener espacios." };
  let assumed = false;
  let full = text;
  if (!/^https?:\/\//i.test(text)) {
    if (/^(javascript|data|file|vbscript|blob):/i.test(text) || /^[a-z][a-z0-9+.-]*:\/\//i.test(text)) {
      return { error: "Solo se pueden analizar links que empiecen por http o https." };
    }
    full = "https://" + text;
    assumed = true;
  }
  let url;
  try { url = new URL(full); } catch { return { error: "Eso no parece un link válido." }; }
  const host = url.hostname.toLowerCase();
  if (!host.includes(".") && !host.startsWith("[")) return { error: "Eso no parece un link válido." };
  return { url, assumed, original: text };
}

function registeredDomain(host) {
  const labels = host.split(".");
  if (labels.length <= 2) return host;
  const lastTwo = labels.slice(-2).join(".");
  return SECOND_LEVEL.has(lastTwo) ? labels.slice(-3).join(".") : lastTwo;
}
function normalizeLeet(text) {
  return text.replace(/0/g, "o").replace(/1/g, "l").replace(/3/g, "e").replace(/4/g, "a").replace(/5/g, "s");
}
function containsAny(text, words) { return words.filter(word => text.includes(word)); }

function analyze({ url, assumed }) {
  const host = url.hostname.toLowerCase();
  const reg = registeredDomain(host);
  const full = (url.pathname + url.search).toLowerCase();
  const labelsCount = host.split(".").length;
  const findings = [];
  let points = 0;
  const add = (status, label, detail, pts = 0) => { findings.push({ status, label, detail }); points += pts; };

  const official = BRANDS.find(b => b.domains.includes(reg));
  const normalizedHost = normalizeLeet(host);
  const lookalike = !official ? BRANDS.find(b => b.token && normalizedHost.includes(b.token)) : null;
  const shortener = SHORTENERS.includes(reg);
  const isIP = /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.startsWith("[");

  // Protocolo
  if (url.protocol === "https:") {
    add(assumed ? "info" : "ok", "Conexión cifrada", assumed ? "No escribiste el protocolo; se asumió https." : "Usa https, la conexión viaja cifrada.");
  } else {
    add("warn", "Sin cifrado", "Usa http: lo que escribas podría verse en el camino.", 1);
  }
  // Dominio
  if (isIP) add("bad", "Dirección numérica", "Usa una dirección IP en lugar de un nombre de dominio, algo poco común en sitios legítimos.", 3);
  else add("ok", "Dominio con nombre", `El destino es ${reg}.`);
  if (url.username || url.password || url.href.includes("@")) add("bad", "Usa @ en el link", "Lo que va antes de la @ se usa para disfrazar el destino real.", 3);
  if (host.includes("xn--") || /[^\x00-\x7f]/.test(host)) add("bad", "Caracteres que imitan letras", "El dominio usa caracteres especiales que pueden parecerse a letras normales.", 3);
  if (shortener) add("warn", "Link acortado", "No se ve el destino final sin abrirlo.", 2);
  const tld = host.split(".").pop();
  if (RISKY_TLDS.includes(tld)) add("warn", "Terminación poco habitual", `El dominio termina en .${tld}, muy usada en sitios de baja reputación.`, 1);
  if (!isIP && labelsCount > 4) add("warn", "Demasiados subdominios", "Tantos niveles antes del dominio suelen usarse para confundir.", 1);
  if ((host.match(/-/g) || []).length >= 3) add("warn", "Muchos guiones", "Los dominios con muchos guiones suelen imitar a otros.", 1);
  if (url.port && !["80", "443"].includes(url.port)) add("warn", "Puerto inusual", `Usa el puerto ${url.port}, poco común en sitios normales.`, 1);

  // Suplantación
  if (lookalike) add("bad", "Parece imitar a una marca", `El nombre recuerda a ${lookalike.name}, pero el dominio real no es el suyo.`, 4);
  else if (official) add("ok", "Dominio oficial reconocido", `Coincide con un dominio conocido de ${official.name}.`);
  else add("info", "Marca no reconocida", "No coincide con ninguna marca conocida de nuestra lista.");

  // Palabras de riesgo (no se penalizan en dominios oficiales)
  const credential = containsAny(host + full, CREDENTIAL_WORDS);
  const money = containsAny(host + full, MONEY_WORDS);
  const riskyWords = [...new Set([...credential, ...money])];
  if (!official && riskyWords.length >= 2) add("bad", "Palabras de presión o de acceso", `Aparecen términos como «${riskyWords.slice(0, 3).join("», «")}».`, 2);
  else if (!official && riskyWords.length === 1) add("warn", "Palabra sensible en el link", `Aparece «${riskyWords[0]}», típica de páginas que piden datos.`, 1);
  else add("ok", "Sin palabras de presión", "No hay términos sospechosos en el link.");

  // Estructura
  if (url.href.length > 100) add("warn", "Link muy largo", "Los links larguísimos pueden esconder el destino.", 1);
  const ext = DOWNLOAD_EXT.find(e => url.pathname.toLowerCase().endsWith(e));
  if (ext) add("bad", "Apunta a una descarga", `El link termina en ${ext}, un tipo de archivo que puede ejecutar programas.`, 2);

  let level = "ok";
  if (lookalike || points >= 4) level = "bad";
  else if (points >= 2) level = "warn";

  return { host, reg, official, lookalike, shortener, isIP, credential, money, ext, findings, points, level };
}

const LEVELS = {
  ok: { title: "Parece seguro", note: "No encontramos señales de riesgo en el link. Aun así, esto no garantiza que el contenido del sitio sea confiable." },
  warn: { title: "Precaución", note: "Hay señales que merecen desconfianza. Si no esperabas este link, lo mejor es no abrirlo." },
  bad: { title: "No es seguro", note: "El link reúne señales claras de riesgo. No lo abras ni escribas datos en él." }
};

function explain(a) {
  const messages = [
    "¡Hola! ¿Cómo estás? Soy el Profe DAS y te voy a explicar este link por partes.",
    `Primero, el destino: este link lleva a «${a.host}».`
  ];
  if (a.official) messages.push(`Ese dominio pertenece a ${a.official.name}, que ${a.official.what}.`);
  else if (a.lookalike) messages.push(`Ojo con esto: el nombre se parece al de ${a.lookalike.name}, pero el dominio real no es el suyo. Así es como se hacen pasar por una empresa conocida.`);
  else if (a.shortener) messages.push("Es un link acortado, así que no se ve la empresa ni el destino final hasta abrirlo.");
  else if (a.isIP) messages.push("No tiene un nombre de empresa: apunta a una dirección numérica, algo raro en sitios legítimos.");
  else messages.push("No reconozco la empresa detrás de este dominio. Eso no significa que sea malo, pero no hay una marca conocida que lo respalde.");

  if (a.ext) messages.push(`Lo que busca: este link apunta a un archivo ${a.ext}. Eso es una descarga, y es una forma común de instalar programas dañinos.`);
  else if (!a.official && a.credential.length) messages.push("Lo que busca: por su forma, parece pedirte que inicies sesión o confirmes datos. Es lo que hacen las páginas de phishing: que escribas tu contraseña.");
  else if (!a.official && a.money.length) messages.push("Lo que busca: menciona premios o pagos. Es un gancho clásico para que hagas clic con prisa.");
  else messages.push("Lo que busca: en el texto del link no veo señales de que quiera robarte datos o hacerte descargar algo.");

  const n = a.findings.filter(f => f.status === "bad" || f.status === "warn").length;
  messages.push(`Mi evaluación: ${LEVELS[a.level].title.toLowerCase()}. ${n ? `Encontré ${n} ${n === 1 ? "señal" : "señales"} para tener en cuenta.` : "No encontré señales de riesgo."}`);
  if (a.level === "ok") messages.push("Igual, recuerda: yo solo reviso el link, no el contenido de la página. Si te pide datos que no esperabas, desconfía.");
  else if (a.level === "warn") messages.push("Mi consejo: no escribas datos ahí. Si crees que es real, entra escribiendo tú mismo la dirección oficial.");
  else messages.push("Mi consejo: no lo abras. Si ya entraste, mira la caja «Si ya entraste» y descarga la guía de pasos.");
  return messages;
}

/* ---------- Interfaz ---------- */
const form = document.getElementById("scan-form");
const input = document.getElementById("scan-url");
const submit = document.getElementById("scan-submit");
const errorBox = document.getElementById("scan-error");
const area = document.getElementById("scan-area");
const statusBox = document.getElementById("scan-status");
const results = document.getElementById("results");
const stageKicker = document.getElementById("stage-kicker");
const stageTitle = document.getElementById("stage-title");
const stageDesc = document.getElementById("stage-desc");
const stageBar = document.getElementById("stage-bar");
const checkList = document.getElementById("check-list");
const botLog = document.getElementById("bot-log");
const replay = document.getElementById("bot-replay");
const CHECKS = ["Protocolo y cifrado", "Dominio y dirección", "Estructura del link", "Palabras de riesgo", "Suplantación de marcas"];
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
let running = false;
let botRun = 0;
let lastMessages = [];

async function runStage(kicker, title, desc, duration, checks) {
  stageKicker.textContent = kicker;
  stageTitle.textContent = title;
  stageDesc.textContent = desc;
  checkList.innerHTML = "";
  const items = checks.map(text => {
    const li = document.createElement("li");
    li.textContent = text;
    checkList.appendChild(li);
    return li;
  });
  stageBar.style.transition = "none";
  stageBar.style.width = "0%";
  void stageBar.offsetWidth;
  stageBar.style.transition = `width ${duration}ms linear`;
  stageBar.style.width = "100%";
  const step = duration / (items.length + 1);
  for (const li of items) { await sleep(step); li.classList.add("done"); }
  await sleep(step);
}

function renderResults(a) {
  const level = LEVELS[a.level];
  const verdict = document.getElementById("verdict");
  verdict.dataset.level = a.level;
  document.getElementById("verdict-title").textContent = level.title;
  document.getElementById("verdict-host").textContent = "Dominio analizado: " + a.host;
  document.getElementById("verdict-note").textContent = level.note;
  const risk = Math.min(10, a.points);
  document.getElementById("risk-bar").style.width = Math.max(risk * 10, a.level === "ok" ? 4 : 10) + "%";
  document.getElementById("risk-text").textContent = `Nivel de riesgo: ${risk} de 10`;
  const list = document.getElementById("findings");
  list.innerHTML = "";
  const marks = { ok: "✓", warn: "!", bad: "×", info: "·" };
  a.findings.forEach(f => {
    const li = document.createElement("li");
    li.dataset.status = f.status;
    const mark = document.createElement("span");
    mark.className = "mark";
    mark.textContent = marks[f.status];
    const text = document.createElement("div");
    const strong = document.createElement("strong");
    strong.textContent = f.label;
    const small = document.createElement("small");
    small.textContent = f.detail;
    text.append(strong, small);
    li.append(mark, text);
    list.appendChild(li);
  });
}

async function startBot(messages) {
  const id = ++botRun;
  botLog.innerHTML = "";
  replay.disabled = true;
  for (const text of messages) {
    if (id !== botRun) return;
    const bubble = document.createElement("p");
    bubble.className = "bubble typing";
    bubble.innerHTML = "<i></i><i></i><i></i>";
    botLog.appendChild(bubble);
    botLog.scrollTop = botLog.scrollHeight;
    await sleep(750);
    if (id !== botRun) return;
    bubble.classList.remove("typing");
    bubble.textContent = text;
    botLog.scrollTop = botLog.scrollHeight;
    await sleep(450);
  }
  if (id === botRun) replay.disabled = false;
}

form.addEventListener("submit", async event => {
  event.preventDefault();
  if (running) return;
  const parsed = parseInput(input.value);
  if (parsed.error) { errorBox.textContent = parsed.error; return; }
  errorBox.textContent = "";
  running = true;
  submit.disabled = true;
  botRun++;
  area.hidden = false;
  statusBox.hidden = false;
  results.hidden = true;
  area.scrollIntoView({ behavior: "smooth", block: "start" });

  await runStage("CARGANDO", "Cargando análisis", "Preparando el link y el entorno de revisión. Esto toma un momento.", 1500, []);
  await runStage("EVALUANDO", "Evaluando el link", "Revisando protocolo, dominio, estructura del link y señales de suplantación.", 2200, CHECKS);

  const analysis = analyze(parsed);
  renderResults(analysis);
  statusBox.hidden = true;
  results.hidden = false;
  running = false;
  submit.disabled = false;
  lastMessages = explain(analysis);
  startBot(lastMessages);
});

replay.addEventListener("click", () => { if (lastMessages.length) startBot(lastMessages); });

const previewToggle = document.getElementById("preview-toggle");
const previewBox = document.getElementById("preview-box");
const previewFrame = document.getElementById("preview-frame");
previewToggle.addEventListener("click", () => {
  const open = previewBox.hidden;
  previewBox.hidden = !open;
  previewToggle.setAttribute("aria-expanded", String(open));
  previewToggle.querySelector("span").textContent = open ? "−" : "+";
  if (open && !previewFrame.getAttribute("src")) previewFrame.setAttribute("src", "docs/guia_si_ya_entraste.pdf");
});