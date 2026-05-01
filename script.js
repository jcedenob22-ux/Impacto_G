// =============================================
//  SUPABASE CONFIG
// =============================================
const SB_URL = "https://kjwodhmftuuljplaopgq.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtqd29kaG1mdHV1bGpwbGFvcGdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyMDQyMzUsImV4cCI6MjA5Mjc4MDIzNX0.dEw29JyafRZCeUPH-uWOJELzapMh-3gfth6R53E8S78";

const sbHeaders = (token) => ({
  "Content-Type":  "application/json",
  "apikey":        SB_KEY,
  "Authorization": "Bearer " + (token || SB_KEY),
  "Prefer":        "return=representation"
});

// =============================================
//  AUTH STATE
// =============================================
let currentUser   = null;
let currentToken  = null;
let userName      = "Usuario";

// =============================================
//  AUTH FUNCTIONS
// =============================================
async function doLogin() {
  const email = document.getElementById("loginEmail").value.trim();
  const pass  = document.getElementById("loginPass").value;
  const errEl = document.getElementById("loginError");
  const btn   = document.getElementById("loginBtn");

  if (!email || !pass) { showAuthError(errEl, "Completa todos los campos"); return; }
  errEl.classList.add("hidden");
  btn.disabled = true; btn.textContent = "Entrando...";

  try {
    const res = await fetch(`${SB_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": SB_KEY },
      body: JSON.stringify({ email, password: pass })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error_description || data.msg || "Error al iniciar sesión");
    await onAuthSuccess(data);
  } catch (e) {
    showAuthError(errEl, e.message);
  } finally {
    btn.disabled = false; btn.textContent = "Entrar →";
  }
}

async function doRegister() {
  const username = document.getElementById("regUsername").value.trim();
  const email    = document.getElementById("regEmail").value.trim();
  const pass     = document.getElementById("regPass").value;
  const errEl    = document.getElementById("registerError");
  const btn      = document.getElementById("registerBtn");

  if (!username || !email || !pass) { showAuthError(errEl, "Completa todos los campos"); return; }
  if (pass.length < 6) { showAuthError(errEl, "La contraseña debe tener al menos 6 caracteres"); return; }
  errEl.classList.add("hidden");
  btn.disabled = true; btn.textContent = "Creando cuenta...";

  try {
    // 1. Sign up
    const res = await fetch(`${SB_URL}/auth/v1/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": SB_KEY },
      body: JSON.stringify({ email, password: pass })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error_description || data.msg || "Error al registrarse");
    if (!data.access_token) throw new Error("Revisa tu email para confirmar la cuenta");

    // 2. Create profile
    await fetch(`${SB_URL}/rest/v1/profiles`, {
      method: "POST",
      headers: sbHeaders(data.access_token),
      body: JSON.stringify({ id: data.user.id, username })
    });

    await onAuthSuccess(data);
  } catch (e) {
    showAuthError(errEl, e.message);
  } finally {
    btn.disabled = false; btn.textContent = "Crear cuenta →";
  }
}

async function doLogout() {
  await fetch(`${SB_URL}/auth/v1/logout`, {
    method: "POST",
    headers: { "apikey": SB_KEY, "Authorization": "Bearer " + currentToken }
  });
  currentUser = null; currentToken = null; userName = "Usuario";
  localStorage.removeItem("impactog_session");
  showAuthScreen();
}

async function onAuthSuccess(data) {
  currentToken = data.access_token;
  currentUser  = data.user;

  // Save session
  localStorage.setItem("impactog_session", JSON.stringify({
    access_token:  data.access_token,
    refresh_token: data.refresh_token,
    user:          data.user
  }));

  // Load profile username
  try {
    const pRes = await fetch(
      `${SB_URL}/rest/v1/profiles?id=eq.${currentUser.id}&select=username`,
      { headers: sbHeaders(currentToken) }
    );
    const profiles = await pRes.json();
    if (profiles.length) userName = profiles[0].username;
    else userName = currentUser.email.split("@")[0];
  } catch { userName = currentUser.email.split("@")[0]; }

  hideAuthScreen();
  await cargarPerfil();
}

