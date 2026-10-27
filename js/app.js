// Sleepy: un pulsante avvia la sessione, la sessione si ferma con conferma o alla riapertura dell'app.

const $ = s => document.querySelector(s);
const KEY = "sonno:v2";

// ---------- archivio sul telefono ----------
function load() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY));
    const cycle = Number(d?.cycle);
    return { mode: d?.mode === "auto" ? "auto" : "confirm", cycle: cycle >= 3 && cycle <= 8 ? cycle : 8, active: d?.active || null, sessions: d?.sessions || [], showResult: !!d?.showResult };
  } catch {
    return { mode: "confirm", cycle: 8, active: null, sessions: [], showResult: false };
  }
}
let state = load();
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { toast("Non riesco a salvare sul telefono."); }
}

// ---------- tempo ----------
const pad = n => String(n).padStart(2, "0");
const hm = t => { const d = new Date(t); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
function dur(ms) {
  const m = Math.max(0, Math.round(ms / 60000)), h = Math.floor(m / 60);
  return h ? `${h}h ${pad(m % 60)}` : `${m} min`;
}

// ---------- koala ----------
// Regola provvisoria: da decidere. Cambiala qui.
const KOALA = {
  idle:   ["img/koala-saluta.png", "Il koala saluta"],
  asleep: ["img/koala-dorme.png", "Il koala dorme"],
  rested: ["img/koala-saluta.png", "Il koala saluta, riposato"],
  tired:  ["img/koala-caffe.png", "Il koala è assonnato e beve un caffè"],
};
const moodAfter = ms => (ms < 6 * 3600e3 ? "tired" : "rested");

// ---------- icone ----------
// Luna gialla del file Figma (l'icona "Icona" del pulsante)
const MOON = '<svg viewBox="0 0 58.0894 58.0894"><path d="M48.4077 35.0956C44.8523 36.6149 40.9235 37.0349 37.1273 36.3017C33.3311 35.5685 29.8414 33.7157 27.1075 30.9817C24.3735 28.2478 22.5207 24.758 21.7875 20.9619C21.0543 17.1657 21.4743 13.2369 22.9936 9.68154C20.0821 10.9256 17.5202 12.8646 15.5321 15.3287C13.5441 17.7927 12.1906 20.7067 11.5902 23.8153C10.9898 26.9239 11.1608 30.1324 12.0883 33.1595C13.0158 36.1867 14.6714 38.9403 16.9102 41.179C19.1489 43.4178 21.9025 45.0734 24.9297 46.0009C27.9568 46.9284 31.1653 47.0994 34.2739 46.499C37.3825 45.8986 40.2965 44.5451 42.7605 42.557C45.2246 40.569 47.1636 38.0071 48.4077 35.0956Z"/></svg>';

// ---------- schermata ----------
function setKoala(k) {
  const [src, alt] = KOALA[k]; const img = $("#koala");
  if (!img.src.endsWith(src)) img.src = src;
  img.alt = alt;
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
    $("#title").textContent = "A nanna.";
    $("#eyebrow").textContent = state.mode === "auto"
      ? "Chiudi l'app: quando la riapri, la sessione si ferma"
      : "Premi il pulsante solo quando ti svegli";
    $("#big-ico").innerHTML = MOON;
    $("#big-title").textContent = "Shhh...";
    $("#big-sub").textContent = "Premi qui";
    below.innerHTML = `<span>Dalle ${hm(start)} · ${dur(Date.now() - start)}</span><button type="button" class="link" id="cancel">Annulla la sessione</button>`;
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
    $("#title").textContent = "Ah... buondì";
    $("#eyebrow").textContent = "Sicuro che non vuoi tornare a dormire altri 5 minuti?";
    big.classList.add("result");
    $("#big-ico").innerHTML = "";
    $("#big-title").textContent = dur(ms);
    $("#big-sub").textContent = `Dalle ${hm(last.start)} alle ${hm(last.end)}`;
    below.innerHTML = `<button type="button" class="link" id="resume">Torna a dormire</button><span>Tocca il pulsante per chiudere</span>`;
    $("#resume").onclick = resumeSession;
    setKoala(moodAfter(ms));
    return;
  }

  swapIn("idle");
  $("#title").textContent = "Ciao!";
  $("#eyebrow").textContent = "Premi il pulsante per iniziare a registrare la sessione di sonno";
  $("#big-ico").innerHTML = MOON;
  $("#big-title").textContent = "Vado a dormire";
  $("#big-sub").textContent = "Premi qui";
  below.textContent = last ? `Ultima sessione: ${dur(last.end - last.start)}` : "";
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
  save(); render(); toast("Sessione annullata");
}
function resumeSession() {
  const last = state.sessions.pop();
  if (!last) return;
  state.active = { start: last.start };
  state.showResult = false;
  save(); render(); toast("Sessione ripresa");
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
  toast(r.value === "auto" ? "Modalità automatica attiva" : "Modalità con conferma attiva");
}));

document.querySelectorAll("input[name=cycle]").forEach(r => r.addEventListener("change", () => {
  state.cycle = Number(r.value); save(); render();
  toast(`Giro di carica: ${r.value} ore`);
}));

// ---------- varie ----------
let tt;
function toast(t) { const el = $("#toast"); el.textContent = t; el.hidden = false; clearTimeout(tt); tt = setTimeout(() => (el.hidden = true), 2200); }
setInterval(() => { if (state.active && !document.hidden) render(); }, 30000);
if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(() => {});
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
