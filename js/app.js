// Sleepy: un pulsante avvia la sessione, la sessione si ferma con conferma o alla riapertura dell'app.

const $ = s => document.querySelector(s);
const KEY = "sonno:v2";

// ---------- archivio sul telefono ----------
function load() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY));
    const cycle = Number(d?.cycle);
    return { mode: d?.mode === "auto" ? "auto" : "confirm", cycle: cycle >= 3 && cycle <= 8 ? cycle : 8, lang: d?.lang === "es" ? "es" : "it", active: d?.active || null, sessions: d?.sessions || [], showResult: !!d?.showResult };
  } catch {
    return { mode: "confirm", cycle: 8, lang: "it", active: null, sessions: [], showResult: false };
  }
}
let state = load();
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { toast(t("saveError")); }
}

// ---------- testi: italiano e spagnolo ----------
// Per cambiare una frase, modificala qui. I testi fissi della pagina usano data-i18n="chiave".
const STR = {
  it: {
    value: "L'app che ti farà dormire meglio… perché in fondo pure tu sei un koala",
    idleTitle: "Ciao!",
    idleEyebrow: "Premi il pulsante per iniziare a registrare la sessione di sonno",
    goToSleep: "Vado a dormire",
    pressHere: "Premi qui",
    lastSession: d => `Ultima sessione: ${d}`,
    asleepTitle: "A nanna.",
    asleepEyebrow: "Premi il pulsante solo quando ti svegli",
    asleepEyebrowAuto: "Chiudi l'app: quando la riapri, la sessione si ferma",
    shhh: "Shhh...",
    since: (h, d) => `Dalle ${h} · ${d}`,
    cancel: "Annulla la sessione",
    resultTitle: "Ah... buondì",
    resultEyebrow: "Sicuro che non vuoi tornare a dormire altri 5 minuti?",
    range: (a, b) => `Dalle ${a} alle ${b}`,
    resume: "Torna a dormire",
    tapToClose: "Tocca il pulsante per chiudere",
    cancelled: "Sessione annullata",
    resumed: "Sessione ripresa",
    autoOn: "Modalità automatica attiva",
    confirmOn: "Modalità con conferma attiva",
    cycleSet: n => `Giro di carica: ${n} ore`,
    saveError: "Non riesco a salvare sul telefono.",
    settings: "Impostazioni",
    close: "Chiudi",
    langLabel: "Lingua: italiano. Tocca per lo spagnolo",
    endLegend: "Come finisce la sessione",
    confirmName: "Con conferma",
    confirmDesc: "La sessione si ferma solo quando premi il pulsante. Se apri l'app di notte per guardare l'ora, il conteggio continua.",
    autoName: "Automatica",
    autoDesc: "La sessione si ferma appena riapri l'app: al mattino non devi toccare niente. Ma se la apri di notte, anche solo per sbaglio, la sessione finisce lì.",
    cycleLegend: "Giro di carica",
    cycleHint: "Mentre dormi il bordo del pulsante si riempie: il giro completo dura queste ore.",
    alt_idle: "Il koala saluta",
    alt_asleep: "Il koala dorme",
    alt_rested: "Il koala saluta, riposato",
    alt_tired: "Il koala è assonnato e beve un caffè",
  },
  es: {
    value: "La app que te hará dormir mejor… porque en el fondo tú también eres un koala",
    idleTitle: "¡Hola!",
    idleEyebrow: "Pulsa el botón para empezar a registrar tu sesión de sueño",
    goToSleep: "Me voy a dormir",
    pressHere: "Pulsa aquí",
    lastSession: d => `Última sesión: ${d}`,
    asleepTitle: "A dormir.",
    asleepEyebrow: "Pulsa el botón solo cuando te despiertes",
    asleepEyebrowAuto: "Cierra la app: cuando la vuelvas a abrir, la sesión se detendrá",
    shhh: "Shhh...",
    since: (h, d) => `Desde las ${h} · ${d}`,
    cancel: "Cancelar la sesión",
    resultTitle: "Ah... buenos días",
    resultEyebrow: "¿Seguro que no quieres volver a dormir 5 minutitos más?",
    range: (a, b) => `De ${a} a ${b}`,
    resume: "Volver a dormir",
    tapToClose: "Toca el botón para cerrar",
    cancelled: "Sesión cancelada",
    resumed: "Sesión reanudada",
    autoOn: "Modo automático activado",
    confirmOn: "Modo con confirmación activado",
    cycleSet: n => `Ciclo de carga: ${n} horas`,
    saveError: "No puedo guardar en el teléfono.",
    settings: "Ajustes",
    close: "Cerrar",
    langLabel: "Idioma: español. Toca para el italiano",
    endLegend: "Cómo termina la sesión",
    confirmName: "Con confirmación",
    confirmDesc: "La sesión solo se detiene cuando pulsas el botón. Si abres la app por la noche para mirar la hora, el conteo continúa.",
    autoName: "Automática",
    autoDesc: "La sesión se detiene en cuanto vuelves a abrir la app: por la mañana no tienes que tocar nada. Pero si la abres por la noche, aunque sea sin querer, la sesión termina ahí.",
    cycleLegend: "Ciclo de carga",
    cycleHint: "Mientras duermes, el borde del botón se llena: la vuelta completa dura estas horas.",
    alt_idle: "El koala saluda",
    alt_asleep: "El koala duerme",
    alt_rested: "El koala saluda, descansado",
    alt_tired: "El koala tiene sueño y toma un café",
  },
};
const t = (k, ...a) => { const v = STR[state.lang][k]; return typeof v === "function" ? v(...a) : v; };