async function tryRestoreSession() {
  const saved = localStorage.getItem("impactog_session");
  if (!saved) return false;
  try {
    const session = JSON.parse(saved);
    // Try to refresh token
    const res = await fetch(`${SB_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": SB_KEY },
      body: JSON.stringify({ refresh_token: session.refresh_token })
    });
    if (!res.ok) { localStorage.removeItem("impactog_session"); return false; }
    const data = await res.json();
    await onAuthSuccess(data);
    return true;
  } catch { localStorage.removeItem("impactog_session"); return false; }
}

function showAuthError(el, msg) {
  el.textContent = msg; el.classList.remove("hidden");
}

function showLogin() {
  document.getElementById("loginPanel").classList.remove("hidden");
  document.getElementById("registerPanel").classList.add("hidden");
  document.getElementById("loginError").classList.add("hidden");
}

function showRegister() {
  document.getElementById("registerPanel").classList.remove("hidden");
  document.getElementById("loginPanel").classList.add("hidden");
  document.getElementById("registerError").classList.add("hidden");
}

function showAuthScreen() {
  document.getElementById("authScreen").classList.remove("hidden");
  document.getElementById("userChip").textContent = "";
}

function hideAuthScreen() {
  document.getElementById("authScreen").classList.add("hidden");
  document.getElementById("userChip").textContent = "▸ " + userName;
  // Show welcome modal
  const saludoEl = document.getElementById("saludoNombre");
  if (saludoEl) saludoEl.textContent = userName.toUpperCase();
  document.getElementById("modalOverlay").classList.remove("hidden");
}

// =============================================
//  STARS (auth screen + main)
// =============================================
(function () {
  function initStars(canvasId) {
    const c = document.getElementById(canvasId);
    if (!c) return;
    const ctx = c.getContext("2d");
    let stars = [];
    const resize = () => { c.width = innerWidth; c.height = innerHeight; };
    const make   = () => stars = Array.from({length:180}, () => ({ x: Math.random()*c.width, y: Math.random()*c.height, r: Math.random()*1.2+0.2, a: Math.random(), s: Math.random()*0.004+0.001 }));
    const draw   = () => { ctx.clearRect(0,0,c.width,c.height); stars.forEach(s => { s.a+=s.s; ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2); ctx.fillStyle=`rgba(148,163,184,${0.2+0.5*Math.abs(Math.sin(s.a))})`; ctx.fill(); }); requestAnimationFrame(draw); };
    resize(); make(); addEventListener("resize", () => { resize(); make(); }); requestAnimationFrame(draw);
  }
  initStars("stars");
  initStars("authStars");
})();

// =============================================
//  MODAL
// =============================================
function cerrarModal() { document.getElementById("modalOverlay").classList.add("hidden"); renderHistorial(); }

function irPaso2() {
  document.getElementById("modalStep1").classList.add("modal-hidden");
  document.getElementById("modalStep2").classList.remove("modal-hidden");
  setTimeout(() => document.getElementById("inputNombre").focus(), 80);
}
function confirmarNombre() {
  const v = document.getElementById("inputNombre").value.trim();
  if (!v) { document.getElementById("inputNombre").style.borderBottomColor = "#ef4444"; return; }
  userName = v;
  document.getElementById("saludoNombre").textContent = v.toUpperCase();
  document.getElementById("modalStep2").classList.add("modal-hidden");
  document.getElementById("modalStep3").classList.remove("modal-hidden");
  document.getElementById("userChip").textContent = "▸ " + v;
}
function cerrarModal() { document.getElementById("modalOverlay").classList.add("hidden"); }

// =============================================
//  CONFIG STATE
// =============================================
const cfg = {
  A: { g: 9.8,  nombre: "Tierra", h0: 100 },
  B: { g: 3.72, nombre: "Marte",  h0: 100 },
  k:     0,       // coef. resistencia aire
  speed: 1,       // multiplicador velocidad
  bEnabled: true
};

// =============================================
//  PLANET / SLIDERS
// =============================================
function selectPlanet(obj, btn) {
  const grid = document.getElementById("planet-grid" + obj) || btn.closest(".planet-grid");
  grid.querySelectorAll(".planet-btn").forEach(b => b.classList.remove("active", "active-a", "active-b"));
  btn.classList.add(obj === "A" ? "active-a" : "active-b");
  cfg[obj].g      = parseFloat(btn.dataset.g);
  cfg[obj].nombre = btn.dataset.name;
}

function syncAltura(obj, val) {
  cfg[obj].h0 = parseFloat(val) || 100;
  document.getElementById("alturaSlider" + obj).value = val;
  document.getElementById("alturaNum"    + obj).value = val;
  updateSliderGrad("alturaSlider" + obj, val, 10, 500);
}

function syncAir(val) {
  cfg.k = parseFloat(val) || 0;
  document.getElementById("airSlider").value = val;
  document.getElementById("airNum").value    = val;
  updateSliderGrad("airSlider", val, 0, 0.5);
  const hint = document.getElementById("airHint");
  hint.textContent = cfg.k === 0 ? "Sin resistencia (vacío)" : cfg.k < 0.1 ? "Resistencia baja" : cfg.k < 0.3 ? "Resistencia moderada" : "Resistencia alta";
}

function syncSpeed(val) {
  cfg.speed = parseFloat(val);
  document.getElementById("speedSlider").value = val;
  document.getElementById("speedBadge").textContent = cfg.speed + "×";
  updateSliderGrad("speedSlider", val, 0.25, 3);
}

function updateSliderGrad(id, val, min, max) {
  const pct = ((val - min) / (max - min)) * 100;
  document.getElementById(id).style.setProperty("--pct", pct + "%");
}

function toggleB() {
  cfg.bEnabled = document.getElementById("enableB").checked;
  const col = document.querySelector(".col-left .ball-b .planet-grid");
  const metricsB = document.getElementById("metricsB");
  const wrap = document.getElementById("bolaWrapB");
  if (!cfg.bEnabled) {
    col.style.opacity = "0.4"; col.style.pointerEvents = "none";
    metricsB.style.opacity = "0.4";
    wrap.style.display = "none";
  } else {
    col.style.opacity = ""; col.style.pointerEvents = "";
    metricsB.style.opacity = "";
    wrap.style.display = "";
  }
}

// Init slider gradients
updateSliderGrad("alturaSliderA", 100, 10, 500);
updateSliderGrad("alturaSliderB", 100, 10, 500);
updateSliderGrad("airSlider",     0,   0,  0.5);
updateSliderGrad("speedSlider",   1,   0.25, 3);

// =============================================
//  THEME
// =============================================
function toggleTheme() {
  const isLight = document.body.classList.toggle("light");
  document.getElementById("btnTheme").textContent = isLight ? "☀️" : "🌙";
  localStorage.setItem("impactog_theme", isLight ? "light" : "dark");
}
(function applyTheme() {
  if (localStorage.getItem("impactog_theme") === "light") {
    document.body.classList.add("light");
    document.getElementById("btnTheme").textContent = "☀️";
  }
})();

// =============================================
//  SOUND
// =============================================
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playImpact() {
  // Resume context if suspended (browser autoplay policy)
  if (audioCtx.state === "suspended") audioCtx.resume();

  const now = audioCtx.currentTime;

  // Low thud — sine wave with fast decay
  const osc1 = audioCtx.createOscillator();
  const gain1 = audioCtx.createGain();
  osc1.type = "sine";
  osc1.frequency.setValueAtTime(120, now);
  osc1.frequency.exponentialRampToValueAtTime(40, now + 0.15);
  gain1.gain.setValueAtTime(0.6, now);
  gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
  osc1.connect(gain1); gain1.connect(audioCtx.destination);
  osc1.start(now); osc1.stop(now + 0.25);

  // High click — noise burst
  const bufSize = audioCtx.sampleRate * 0.05;
  const buf = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);
  const noise = audioCtx.createBufferSource();
  const gain2 = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();
  filter.type = "bandpass"; filter.frequency.value = 800; filter.Q.value = 0.8;
  noise.buffer = buf;
  gain2.gain.setValueAtTime(0.3, now);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
  noise.connect(filter); filter.connect(gain2); gain2.connect(audioCtx.destination);
  noise.start(now);
}

// =============================================
//  HELPERS
// =============================================
function fmtTime(s) {
  if (s < 60) return s.toFixed(3) + " s";
  const m   = Math.floor(s / 60);
  const sec = (s % 60).toFixed(2);
  return `${m}m ${sec}s`;
}

// =============================================
//  SIMULATION STATE
// =============================================
let animId      = null;
let startTime   = null;
let pauseOffset = 0;
let pauseStart  = null;
let isPaused    = false;
let isRunning   = false;
let simFrame    = null;

// Per-object sim state
function makeSim(h0, g, k) {
  return { h0, g, k, t: 0, v: 0, h: h0, done: false };
}

// Euler integration step (handles air resistance)
// a = g - (k/m)*v^2  (m=1 kg reference)
function stepEuler(sim, dt) {
  if (sim.done) return;
  const a  = sim.g - sim.k * sim.v * sim.v;
  sim.v   += a * dt;
  sim.h   -= sim.v * dt;
  sim.t   += dt;
  if (sim.h <= 0) { sim.h = 0; sim.done = true; }
}

// =============================================
//  ELEMENTS
// =============================================
const bolaWrapA   = document.getElementById("bolaWrapA");
const bolaWrapB   = document.getElementById("bolaWrapB");
const bolaShadowA = document.getElementById("bolaShadowA");
const bolaShadowB = document.getElementById("bolaShadowB");
const suelo       = document.getElementById("suelo");
const escenario   = document.getElementById("escenario");
const trailCvs    = document.getElementById("trailCanvas");
const trailCtx    = trailCvs.getContext("2d");
const grafCvs     = document.getElementById("grafica");
const grafCtx     = grafCvs.getContext("2d");
const btnSim      = document.getElementById("btnSim");
const btnPause    = document.getElementById("btnPause");
const pauseOverlay = document.getElementById("pauseOverlay");
const toast       = document.getElementById("toast");

grafCvs.width = 600; grafCvs.height = 220;

// =============================================
//  TRAIL
// =============================================
let trailA = [], trailB = [];

function resizeTrail() { trailCvs.width = escenario.clientWidth; trailCvs.height = escenario.clientHeight; }

function drawTrails() {
  trailCtx.clearRect(0, 0, trailCvs.width, trailCvs.height);
  drawOneTrail(trailA, "59,130,246");   // blue-ish for A (green ball)
  drawOneTrail(trailB, "245,158,11");   // amber for B
}

function drawOneTrail(pts, rgb) {
  for (let i = 1; i < pts.length; i++) {
    const alpha = (i / pts.length) * 0.5;
    const r     = 3 * (i / pts.length);
    trailCtx.beginPath();
    trailCtx.arc(pts[i].x, pts[i].y, r, 0, Math.PI * 2);
    trailCtx.fillStyle = `rgba(${rgb},${alpha})`;
    trailCtx.fill();
  }
}

// =============================================
//  GRAFICA
// =============================================
let grafA = [], grafB = [];

function dibujarGrafica(tMax, vMax) {
  const W = grafCvs.width, H = grafCvs.height;
  const pad = { t: 12, r: 12, b: 30, l: 48 };
  const w = W - pad.l - pad.r, h = H - pad.t - pad.b;

  grafCtx.clearRect(0, 0, W, H);
  grafCtx.fillStyle = "#060d1a"; grafCtx.fillRect(0, 0, W, H);

  // Grid
  grafCtx.strokeStyle = "#1a3050"; grafCtx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad.t + (i / 4) * h;
    grafCtx.beginPath(); grafCtx.moveTo(pad.l, y); grafCtx.lineTo(pad.l + w, y); grafCtx.stroke();
    grafCtx.fillStyle = "#4a6080"; grafCtx.font = "10px 'Share Tech Mono',monospace"; grafCtx.textAlign = "right";
    grafCtx.fillText((vMax * (1 - i / 4)).toFixed(0), pad.l - 5, y + 4);
    const x = pad.l + (i / 4) * w;
    grafCtx.beginPath(); grafCtx.moveTo(x, pad.t); grafCtx.lineTo(x, pad.t + h); grafCtx.stroke();
    grafCtx.textAlign = "center";
    grafCtx.fillText((tMax * i / 4).toFixed(1), x, pad.t + h + 18);
  }

  grafCtx.fillStyle = "#4a6080"; grafCtx.font = "10px 'Inter',sans-serif"; grafCtx.textAlign = "center";
  grafCtx.fillText("Tiempo (s)", pad.l + w / 2, H - 3);
  grafCtx.save(); grafCtx.translate(12, pad.t + h / 2); grafCtx.rotate(-Math.PI / 2);
  grafCtx.fillText("v (m/s)", 0, 0); grafCtx.restore();

  drawGrafLine(grafA, "#22c55e", pad, w, h, tMax, vMax);
  if (cfg.bEnabled) drawGrafLine(grafB, "#f59e0b", pad, w, h, tMax, vMax);
}

function drawGrafLine(pts, color, pad, w, h, tMax, vMax) {
  if (pts.length < 2) return;
  grafCtx.beginPath();
  pts.forEach((p, i) => {
    const x = pad.l + (p.t / tMax) * w, y = pad.t + h - (p.v / vMax) * h;
    i === 0 ? grafCtx.moveTo(x, y) : grafCtx.lineTo(x, y);
  });
  grafCtx.strokeStyle = color; grafCtx.lineWidth = 2; grafCtx.lineJoin = "round"; grafCtx.stroke();
  const last = pts[pts.length - 1];
  const lx = pad.l + (last.t / tMax) * w, ly = pad.t + h - (last.v / vMax) * h;
  grafCtx.beginPath(); grafCtx.arc(lx, ly, 4, 0, Math.PI * 2);
  grafCtx.fillStyle = color; grafCtx.fill();
}

function limpiarGrafica() { grafCtx.fillStyle = "#060d1a"; grafCtx.fillRect(0, 0, grafCvs.width, grafCvs.height); }

// =============================================
//  TOAST
// =============================================
let toastTimer = null;
function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg; t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 3800);
}

// =============================================
//  PAUSE
// =============================================
function togglePausa() {
  if (!isRunning) return;
  if (!isPaused) {
    isPaused = true; pauseStart = performance.now();
    cancelAnimationFrame(animId); animId = null;
    pauseOverlay.classList.add("visible");
    btnPause.classList.add("paused");
    btnPause.innerHTML = `<svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor"><path d="M3 2.5l10 5.5-10 5.5V2.5z"/></svg>`;
  } else {
    isPaused = false; pauseOffset += performance.now() - pauseStart; pauseStart = null;
    pauseOverlay.classList.remove("visible");
    btnPause.classList.remove("paused");
    btnPause.innerHTML = `<svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor"><rect x="3" y="2" width="4" height="12" rx="1"/><rect x="9" y="2" width="4" height="12" rx="1"/></svg>`;
    animId = requestAnimationFrame(simFrame);
  }
}

// =============================================
//  SIMULACION
// =============================================
function iniciarSimulacion() {
  const h0A = cfg.A.h0, h0B = cfg.B.h0;
  if (isNaN(h0A) || h0A <= 0) { showToast("⚠ Altura A inválida"); return; }
  if (cfg.bEnabled && (isNaN(h0B) || h0B <= 0)) { showToast("⚠ Altura B inválida"); return; }

  resetearEstado(false);
  btnSim.disabled = true; btnPause.disabled = false;
  isRunning = true; resizeTrail();

  const simA = makeSim(h0A, cfg.A.g, cfg.k);
  const simB = cfg.bEnabled ? makeSim(h0B, cfg.B.g, cfg.k) : null;

  // Estimate max time & velocity for graph axes (vacuum approximation for scale)
  const tMaxA = Math.sqrt(2 * h0A / cfg.A.g);
  const tMaxB = simB ? Math.sqrt(2 * h0B / cfg.B.g) : 0;
  const tAxis = Math.max(tMaxA, tMaxB) * 1.05;
  const vMaxA = cfg.A.g * tMaxA;
  const vMaxB = simB ? cfg.B.g * tMaxB : 0;
  const vAxis = Math.max(vMaxA, vMaxB) * 1.1;

  const escH = escenario.clientHeight - 22 - 8;
  const cxA  = trailCvs.width * 0.35;
  const cxB  = trailCvs.width * 0.65;

  startTime = null; pauseOffset = 0;
  grafA = []; grafB = [];
  trailA = []; trailB = [];

  let lastTs = null;

  function frame(ts) {
    if (!startTime) { startTime = ts; lastTs = ts; }
    const realDt = Math.min((ts - lastTs) / 1000, 0.05); // cap at 50ms
    lastTs = ts;
    const dt = realDt * cfg.speed;

    // Step physics
    if (!simA.done) stepEuler(simA, dt);
    if (simB && !simB.done) stepEuler(simB, dt);

    // Visual positions
    const topA = (1 - simA.h / simA.h0) * escH;
    const topB = simB ? (1 - simB.h / simB.h0) * escH : 0;

    bolaWrapA.style.top = topA + "px";
    if (simB) bolaWrapB.style.top = topB + "px";

    // Shadows
    const scA = 0.5 + (topA / escH) * 1.4;
    bolaShadowA.style.transform = `scaleX(${scA})`; bolaShadowA.style.opacity = 0.3 + (topA / escH) * 0.5;
    if (simB) {
      const scB = 0.5 + (topB / escH) * 1.4;
      bolaShadowB.style.transform = `scaleX(${scB})`; bolaShadowB.style.opacity = 0.3 + (topB / escH) * 0.5;
    }

    // Trails
    trailA.push({ x: cxA, y: topA + 11 }); if (trailA.length > 28) trailA.shift();
    if (simB) { trailB.push({ x: cxB, y: topB + 11 }); if (trailB.length > 28) trailB.shift(); }
    drawTrails();

    // Metrics
    document.getElementById("mTA").textContent = fmtTime(simA.t);
    document.getElementById("mVA").textContent = simA.v.toFixed(2) + " m/s";
    document.getElementById("mHA").textContent = simA.h.toFixed(2) + " m";
    if (simB) {
      document.getElementById("mTB").textContent = fmtTime(simB.t);
      document.getElementById("mVB").textContent = simB.v.toFixed(2) + " m/s";
      document.getElementById("mHB").textContent = simB.h.toFixed(2) + " m";
    }

    // Graph
    const tSample = simA.t;
    if (grafA.length === 0 || tSample - grafA[grafA.length - 1].t > 0.04)
      grafA.push({ t: simA.t, v: simA.v });
    if (simB && (grafB.length === 0 || simB.t - grafB[grafB.length - 1].t > 0.04))
      grafB.push({ t: simB.t, v: simB.v });
    dibujarGrafica(tAxis, vAxis);
    document.getElementById("grafHint").textContent = `A: ${simA.v.toFixed(1)} m/s` + (simB ? `  B: ${simB.v.toFixed(1)} m/s` : "");

    const allDone = simA.done && (!simB || simB.done);

    if (!allDone) {
      animId = requestAnimationFrame(frame);
    } else {
      // Final
      isRunning = false; btnPause.disabled = true;
      suelo.classList.add("impact"); setTimeout(() => suelo.classList.remove("impact"), 700);
      playImpact();
      const msgA = `A: ${fmtTime(simA.t)} · ${simA.v.toFixed(2)}m/s`;
      const msgB = simB ? `  |  B: ${fmtTime(simB.t)} · ${simB.v.toFixed(2)}m/s` : "";
      showToast("✅ " + msgA + msgB);
      guardarSimulacion("A", cfg.A.nombre, h0A, cfg.k, simA.t, simA.v);
      if (simB) guardarSimulacion("B", cfg.B.nombre, h0B, cfg.k, simB.t, simB.v);
      btnSim.disabled = false;
    }
  }

  simFrame = frame;
  animId = requestAnimationFrame(frame);
}

// =============================================
//  RESET
// =============================================
function resetear() { resetearEstado(true); }

function resetearEstado(full) {
  if (animId) { cancelAnimationFrame(animId); animId = null; }
  isRunning = false; isPaused = false; pauseOffset = 0; pauseStart = null;
  bolaWrapA.style.top = "6px"; bolaWrapB.style.top = "6px";
  bolaShadowA.style.opacity = bolaShadowB.style.opacity = "0.3";
  bolaShadowA.style.transform = bolaShadowB.style.transform = "scaleX(0.5)";
  ["mTA","mVA","mHA","mTB","mVB","mHB"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = id.includes("H") ? "— m" : id.includes("V") ? "0.00 m/s" : "0.000 s";
  });
  document.getElementById("grafHint").textContent = "—";
  grafA = []; grafB = []; trailA = []; trailB = [];
  pauseOverlay.classList.remove("visible");
  btnPause.classList.remove("paused"); btnPause.disabled = true;
  btnPause.innerHTML = `<svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor"><rect x="3" y="2" width="4" height="12" rx="1"/><rect x="9" y="2" width="4" height="12" rx="1"/></svg>`;
  if (full) { trailCtx.clearRect(0, 0, trailCvs.width, trailCvs.height); limpiarGrafica(); btnSim.disabled = false; }
}

