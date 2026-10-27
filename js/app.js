// Sonno: un pulsante avvia la sessione, la sessione si ferma con conferma o alla riapertura dell'app.

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
  idle:   ["img/koala-saluta.png", "Il koala saluta"], // da sostituire con il koala assonnato
  asleep: ["img/koala-dorme.png", "Il koala dorme"],
  rested: ["img/koala-saluta.png", "Il koala saluta, riposato"],
  tired:  ["img/koala-caffe.png", "Il koala è stanco e beve un caffè"],
};
const moodAfter = ms => (ms < 6 * 3600e3 ? "tired" : "rested");

// ---------- icone ----------
const MOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>';
const SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';

// ---------- schermata ----------
function setKoala(k) {
  const [src, alt] = KOALA[k]; const img = $("#koala");
  if (!img.src.endsWith(src)) img.src = src;
  img.alt = alt;
  $("#koala-wrap").classList.toggle("asleep", k === "asleep");
}

function render() {
  const big = $("#big"), below = $("#below");
  big.classList.remove("result", "sleeping");

  if (state.active) {
    const start = state.active.start;
    $("#title").textContent = "Buonanotte";
    $("#eyebrow").textContent = state.mode === "auto"
      ? `Sessione iniziata alle ${hm(start)}. Chiudi l'app: quando la riapri, la sessione si ferma.`
      : `Sessione iniziata alle ${hm(start)}. Quando ti svegli, premi il pulsante.`;
    $("#big-ico").innerHTML = SUN;
    $("#big-title").textContent = "Mi sono svegliato";
    $("#big-sub").textContent = `In corso da ${dur(Date.now() - start)}`;
    below.innerHTML = `<button type="button" class="link" id="cancel">Annulla la sessione</button>`;
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
    $("#title").textContent = "Buongiorno";
    $("#eyebrow").textContent = `Dalle ${hm(last.start)} alle ${hm(last.end)}`;
    big.classList.add("result");
    $("#big-ico").innerHTML = "";
    $("#big-title").textContent = dur(ms);
    $("#big-sub").textContent = "Tocca per chiudere";
    below.innerHTML = `<span>Non stavi dormendo?</span><button type="button" class="link" id="resume">Riprendi la sessione</button>`;
    $("#resume").onclick = resumeSession;
    setKoala(moodAfter(ms));
    return;
  }

  $("#title").textContent = "Sonno?";
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