function applyLang() {
  document.documentElement.lang = state.lang;
  document.querySelectorAll("[data-i18n]").forEach(el => (el.textContent = t(el.dataset.i18n)));
  document.querySelectorAll("[data-i18n-aria]").forEach(el => el.setAttribute("aria-label", t(el.dataset.i18nAria)));
  document.querySelectorAll("#lang [data-l]").forEach(el => el.classList.toggle("on", el.dataset.l === state.lang));
}

// ---------- tempo ----------
const pad = n => String(n).padStart(2, "0");
const hm = t => { const d = new Date(t); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
function dur(ms) {
  const m = Math.max(0, Math.round(ms / 60000)), h = Math.floor(m / 60);
  return h ? `${h}h ${pad(m % 60)}` : `${m} min`;
}

// ---------- koala ----------
// Regola provvisoria: da decidere. Cambiala qui. (Le descrizioni sono in STR, alla voce alt_…)
const KOALA = {
  idle:   "img/koala-saluta.png",
  asleep: "img/koala-dorme.png",
  rested: "img/koala-saluta.png",
  tired:  "img/koala-caffe.png",
};
const moodAfter = ms => (ms < 6 * 3600e3 ? "tired" : "rested");

// ---------- icone ----------
// Luna gialla del file Figma (l'icona "Icona" del pulsante)
const MOON = '<svg viewBox="0 0 58.0894 58.0894"><path d="M48.4077 35.0956C44.8523 36.6149 40.9235 37.0349 37.1273 36.3017C33.3311 35.5685 29.8414 33.7157 27.1075 30.9817C24.3735 28.2478 22.5207 24.758 21.7875 20.9619C21.0543 17.1657 21.4743 13.2369 22.9936 9.68154C20.0821 10.9256 17.5202 12.8646 15.5321 15.3287C13.5441 17.7927 12.1906 20.7067 11.5902 23.8153C10.9898 26.9239 11.1608 30.1324 12.0883 33.1595C13.0158 36.1867 14.6714 38.9403 16.9102 41.179C19.1489 43.4178 21.9025 45.0734 24.9297 46.0009C27.9568 46.9284 31.1653 47.0994 34.2739 46.499C37.3825 45.8986 40.2965 44.5451 42.7605 42.557C45.2246 40.569 47.1636 38.0071 48.4077 35.0956Z"/></svg>';

// ---------- schermata ----------
function setKoala(k) {
  const src = KOALA[k]; const img = $("#koala");
  if (!img.src.endsWith(src)) img.src = src;
  img.alt = t("alt_" + k);
  $("#koala-wrap").classList.toggle("asleep", k === "asleep");
}

// Quando cambia schermata, testi e koala compaiono in dissolvenza
let lastView = null;
function swapIn(view) {
  if (view === lastView) return;
  if (lastView !== null) ["#title", "#eyebrow", "#koala-wrap"].forEach(sel => {
    const el = $(sel); el.classList.remove("swap"); void el.offsetWidth; el.classList.add("swap");
  });
  lastView = view;
}

function render() {
  const big = $("#big"), below = $("#below");
  big.classList.remove("result", "sleeping");

  if (state.active) {
    const start = state.active.start;
    swapIn("asleep");
    $("#title").textContent = t("asleepTitle");
    $("#eyebrow").textContent = t(state.mode === "auto" ? "asleepEyebrowAuto" : "asleepEyebrow");
    $("#big-ico").innerHTML = MOON;
    $("#big-title").textContent = t("shhh");
    $("#big-sub").textContent = t("pressHere");
    below.innerHTML = `<span>${t("since", hm(start), dur(Date.now() - start))}</span><button type="button" class="link" id="cancel">${t("cancel")}</button>`;
    $("#cancel").onclick = cancelSession;
    // Anello di carica: un giro completo in state.cycle ore
    const pct = Math.min(100, (Date.now() - start) / (state.cycle * 3600e3) * 100);
    $("#ring-fill").style.strokeDashoffset = 100 - pct;
    big.classList.add("sleeping");
    setKoala("asleep");
    return;
  }

  const last = state.sessions[state.sessions.length - 1];
  if (state.showResult && last) {
    const ms = last.end - last.start;
    swapIn("result");
    $("#title").textContent = t("resultTitle");
    $("#eyebrow").textContent = t("resultEyebrow");
    big.classList.add("result");
    $("#big-ico").innerHTML = "";
    $("#big-title").textContent = dur(ms);
    $("#big-sub").textContent = t("range", hm(last.start), hm(last.end));
    below.innerHTML = `<button type="button" class="link" id="resume">${t("resume")}</button><span>${t("tapToClose")}</span>`;
    $("#resume").onclick = resumeSession;
    setKoala(moodAfter(ms));
    return;
  }

  swapIn("idle");
  $("#title").textContent = t("idleTitle");
  $("#eyebrow").textContent = t("idleEyebrow");
  $("#big-ico").innerHTML = MOON;
  $("#big-title").textContent = t("goToSleep");
  $("#big-sub").textContent = t("pressHere");
  below.textContent = last ? t("lastSession", dur(last.end - last.start)) : "";
  setKoala("idle");
}

// ---------- azioni ----------
function startSession() {
  state.active = { start: Date.now() };
  state.showResult = false;
  save(); render();
}
function stopSession(at = Date.now()) {
  if (!state.active) return;
  state.sessions.push({ start: state.active.start, end: at });
  state.active = null;
  state.showResult = true;
  save(); render();
}
function cancelSession() {
  state.active = null;
  save(); render(); toast(t("cancelled"));
}
function resumeSession() {
  const last = state.sessions.pop();
  if (!last) return;
  state.active = { start: last.start };
  state.showResult = false;
  save(); render(); toast(t("resumed"));
}
$("#big").onclick = () => {
  if (state.active) stopSession();
  else if (state.showResult) { state.showResult = false; save(); render(); }
  else startSession();
};

// ---------- modalità automatica: la sessione si ferma alla riapertura ----------
let wasHidden = false;
document.addEventListener("visibilitychange", () => {
  if (document.hidden) { wasHidden = true; return; }
  if (state.mode === "auto" && state.active && wasHidden) stopSession();
  wasHidden = false;
  render();
});
// App chiusa del tutto e riaperta: in modalità automatica la sessione si ferma subito.
if (state.mode === "auto" && state.active) stopSession();

// ---------- impostazioni ----------
const sheet = $("#settings");
function openSettings() {
  $("#mode-" + state.mode).checked = true;
  $(`input[name=cycle][value="${state.cycle}"]`).checked = true;
  sheet.hidden = false; $("#close-settings").focus();
}
function closeSettings() { sheet.hidden = true; $("#open-settings").focus(); }
$("#open-settings").onclick = openSettings;
$("#close-settings").onclick = closeSettings;
sheet.addEventListener("click", e => { if (e.target === sheet) closeSettings(); });
document.addEventListener("keydown", e => { if (e.key === "Escape" && !sheet.hidden) closeSettings(); });
document.querySelectorAll("input[name=mode]").forEach(r => r.addEventListener("change", () => {
  state.mode = r.value; save(); render();
  toast(t(r.value === "auto" ? "autoOn" : "confirmOn"));
}));

document.querySelectorAll("input[name=cycle]").forEach(r => r.addEventListener("change", () => {
  state.cycle = Number(r.value); save(); render();
  toast(t("cycleSet", r.value));
}));

// ---------- varie ----------
let tt;
function toast(t) { const el = $("#toast"); el.textContent = t; el.hidden = false; clearTimeout(tt); tt = setTimeout(() => (el.hidden = true), 2200); }
setInterval(() => { if (state.active && !document.hidden) render(); }, 30000);
if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(() => {});

// ---------- lingua: il pulsante IT / ES accanto all'ingranaggio cambia tutti i testi al volo ----------
$("#lang").onclick = () => {
  state.lang = state.lang === "it" ? "es" : "it";
  save(); applyLang(); render();
};
applyLang();
render();

// ---------- apertura (Figma "Launch") ----------
// 1. marchio e koala per un attimo  2. escono in alto e in basso  3. la home compare in dissolvenza.
// Un tocco salta l'attesa.
const splash = $("#splash");
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
let splashTimer = setTimeout(leaveSplash, 1500);
function leaveSplash() {
  clearTimeout(splashTimer);
  if (splash.classList.contains("leaving")) return;
  splash.classList.add("leaving");
  setTimeout(() => $("#screen").classList.remove("pre"), reduced ? 150 : 550);
  setTimeout(() => splash.remove(), reduced ? 400 : 900);
}
splash.addEventListener("click", leaveSplash);