// =============================================
//  SUPABASE DB
// =============================================
async function sbInsert(row) {
  const res = await fetch(`${SB_URL}/rest/v1/simulaciones`, {
    method:  "POST",
    headers: sbHeaders(currentToken),
    body:    JSON.stringify(row)
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function sbSelect() {
  const res = await fetch(
    `${SB_URL}/rest/v1/simulaciones?user_id=eq.${currentUser.id}&order=id.desc&limit=60`,
    { headers: sbHeaders(currentToken) }
  );
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function sbDeleteAll() {
  const res = await fetch(`${SB_URL}/rest/v1/simulaciones?user_id=eq.${currentUser.id}`, {
    method:  "DELETE",
    headers: sbHeaders(currentToken)
  });
  if (!res.ok) throw new Error(await res.text());
}

// =============================================
//  HISTORIAL
// =============================================
async function guardarSimulacion(obj, planeta, h0, k, tiempo, vFinal) {
  const row = {
    usuario:  userName,
    objeto:   obj,
    planeta:  planeta,
    altura:   h0,
    k_aire:   parseFloat(k.toFixed(2)),
    tiempo:   fmtTime(tiempo),
    v_final:  parseFloat(vFinal.toFixed(2)),
    user_id:  currentUser.id
  };
  try {
    await sbInsert(row);
    await renderHistorial();
  } catch (e) {
    console.error("Supabase insert error:", e);
    showToast("⚠ Error al guardar en BD");
  }
}

async function renderHistorial() {
  const tbody = document.getElementById("historialBody");
  tbody.innerHTML = `<tr class="empty-row"><td colspan="9">Cargando...</td></tr>`;
  try {
    const hist = await sbSelect();
    if (!hist.length) {
      tbody.innerHTML = `<tr class="empty-row"><td colspan="9">// sin registros</td></tr>`;
      return;
    }
    tbody.innerHTML = hist.map((e, i) => `
      <tr class="${i === 0 ? "row-new" : ""}">
        <td>${e.id}</td>
        <td>${e.usuario}</td>
        <td style="color:${e.objeto==='A'?'#22c55e':'#f59e0b'}">${e.objeto}</td>
        <td>${e.planeta}</td>
        <td>${e.altura} m</td>
        <td>${e.k_aire}</td>
        <td>${e.tiempo}</td>
        <td>${e.v_final} m/s</td>
        <td>${new Date(e.fecha).toLocaleString("es", { dateStyle:"short", timeStyle:"short" })}</td>
      </tr>`).join("");
  } catch (e) {
    console.error("Supabase select error:", e);
    tbody.innerHTML = `<tr class="empty-row"><td colspan="9">⚠ Error al cargar historial</td></tr>`;
  }
}

function limpiarHistorial() {
  document.getElementById("confirmOverlay").classList.remove("hidden");
}

function cerrarConfirm() {
  document.getElementById("confirmOverlay").classList.add("hidden");
}

async function confirmarEliminar() {
  cerrarConfirm();
  try {
    await sbDeleteAll();
    await renderHistorial();
    showToast("🗑 Historial eliminado");
  } catch (e) {
    console.error("Supabase delete error:", e);
    showToast("⚠ Error al eliminar");
  }
}

async function exportarCSV() {
  const tbody = document.getElementById("historialBody");
  let hist = [];
  try {
    hist = await sbSelect();
  } catch { showToast("⚠ Error al obtener datos"); return; }
  if (!hist.length) { showToast("⚠ No hay datos para exportar"); return; }

  const headers = ["#","Usuario","Objeto","Planeta","Altura (m)","k aire","Tiempo","V. final (m/s)","Fecha"];
  const rows = hist.map(e => [
    e.id, e.usuario, e.objeto, e.planeta, e.altura, e.k_aire,
    e.tiempo, e.v_final,
    new Date(e.fecha).toLocaleString("es", { dateStyle:"short", timeStyle:"short" })
  ]);

  const csv = [headers, ...rows]
    .map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(","))
    .join("\n");

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url;
  a.download = `impactog_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("✅ CSV exportado");
}

// =============================================
//  INIT
// =============================================
resizeTrail(); limpiarGrafica();
window.addEventListener("resize", resizeTrail);

// Try to restore session, otherwise show auth screen
(async () => {
  const restored = await tryRestoreSession();
  if (!restored) showAuthScreen();
  else renderHistorial();
})();

// =============================================
//  TABS
// =============================================
function switchTab(tab) {
  ["sim","challenge","ranking"].forEach(t => {
    document.getElementById("panel" + t.charAt(0).toUpperCase() + t.slice(1))?.classList.add("hidden");
    document.getElementById("tab"   + t.charAt(0).toUpperCase() + t.slice(1))?.classList.remove("active");
  });
  document.getElementById("panel" + tab.charAt(0).toUpperCase() + tab.slice(1))?.classList.remove("hidden");
  document.getElementById("tab"   + tab.charAt(0).toUpperCase() + tab.slice(1))?.classList.add("active");

  // Hide historial on non-sim tabs
  const hist = document.getElementById("historialSection");
  if (hist) hist.style.display = tab === "sim" ? "" : "none";

  if (tab === "ranking") cargarRanking();
  if (tab === "challenge") { resizeTrailC(); actualizarPerfilUI(); }
}

// =============================================
//  MISSIONS DATA
// =============================================
const MISSIONS = [
  { id:1, title:"Primera caída", desc:"Deja caer un objeto desde exactamente 100m en la Tierra.", target:"Tiempo de impacto: 4.52 s", type:"tiempo", value:4.515, tol:0.3, planet:"Tierra", g:9.8, diff:"⭐ Fácil" },
  { id:2, title:"Velocidad exacta", desc:"Alcanza una velocidad final de 30 m/s en la Tierra.", target:"Velocidad final: 30.00 m/s", type:"velocidad", value:30, tol:2, planet:"Tierra", g:9.8, diff:"⭐ Fácil" },
  { id:3, title:"Gravedad lunar", desc:"Desde 50m en la Luna, el tiempo de caída es mucho mayor. ¡Encuéntralo!", target:"Tiempo de impacto: 7.86 s", type:"tiempo", value:7.86, tol:0.5, planet:"Luna", g:1.62, diff:"⭐⭐ Medio" },
  { id:4, title:"Marte vs Tierra", desc:"Desde 200m en Marte, ¿cuánto tarda en caer?", target:"Tiempo de impacto: 10.37 s", type:"tiempo", value:10.37, tol:0.5, planet:"Marte", g:3.72, diff:"⭐⭐ Medio" },
  { id:5, title:"Júpiter extremo", desc:"Desde 500m en Júpiter, la gravedad es brutal. ¡Predice el tiempo!", target:"Tiempo de impacto: 6.35 s", type:"tiempo", value:6.35, tol:0.4, planet:"Júpiter", g:24.8, diff:"⭐⭐⭐ Difícil" },
  { id:6, title:"Velocidad terminal", desc:"Con k=0.1, desde 300m en la Tierra, la velocidad final es menor. ¡Encuéntrala!", target:"Velocidad final ≈ 42 m/s", type:"velocidad", value:42, tol:5, planet:"Tierra", g:9.8, diff:"⭐⭐⭐ Difícil" },
  { id:7, title:"Caída libre perfecta", desc:"Desde exactamente 80m en la Tierra, logra un tiempo de 4.04 s.", target:"Tiempo de impacto: 4.04 s", type:"tiempo", value:4.04, tol:0.2, planet:"Tierra", g:9.8, diff:"⭐⭐ Medio" },
  { id:8, title:"Maestro del cosmos", desc:"Desde 1000m en Júpiter, predice el tiempo exacto de impacto.", target:"Tiempo de impacto: 8.98 s", type:"tiempo", value:8.98, tol:0.3, planet:"Júpiter", g:24.8, diff:"⭐⭐⭐⭐ Experto" },
];

const LEVELS = [
  { name:"Cadete Espacial",     min:0    },
  { name:"Piloto Orbital",      min:500  },
  { name:"Explorador Galáctico",min:1500 },
  { name:"Comandante Estelar",  min:3000 },
  { name:"Maestro del Cosmos",  min:6000 },
];

function getLevel(pts) {
  let lv = LEVELS[0];
  for (const l of LEVELS) { if (pts >= l.min) lv = l; }
  return lv;
}
function getNextLevel(pts) {
  for (const l of LEVELS) { if (pts < l.min) return l; }
  return null;
}

// =============================================
//  CHALLENGE STATE
// =============================================
let challengeCfg = { g: 9.8, nombre: "Tierra", h0: 100, k: 0, speed: 1 };
let currentMissionIdx = 0;
let challengeAnimId = null;
let challengeRunning = false;
let challengeSimFrame = null;
let trailC = [];
let userPuntos = 0;

const escenarioC   = document.getElementById("escenarioC");
const trailCvsC    = document.getElementById("trailCanvasC");
const trailCtxC    = trailCvsC?.getContext("2d");
const sueloC       = document.getElementById("sueloC");
const bolaWrapC    = document.getElementById("bolaWrapC");
const bolaShadowC  = document.getElementById("bolaShadowC");
const pauseOverlayC = document.getElementById("pauseOverlayC");

function resizeTrailC() {
  if (!trailCvsC || !escenarioC) return;
  trailCvsC.width  = escenarioC.clientWidth;
  trailCvsC.height = escenarioC.clientHeight;
}

function selectPlanetC(btn) {
  document.querySelectorAll("#planetGridC .planet-btn").forEach(b => b.classList.remove("active-a","active-b","active"));
  btn.classList.add("active-a");
  challengeCfg.g      = parseFloat(btn.dataset.g);
  challengeCfg.nombre = btn.dataset.name;
}

function syncAlturaC(val) {
  challengeCfg.h0 = parseFloat(val) || 100;
  document.getElementById("alturaSliderC").value = val;
  document.getElementById("alturaNumC").value    = val;
  updateSliderGrad("alturaSliderC", val, 10, 1000);
}

function syncAirC(val) {
  challengeCfg.k = parseFloat(val) || 0;
  document.getElementById("airSliderC").value = val;
  document.getElementById("airNumC").value    = val;
  updateSliderGrad("airSliderC", val, 0, 0.5);
  const hint = document.getElementById("airHintC");
  hint.textContent = challengeCfg.k === 0 ? "Sin resistencia (vacío)" : challengeCfg.k < 0.1 ? "Resistencia baja" : challengeCfg.k < 0.3 ? "Resistencia moderada" : "Resistencia alta";
}

function syncSpeedC(val) {
  challengeCfg.speed = parseFloat(val);
  document.getElementById("speedSliderC").value = val;
  document.getElementById("speedBadgeC").textContent = challengeCfg.speed + "×";
  updateSliderGrad("speedSliderC", val, 0.25, 3);
}

function cargarMision(idx) {
  const m = MISSIONS[idx % MISSIONS.length];
  document.getElementById("missionBadge").textContent = `MISIÓN ${m.id}`;
  document.getElementById("missionDiff").textContent  = m.diff;
  document.getElementById("missionTitle").textContent = m.title;
  document.getElementById("missionDesc").textContent  = m.desc;
  document.getElementById("missionTarget").textContent = "🎯 " + m.target;
  document.getElementById("resultCard")?.classList.add("hidden");

  // Pre-select planet hint
  document.querySelectorAll("#planetGridC .planet-btn").forEach(b => {
    b.classList.remove("active-a","active-b","active");
    if (b.dataset.name === m.planet) b.classList.add("active-a");
  });
  challengeCfg.g = m.g; challengeCfg.nombre = m.planet;

  // Show target line if time-based
  const tl = document.getElementById("targetLine");
  if (tl) tl.classList.add("hidden");
}

function siguienteMision() {
  currentMissionIdx++;
  resetearDesafio();
  cargarMision(currentMissionIdx);
}

// =============================================
//  CHALLENGE SIMULATION
// =============================================
function iniciarDesafio() {
  const h0 = challengeCfg.h0;
  if (isNaN(h0) || h0 <= 0) { showToast("⚠ Altura inválida"); return; }

  resetearDesafio(false);
  document.getElementById("btnSimC").disabled = true;
  challengeRunning = true; resizeTrailC();

  const sim = makeSim(h0, challengeCfg.g, challengeCfg.k);
  const tTotal = Math.sqrt(2 * h0 / challengeCfg.g);
  const escH   = escenarioC.clientHeight - 22 - 8;
  const cx     = trailCvsC.width / 2;
  let lastTs   = null;

  function frame(ts) {
    if (!lastTs) lastTs = ts;
    const dt = Math.min((ts - lastTs) / 1000, 0.05) * challengeCfg.speed;
    lastTs = ts;
    if (!sim.done) stepEuler(sim, dt);

    const topPx = (1 - sim.h / sim.h0) * escH;
    bolaWrapC.style.top = topPx + "px";
    const sc = 0.5 + (topPx / escH) * 1.4;
    bolaShadowC.style.transform = `scaleX(${sc})`;
    bolaShadowC.style.opacity   = 0.3 + (topPx / escH) * 0.5;

    trailC.push({ x: cx, y: topPx + 11 });
    if (trailC.length > 30) trailC.shift();
    trailCtxC.clearRect(0, 0, trailCvsC.width, trailCvsC.height);
    for (let i = 1; i < trailC.length; i++) {
      const a = (i / trailC.length) * 0.5, r = 3 * (i / trailC.length);
      trailCtxC.beginPath(); trailCtxC.arc(trailC[i].x, trailC[i].y, r, 0, Math.PI*2);
      trailCtxC.fillStyle = `rgba(34,197,94,${a})`; trailCtxC.fill();
    }

    document.getElementById("mTC").textContent = fmtTime(sim.t);
    document.getElementById("mVC").textContent = sim.v.toFixed(2) + " m/s";

    if (!sim.done) {
      challengeAnimId = requestAnimationFrame(frame);
    } else {
      challengeRunning = false;
      sueloC.classList.add("impact"); setTimeout(() => sueloC.classList.remove("impact"), 700);
      playImpact();
      evaluarMision(sim.t, sim.v);
      document.getElementById("btnSimC").disabled = false;
    }
  }

  challengeSimFrame = frame;
  challengeAnimId = requestAnimationFrame(frame);
}

function resetearDesafio(full = true) {
  if (challengeAnimId) { cancelAnimationFrame(challengeAnimId); challengeAnimId = null; }
  challengeRunning = false;
  if (bolaWrapC) bolaWrapC.style.top = "6px";
  if (bolaShadowC) { bolaShadowC.style.opacity = "0.3"; bolaShadowC.style.transform = "scaleX(0.5)"; }
  document.getElementById("mTC").textContent = "0.000 s";
  document.getElementById("mVC").textContent = "0.00 m/s";
  trailC = [];
  if (trailCtxC) trailCtxC.clearRect(0, 0, trailCvsC.width, trailCvsC.height);
  if (full) {
    document.getElementById("resultCard")?.classList.add("hidden");
    document.getElementById("btnSimC").disabled = false;
  }
}

// =============================================
//  MISSION EVALUATION
// =============================================
function evaluarMision(tiempo, velocidad) {
  const m = MISSIONS[currentMissionIdx % MISSIONS.length];
  const actual  = m.type === "tiempo" ? tiempo : velocidad;
  const diff    = Math.abs(actual - m.value);
  const pct     = Math.max(0, 1 - diff / m.tol);
  const puntaje = Math.round(pct * 100);
  const estrellas = puntaje >= 90 ? 3 : puntaje >= 60 ? 2 : puntaje >= 30 ? 1 : 0;

  // Stars display
  const starsEl = document.getElementById("resultStars");
  starsEl.textContent = "⭐".repeat(estrellas) + "☆".repeat(3 - estrellas);

  // Title
  const titles = ["Sigue intentando", "¡Buen intento!", "¡Muy bien!", "¡Perfecto!"];
  document.getElementById("resultTitle").textContent = titles[estrellas];
  document.getElementById("resultTitle").style.color = estrellas === 3 ? "var(--accent)" : estrellas >= 2 ? "var(--orange)" : "var(--muted2)";

  // Score
  document.getElementById("resultScore").textContent = puntaje + " pts";

  // Details
  const label = m.type === "tiempo" ? "Tiempo" : "Velocidad";
  const unit  = m.type === "tiempo" ? "s" : "m/s";
  document.getElementById("resultDetails").innerHTML =
    `${label} objetivo: <strong>${m.value.toFixed(2)} ${unit}</strong><br>
     Tu resultado: <strong>${actual.toFixed(3)} ${unit}</strong><br>
     Diferencia: <strong>${diff.toFixed(3)} ${unit}</strong>`;

  document.getElementById("resultCard").classList.remove("hidden");

  // Save points
  if (puntaje > 0) {
    guardarPuntos(m.id, puntaje, estrellas);
    if (estrellas === 3) lanzarParticulas();
    else if (estrellas >= 2) playSuccess();
  }
}

// =============================================
//  POINTS & PROFILE
// =============================================
async function guardarPuntos(misionId, puntaje, estrellas) {
  if (!currentUser) return;
  try {
    await fetch(`${SB_URL}/rest/v1/puntos`, {
      method: "POST",
      headers: sbHeaders(currentToken),
      body: JSON.stringify({ user_id: currentUser.id, mision_id: misionId, puntaje, estrellas })
    });
    // Update profile total
    const newTotal = userPuntos + puntaje;
    await fetch(`${SB_URL}/rest/v1/profiles?id=eq.${currentUser.id}`, {
      method: "PATCH",
      headers: sbHeaders(currentToken),
      body: JSON.stringify({ puntos: newTotal })
    });
    userPuntos = newTotal;
    actualizarPerfilUI();
    showToast(`+${puntaje} pts ✨`);
  } catch (e) { console.error("Error guardando puntos:", e); }
}

async function cargarPerfil() {
  if (!currentUser) return;
  try {
    const res = await fetch(
      `${SB_URL}/rest/v1/profiles?id=eq.${currentUser.id}&select=username,puntos`,
      { headers: sbHeaders(currentToken) }
    );
    const data = await res.json();
    if (data.length) {
      userName    = data[0].username;
      userPuntos  = data[0].puntos || 0;
      actualizarPerfilUI();
    }
  } catch (e) { console.error("Error cargando perfil:", e); }
}

function actualizarPerfilUI() {
  const lv   = getLevel(userPuntos);
  const next = getNextLevel(userPuntos);
  const pct  = next ? ((userPuntos - lv.min) / (next.min - lv.min)) * 100 : 100;

  document.getElementById("playerName").textContent  = userName;
  document.getElementById("playerLevel").textContent = lv.name;
  document.getElementById("playerPts").textContent   = userPuntos.toLocaleString();
  document.getElementById("playerAvatar").textContent = userName.charAt(0).toUpperCase();
  document.getElementById("xpBar").style.width = pct + "%";
  document.getElementById("xpLabel").textContent = next
    ? `${userPuntos} / ${next.min} pts para ${next.name}`
    : "¡Nivel máximo alcanzado!";

  // Stats panel
  document.getElementById("statPts").textContent   = userPuntos.toLocaleString();
  document.getElementById("statNivel").textContent = lv.name.split(" ")[0];
}

// =============================================
//  RANKING
// =============================================
async function cargarRanking() {
  const list = document.getElementById("rankingList");
  list.innerHTML = `<p style="text-align:center;color:var(--muted);font-family:var(--fm);padding:24px">Cargando...</p>`;
  try {
    const res = await fetch(
      `${SB_URL}/rest/v1/profiles?select=username,puntos&order=puntos.desc&limit=20`,
      { headers: sbHeaders(currentToken) }
    );
    const data = await res.json();

    // Stats
    const myEntry = data.find(d => d.username === userName);
    if (myEntry) {
      document.getElementById("statPts").textContent = myEntry.puntos?.toLocaleString() || "0";
    }

    // Count missions & stars for current user
    try {
      const pRes = await fetch(
        `${SB_URL}/rest/v1/puntos?user_id=eq.${currentUser.id}&select=puntaje,estrellas`,
        { headers: sbHeaders(currentToken) }
      );
      const pData = await pRes.json();
      document.getElementById("statMisiones").textContent = pData.length;
      document.getElementById("statEstrellas").textContent = pData.reduce((s, r) => s + (r.estrellas || 0), 0);
    } catch {}

    if (!data.length) { list.innerHTML = `<p style="text-align:center;color:var(--muted);font-family:var(--fm);padding:24px">Sin datos aún</p>`; return; }

    const medals = ["gold","silver","bronze"];
    list.innerHTML = data.map((u, i) => {
      const lv  = getLevel(u.puntos || 0);
      const isMe = u.username === userName;
      return `<div class="ranking-item ${isMe ? "me" : ""}">
        <span class="ranking-pos ${medals[i] || ""}">${i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "#" + (i+1)}</span>
        <div class="ranking-avatar">${u.username.charAt(0).toUpperCase()}</div>
        <div class="ranking-info">
          <p class="ranking-name">${u.username}${isMe ? " (tú)" : ""}</p>
          <p class="ranking-level">${lv.name}</p>
        </div>
        <span class="ranking-pts">${(u.puntos || 0).toLocaleString()} pts</span>
      </div>`;
    }).join("");
  } catch (e) {
    list.innerHTML = `<p style="text-align:center;color:var(--danger);font-family:var(--fm);padding:24px">⚠ Error al cargar</p>`;
  }
}

// =============================================
//  PARTICLES
// =============================================
function lanzarParticulas() {
  const cvs = document.getElementById("particlesCanvas");
  cvs.classList.remove("hidden");
  cvs.width = innerWidth; cvs.height = innerHeight;
  const ctx = cvs.getContext("2d");
  const particles = Array.from({length: 120}, () => ({
    x: innerWidth / 2, y: innerHeight / 2,
    vx: (Math.random() - 0.5) * 14,
    vy: (Math.random() - 0.8) * 14,
    r: Math.random() * 5 + 2,
    color: ["#22c55e","#3b82f6","#f59e0b","#a855f7","#ec4899"][Math.floor(Math.random()*5)],
    life: 1
  }));

  function draw() {
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    let alive = false;
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.vy += 0.3; p.life -= 0.018;
      if (p.life <= 0) return;
      alive = true;
      ctx.globalAlpha = p.life;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
      ctx.fillStyle = p.color; ctx.fill();
    });
    ctx.globalAlpha = 1;
    if (alive) requestAnimationFrame(draw);
    else cvs.classList.add("hidden");
  }
  requestAnimationFrame(draw);
  playSuccess(true);
}

// =============================================
//  SOUNDS
// =============================================
function playSuccess(perfect = false) {
  if (audioCtx.state === "suspended") audioCtx.resume();
  const now = audioCtx.currentTime;
  const notes = perfect ? [523, 659, 784, 1047] : [523, 659, 784];
  notes.forEach((freq, i) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine"; osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, now + i * 0.12);
    gain.gain.linearRampToValueAtTime(0.3, now + i * 0.12 + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.3);
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start(now + i * 0.12); osc.stop(now + i * 0.12 + 0.3);
  });
}

// =============================================
//  UPDATED INIT
// =============================================
resizeTrailC();
updateSliderGrad("alturaSliderC", 100, 10, 1000);
updateSliderGrad("airSliderC",    0,   0,  0.5);
updateSliderGrad("speedSliderC",  1,   0.25, 3);
cargarMision(0);
