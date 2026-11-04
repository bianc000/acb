// Donkey Brissago - WebApp Engine
// Fix: Testi nemici centrati e bug risolto
// Novità: LIVELLO 2 con più piani e nuovi avversari:
// - Terzino dell'Aquila ("LANCIAMI!")
// - Capitano dello Gnosca
// - Portiere del Chironico
// - Attaccante del Camorino

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const V_WIDTH = 1280;
const V_HEIGHT = 720;

// STATI DI GIOCO
const STATE_SELECT = 0;
const STATE_BRIEFING = 1;
const STATE_PLAYING = 2;
const STATE_LEVEL_CLEAR = 3;
const STATE_VICTORY = 4;
const STATE_GAMEOVER = 5;

let gameState = STATE_SELECT;
let currentLevel = 1; // Livello 1 o Livello 2
let selectedHeroIndex = 0; // 0 = Joao, 1 = Ciuffo, 2 = Leon
let score = 0;
let highScore = 7500;
let bonusTimer = 5000;
let bonusCountdown = 1.0;
let lives = 3;
let floatingTexts = [];
let throwWarnings = [];
let slipperSparks = [];
let isPaused = false;
let carlonNoticeTimer = 0;

// WEB AUDIO SYNTH
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function initAudio() {
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playSound(type) {
  if (!audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    const now = audioCtx.currentTime;

    if (type === 'jump') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(450, now + 0.15);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
    } else if (type === 'kick') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(130, now);
      osc.frequency.exponentialRampToValueAtTime(35, now + 0.2);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === 'ko') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.25);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    } else if (type === 'score') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.setValueAtTime(680, now + 0.08);
      osc.frequency.setValueAtTime(880, now + 0.16);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.28);
      osc.start(now);
      osc.stop(now + 0.28);
    } else if (type === 'whistle') {
      // Triplice fischio arbitrale realistico!
      const osc2 = audioCtx.createOscillator();
      osc.type = 'sine';
      osc2.type = 'sine';
      osc.frequency.setValueAtTime(2800, now);
      osc2.frequency.setValueAtTime(3150, now);
      osc2.connect(gain);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0.26, now + 0.14);
      gain.gain.linearRampToValueAtTime(0.04, now + 0.22);
      gain.gain.linearRampToValueAtTime(0.26, now + 0.34);
      gain.gain.linearRampToValueAtTime(0, now + 0.65);
      osc.start(now); osc2.start(now);
      osc.stop(now + 0.65); osc2.stop(now + 0.65);
    } else if (type === 'hit') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.35);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === 'throw') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(130, now + 0.16);
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.16);
      osc.start(now);
      osc.stop(now + 0.16);
    } else if (type === 'victory') {
      [523, 659, 783, 1046].forEach((freq, i) => {
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        o.connect(g);
        g.connect(audioCtx.destination);
        o.type = 'square';
        o.frequency.setValueAtTime(freq, now + i * 0.12);
        g.gain.setValueAtTime(0.15, now + i * 0.12);
        g.gain.linearRampToValueAtTime(0, now + i * 0.12 + 0.2);
        o.start(now + i * 0.12);
        o.stop(now + i * 0.12 + 0.2);
      });
    }
  } catch(e) {}
}

// -------------------------------------------------------------------------
// GENERAZIONE PROCEDURALE PIXEL ART
// -------------------------------------------------------------------------

function createPixelCanvas(w, h, drawFn) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const pctx = c.getContext('2d');
  drawFn(pctx);
  return c;
}

function createBallCanvas() {
  return createPixelCanvas(24, 24, (p) => {
    p.fillStyle = '#1e1e28'; p.beginPath(); p.arc(12, 12, 11, 0, Math.PI * 2); p.fill();
    p.fillStyle = '#ffffff'; p.beginPath(); p.arc(12, 12, 10, 0, Math.PI * 2); p.fill();
    p.fillStyle = '#191923'; p.fillRect(10, 10, 5, 5);
    p.fillRect(5, 5, 4, 3); p.fillRect(16, 5, 4, 3);
    p.fillRect(5, 16, 4, 3); p.fillRect(16, 16, 4, 3);
  });
}

function createJoaoCanvas(isClimbing = false) {
  return createPixelCanvas(40, 40, (p) => {
    p.fillStyle = '#15151e'; p.fillRect(11, 4, 18, 34);
    p.fillStyle = '#f0f0f5'; p.fillRect(12, 35, 6, 3); p.fillRect(22, 35, 6, 3);
    p.fillStyle = '#19191e'; p.fillRect(13, 25, 14, 8);
    p.fillStyle = '#d71e1e'; p.fillRect(12, 17, 16, 9);

    if (!isClimbing) {
      p.fillStyle = '#d71e1e'; p.fillRect(9, 18, 3, 7); p.fillRect(28, 18, 3, 7);
      p.fillStyle = '#f5c39b'; p.fillRect(9, 25, 3, 3); p.fillRect(28, 25, 3, 3);
    } else {
      p.fillStyle = '#d71e1e'; p.fillRect(9, 14, 3, 6); p.fillRect(28, 14, 3, 6);
      p.fillStyle = '#f5c39b'; p.fillRect(9, 11, 3, 3); p.fillRect(28, 11, 3, 3);
    }

    p.fillStyle = '#f5c39b'; p.fillRect(14, 8, 12, 8);
    p.fillStyle = '#2d190f'; p.fillRect(16, 11, 1, 1); p.fillRect(23, 11, 1, 1);
    p.fillStyle = '#120f12'; p.fillRect(15, 9, 3, 1); p.fillRect(22, 9, 3, 1);

    // Barba e Baffi
    p.fillStyle = '#1e1614';
    p.fillRect(17, 13, 6, 1); p.fillRect(17, 15, 6, 2);
    p.fillRect(15, 14, 1, 1); p.fillRect(24, 14, 1, 1);

    // Riccioli neri
    p.fillStyle = '#120f12';
    p.fillRect(13, 3, 14, 6);
    p.fillRect(12, 4, 1, 2); p.fillRect(27, 4, 1, 2);
    p.fillRect(15, 7, 1, 1); p.fillRect(18, 6, 1, 1); p.fillRect(21, 6, 1, 1); p.fillRect(24, 7, 1, 1);
  });
}

function createCiuffoCanvas(isClimbing = false) {
  return createPixelCanvas(40, 40, (p) => {
    p.fillStyle = '#15151e'; p.fillRect(11, 4, 18, 34);
    p.fillStyle = '#f0f0f5'; p.fillRect(12, 35, 6, 3); p.fillRect(22, 35, 6, 3);
    p.fillStyle = '#19191e'; p.fillRect(13, 25, 14, 8);
    p.fillStyle = '#d71e1e'; p.fillRect(12, 17, 16, 9);

    if (!isClimbing) {
      p.fillStyle = '#d71e1e'; p.fillRect(9, 18, 3, 7); p.fillRect(28, 18, 3, 7);
      p.fillStyle = '#f5c39b'; p.fillRect(9, 25, 3, 3); p.fillRect(28, 25, 3, 3);
    } else {
      p.fillStyle = '#d71e1e'; p.fillRect(9, 14, 3, 6); p.fillRect(28, 14, 3, 6);
      p.fillStyle = '#f5c39b'; p.fillRect(9, 11, 3, 3); p.fillRect(28, 11, 3, 3);
    }

    p.fillStyle = '#f5c39b'; p.fillRect(14, 8, 12, 8);
    p.fillStyle = '#231914';
    p.fillRect(15, 9, 4, 1); p.fillRect(21, 9, 4, 1);
    p.fillRect(16, 11, 1, 1); p.fillRect(22, 11, 1, 1);
    p.fillStyle = '#c86e6e'; p.fillRect(19, 13, 2, 1);

    // Ciuffo frontale
    p.fillStyle = '#231914';
    p.fillRect(13, 3, 14, 5);
    p.fillRect(14, 6, 12, 2);
  });
}

function createLeonCanvas(isClimbing = false) {
  return createPixelCanvas(40, 40, (p) => {
    p.fillStyle = '#15151e'; p.fillRect(11, 4, 18, 34);
    p.fillStyle = '#f0f0f5'; p.fillRect(12, 35, 6, 3); p.fillRect(22, 35, 6, 3);
    p.fillStyle = '#19191e'; p.fillRect(13, 25, 14, 8);
    p.fillStyle = '#d71e1e'; p.fillRect(12, 17, 16, 9);

    if (!isClimbing) {
      p.fillStyle = '#d71e1e'; p.fillRect(9, 18, 3, 7); p.fillRect(28, 18, 3, 7);
      p.fillStyle = '#f5c39b'; p.fillRect(9, 25, 3, 3); p.fillRect(28, 25, 3, 3);
    } else {
      p.fillStyle = '#d71e1e'; p.fillRect(9, 14, 3, 6); p.fillRect(28, 14, 3, 6);
      p.fillStyle = '#f5c39b'; p.fillRect(9, 11, 3, 3); p.fillRect(28, 11, 3, 3);
    }

    p.fillStyle = '#f5c39b'; p.fillRect(14, 8, 12, 8);
    p.fillStyle = '#000'; p.fillRect(16, 10, 1, 1); p.fillRect(22, 10, 1, 1);
    p.fillStyle = '#500f0f'; p.fillRect(18, 12, 4, 2);
    p.fillStyle = '#371e14'; p.fillRect(18, 14, 4, 2);

    p.fillStyle = '#4b2819';
    p.fillRect(13, 3, 14, 6);
    p.fillRect(12, 4, 1, 2); p.fillRect(27, 4, 1, 2);
  });
}

// EASTER EGG 1: CARLON (L'Impegnato con occhiali da sole)
function createCarlonCanvas() {
  return createPixelCanvas(40, 40, (p) => {
    p.fillStyle = '#15151e'; p.fillRect(11, 4, 18, 34);
    p.fillStyle = '#f0f0f5'; p.fillRect(12, 35, 6, 3); p.fillRect(22, 35, 6, 3);
    p.fillStyle = '#1e2432'; p.fillRect(13, 25, 14, 8); // Pantaloni eleganti
    p.fillStyle = '#0f3878'; p.fillRect(12, 17, 16, 9); // Polo blu scuro AC Brissago
    p.fillStyle = '#ffffff'; p.fillRect(19, 17, 2, 9);  // Colletto e abbottonatura bianca

    p.fillStyle = '#0f3878'; p.fillRect(9, 18, 3, 7); p.fillRect(28, 18, 3, 7);
    p.fillStyle = '#f5c39b'; p.fillRect(9, 25, 3, 3); p.fillRect(28, 25, 3, 3);

    // Viso
    p.fillStyle = '#f5c39b'; p.fillRect(14, 8, 12, 8);

    // Occhiali da sole scuri da superstar
    p.fillStyle = '#111111';
    p.fillRect(15, 10, 5, 3); p.fillRect(21, 10, 5, 3); p.fillRect(19, 11, 3, 1);
    p.fillStyle = '#60a5fa'; p.fillRect(16, 11, 1, 1); p.fillRect(22, 11, 1, 1); // Riflesso blu

    // Sorriso sicuro
    p.fillStyle = '#c86e6e'; p.fillRect(18, 14, 4, 1);

    // Taglio di capelli stiloso castano dorato
    p.fillStyle = '#8a5a2a';
    p.fillRect(13, 3, 14, 6);
    p.fillRect(12, 5, 1, 3); p.fillRect(27, 5, 1, 3);
    p.fillRect(14, 2, 12, 2);
  });
}

// EASTER EGG 2: BARSALINI (Guerriero con fascia sportiva e maglia Brissago)
function createBarsaliniCanvas(isClimbing = false) {
  return createPixelCanvas(40, 40, (p) => {
    p.fillStyle = '#15151e'; p.fillRect(11, 4, 18, 34);
    p.fillStyle = '#f0f0f5'; p.fillRect(12, 35, 6, 3); p.fillRect(22, 35, 6, 3);
    p.fillStyle = '#19191e'; p.fillRect(13, 25, 14, 8);
    p.fillStyle = '#d71e1e'; p.fillRect(12, 17, 16, 9); // Maglia rossa
    p.fillStyle = '#ffffff'; p.fillRect(18, 19, 4, 5);  // Numero sul petto

    if (!isClimbing) {
      p.fillStyle = '#d71e1e'; p.fillRect(9, 18, 3, 7); p.fillRect(28, 18, 3, 7);
      p.fillStyle = '#f5c39b'; p.fillRect(9, 25, 3, 3); p.fillRect(28, 25, 3, 3);
    } else {
      p.fillStyle = '#d71e1e'; p.fillRect(9, 14, 3, 6); p.fillRect(28, 14, 3, 6);
      p.fillStyle = '#f5c39b'; p.fillRect(9, 11, 3, 3); p.fillRect(28, 11, 3, 3);
    }

    // Viso
    p.fillStyle = '#f5c39b'; p.fillRect(14, 8, 12, 8);
    p.fillStyle = '#121212'; p.fillRect(16, 11, 1, 1); p.fillRect(23, 11, 1, 1); // Sguardo determinato
    p.fillStyle = '#a05050'; p.fillRect(18, 14, 4, 1);

    // Capelli neri
    p.fillStyle = '#141419';
    p.fillRect(13, 3, 14, 6);
    p.fillRect(12, 4, 1, 3); p.fillRect(27, 4, 1, 3);

    // Fascia sportiva (headband) bianca e rossa
    p.fillStyle = '#ffffff'; p.fillRect(13, 7, 14, 2);
    p.fillStyle = '#d71e1e'; p.fillRect(17, 7, 6, 2);
  });
}

function createSlipperSparks(x, y) {
  for (let i = 0; i < 9; i++) {
    const angle = Math.random() * Math.PI * 2;
    const spd = 70 + Math.random() * 130;
    slipperSparks.push({
      x: x,
      y: y,
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd - 50,
      color: Math.random() > 0.5 ? '#1450be' : (Math.random() > 0.5 ? '#ffea00' : '#ffffff'),
      size: 3 + Math.random() * 3,
      life: 0.4
    });
  }
}

// RIVALI LIVELLO 1
function createCodeborgoCanvas() {
  return createPixelCanvas(36, 36, (p) => {
    p.fillStyle = '#140f0a'; p.fillRect(10, 4, 16, 30);
    p.fillStyle = '#55321e'; p.fillRect(13, 7, 10, 7);
    p.fillStyle = '#fad71e'; p.fillRect(11, 14, 14, 9);
    p.fillStyle = '#19191e'; p.fillRect(14, 14, 3, 9); p.fillRect(20, 14, 3, 9);
    p.fillStyle = '#0f0f0f'; p.fillRect(12, 4, 12, 3);
  });
}

function createAramaiciCanvas() {
  return createPixelCanvas(36, 36, (p) => {
    p.fillStyle = '#141414'; p.fillRect(10, 4, 16, 30);
    p.fillStyle = '#f5c39b'; p.fillRect(13, 7, 10, 7);
    p.fillStyle = '#b41414'; p.fillRect(11, 14, 14, 9);
    p.fillStyle = '#f0c81e';
    for (let i = 0; i < 8; i++) p.fillRect(13 + i, 14 + i, 2, 1);
    p.fillStyle = '#1e140f'; p.fillRect(12, 4, 12, 3);
  });
}

function createPedemonte11Canvas() {
  return createPixelCanvas(40, 40, (p) => {
    p.fillStyle = '#1e0a0a'; p.fillRect(11, 4, 18, 34);
    p.fillStyle = '#ff8c82'; p.fillRect(14, 8, 12, 7);
    p.fillStyle = '#ff0000'; p.fillRect(23, 7, 2, 2);
    p.fillStyle = '#1446b4'; p.fillRect(12, 15, 16, 10);
    p.fillStyle = '#ffffff';
    p.fillRect(15, 17, 3, 6); p.fillRect(21, 17, 3, 6);
    p.fillStyle = '#640a0a'; p.fillRect(17, 13, 6, 2);
    p.fillStyle = '#321e14'; p.fillRect(13, 4, 14, 4);
  });
}

function createAlexCanvas() {
  return createPixelCanvas(42, 42, (p) => {
    p.fillStyle = '#141419'; p.fillRect(11, 3, 18, 37);
    p.fillStyle = '#28a5eb'; p.fillRect(12, 31, 6, 5); p.fillRect(22, 31, 6, 5);
    p.fillStyle = '#f5f5fa'; p.fillRect(12, 24, 16, 7);
    p.fillStyle = '#28a5eb'; p.fillRect(12, 14, 16, 10);
    p.fillStyle = '#d21e1e'; p.fillRect(22, 16, 4, 4);
    p.fillStyle = '#f0c81e'; p.fillRect(23, 17, 2, 2);
    p.fillStyle = '#f5c39b'; p.fillRect(14, 7, 12, 8);
    p.fillStyle = '#000'; p.fillRect(16, 9, 1, 1); p.fillRect(22, 9, 1, 1);
    p.fillStyle = '#fff'; p.fillRect(17, 12, 6, 1);
    p.fillStyle = '#6e4123'; p.fillRect(13, 3, 14, 5);
  });
}

// RIVALI NUOVI LIVELLO 2
// 1. Terzino dell'Aquila (Maglia neroverde con aquila, urla "LANCIAMI!")
function createAquilaCanvas() {
  return createPixelCanvas(38, 38, (p) => {
    p.fillStyle = '#141414'; p.fillRect(10, 4, 18, 32);
    p.fillStyle = '#145028'; p.fillRect(11, 14, 16, 9); // maglia verde Aquila
    p.fillStyle = '#141e14'; p.fillRect(15, 14, 4, 9);  // striscia nera
    p.fillStyle = '#f5c39b'; p.fillRect(13, 7, 12, 7);
    p.fillStyle = '#781414'; p.fillRect(17, 11, 4, 3);  // bocca aperta che grida!
    p.fillStyle = '#28140a'; p.fillRect(12, 4, 14, 3);
  });
}

// 2. Capitano dello Gnosca (Maglia biancoblù con fascia capitano C)
function createGnoscaCanvas() {
  return createPixelCanvas(38, 38, (p) => {
    p.fillStyle = '#141414'; p.fillRect(10, 4, 18, 32);
    p.fillStyle = '#1e3cb4'; p.fillRect(11, 14, 16, 9); // maglia blu Gnosca
    p.fillStyle = '#f5d228'; p.fillRect(8, 17, 3, 4);   // FASCIA CAPITANO Gialla
    p.fillStyle = '#000'; p.fillRect(9, 18, 1, 2);
    p.fillStyle = '#f5c39b'; p.fillRect(13, 7, 12, 7);
    p.fillStyle = '#000'; p.fillRect(15, 9, 1, 1); p.fillRect(21, 9, 1, 1);
    p.fillStyle = '#3c281e'; p.fillRect(12, 4, 14, 3);
  });
}

// 3. Portiere del Chironico (Maglia fluo con guantoni grandi)
function createChironicoGkCanvas() {
  return createPixelCanvas(40, 40, (p) => {
    p.fillStyle = '#141414'; p.fillRect(11, 4, 18, 34);
    p.fillStyle = '#e6ff00'; p.fillRect(12, 14, 16, 10); // maglia giallo fluo portiere
    // GUANTONI GRANDI DA PORTIERE
    p.fillStyle = '#ffffff'; p.fillRect(6, 18, 6, 6); p.fillRect(28, 18, 6, 6);
    p.fillStyle = '#f5c39b'; p.fillRect(14, 8, 12, 7);
    p.fillStyle = '#000'; p.fillRect(16, 10, 1, 1); p.fillRect(22, 10, 1, 1);
    p.fillStyle = '#282828'; p.fillRect(13, 4, 14, 4);
  });
}

// 4. Attaccante del Camorino (Bomber in maglia granata/rossa, scattante)
function createCamorinoCanvas() {
  return createPixelCanvas(42, 42, (p) => {
    p.fillStyle = '#141414'; p.fillRect(11, 3, 18, 37);
    p.fillStyle = '#781428'; p.fillRect(12, 14, 16, 10); // maglia granata Camorino
    p.fillStyle = '#f5c39b'; p.fillRect(14, 7, 12, 8);
    p.fillStyle = '#000'; p.fillRect(16, 9, 1, 1); p.fillRect(22, 9, 1, 1);
    p.fillStyle = '#28140a'; p.fillRect(13, 3, 14, 4); // cresta/capelli da bomber
    p.fillRect(17, 1, 6, 3);
  });
}

function createTairaCanvas() {
  return createPixelCanvas(48, 48, (p) => {
    p.fillStyle = '#141414'; p.fillRect(13, 6, 22, 38);
    p.fillStyle = '#dc1919'; p.fillRect(15, 22, 18, 14);
    p.fillStyle = '#fad71e'; p.fillRect(11, 26, 4, 5);
    p.fillStyle = '#000000'; p.fillRect(12, 28, 2, 1);
    p.fillStyle = '#f5c39b'; p.fillRect(17, 12, 14, 8);
    p.fillStyle = '#281e14'; p.fillRect(19, 18, 10, 2);
    p.fillStyle = '#2d4b2d'; p.fillRect(16, 5, 16, 6);
    p.fillStyle = '#141e14'; p.fillRect(14, 10, 20, 2);
    p.fillStyle = '#f5d228'; p.fillRect(23, 6, 3, 3);
  });
}

function createSlipperCanvas() {
  return createPixelCanvas(28, 28, (p) => {
    p.fillStyle = '#195ad2'; p.fillRect(7, 5, 14, 18);
    p.fillStyle = '#0a1e5a'; p.fillRect(9, 9, 10, 7);
    p.fillStyle = '#78b4ff'; p.fillRect(11, 11, 3, 2);
  });
}

function createPitchCanvas() {
  return createPixelCanvas(32, 18, (p) => {
    // Erba da campo da calcio a strisce alternate
    // Striscia 1 (verde campo intenso)
    p.fillStyle = '#15803d';
    p.fillRect(0, 0, 16, 18);
    // Striscia 2 (verde campo chiaro rasato)
    p.fillStyle = '#16a34a';
    p.fillRect(16, 0, 16, 18);

    // Linea bianca di gesso del campo (sul bordo calpestabile superiore)
    p.fillStyle = '#ffffff';
    p.fillRect(0, 0, 32, 3);

    // Ciuffetti d'erba e texture
    p.fillStyle = '#22c55e';
    p.fillRect(3, 3, 2, 3);
    p.fillRect(11, 4, 2, 2);
    p.fillRect(19, 3, 2, 3);
    p.fillRect(27, 4, 2, 2);

    p.fillStyle = '#86efac';
    p.fillRect(4, 2, 1, 2);
    p.fillRect(20, 2, 1, 2);

    // Terra / fondamenta sotto la zolla erbosa
    p.fillStyle = '#0f3d1b';
    p.fillRect(0, 15, 32, 3);
  });
}

function createLadderCanvas() {
  return createPixelCanvas(24, 16, (p) => {
    p.fillStyle = '#00d2ff';
    p.fillRect(2, 0, 3, 16); p.fillRect(19, 0, 3, 16);
    p.fillRect(5, 7, 14, 2);
  });
}

// =========================================================================
// COACH RENZO - SPRITESHEET UFFICIALE AD ALTA DEFINIZIONE
// Estratto con trasparenza pixel-perfect
// =========================================================================

const RENZO_SPRITES = {
  idle: {
    w: 54,
    h: 131,
    src: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADYAAACDCAYAAADGQugbAAA1a0lEQVR42s19B1hUV9c1DEPvDL13pIOIgmLvxpgYzZvE2JPYu4gFsVAVG3al9yJFwV6jRuzGrogNxBo1ahJT3v/9v/WvcwcsiS0Jef/P59nPvTNz596zzt577bXPvYMqKv/gPzU1NcjlcmhpacHQ0BCmpqYwMjKCmZkZtLW1pfd0dHSgq6sLExMTKBQKWFlZwd7eHir/W/9ZW1tj5syZiIiIwLRpU5GRkY7Nmzdh1apVtJVYvHgxiooKUVZWitjYGCxatBBpaalISU7+3wXK1sYGFhYWkllZWkqDKyzIQ1pqMkqKi1C+oQyXqi5I+2Wlxbhy+RIuXjiHC+fPYuuWCn5eig0EeezQQezYsvV/F7hlS5diyaJFSEtJ4WA3YdPGcly/dgXHjx2RwBw6eACbN1VIIHft3C4dU3P9KrZUrMdWHnuUn+/Yshmb+HlF+XpkZab//wOop6eH9u3aMNTSnoG5fauOYA7h2JFKfHv8MG7UXsWObZtRVlKEGgLdVLEBmzdWSEAvnj+HsyePYwM/+/boIVy+eAE3rl/Dzbrr2LC+VJqALZs3SgC9Pb3g7+//z4P18vLCunXrsLl8A0oKC7B7+zZs27QRB/fvQ/WFs5JV7tuD7ZsrOOBzqL1aTW+sx/07t7Fr21ZsXF+GE0cOo+bSeRzctxubGY536mqwbetmnD51nF7cwNA8QMBHpOPGjhz53/PgN998g+KCfGnA5aUluFJ1UdqKQZ06fgQXz56SgAnbtqlcAnOrtgZV586ilOSxlZ47ffgAvtm1DTt4zLXqiwS2EUfp7fLSdRKwU8eP4RI9u3zJ4n8WWGBgoHSBig3l+Hr3HpSUl2ELw/DEkUOo4GBKCwpwcO9ebC0pwaaiPOzesgEHdm7Bke1bsS0/C1vys3G7+gKuXzyPcpLJboK7TmLZwsk4yPDctnUrDldWYu+OndhWvA57SwpQye9nZmcjZe0/zJq52TlksfXYxYsLL4kQXJefJ3mukAM4sG0TKpk3FUmJKF8aj4MFa3F2QzYOZybhaH4yjqzLxOV9O3CWntq6LhuXzpyQcmkzc/SbHVtQyck4u287DvO4yswV2JOTirKcXF6zRALm5uaCRieL1NRUMtsG7Nm1G7XXa3CLyV7KmRdMtmP7JuRlpmJb+mp8s2IBDi+chW+XzMDF5Nm4U7QQd3PnozZ7Pi6kJeISwZ7MXoWjJWm4efwAKgns0Mb12J+bgqNZy3E8fSEupCfgcuZ8nMpfi4KkJGwoykFBQbYSnKtb44ETSiGFdL6e3rp0sQpHDh3G0WMHUcH82EpQycsWIicpAdkRw1CZEI7zCybh5pppeJQ3Bz8Xx+K3dXH4tSQRt9Ln4OraWahOnosrOQtxrSQZ5wrX4kTaIpxdE4ua1Bg84CTczZiNXyuScHdbJgoXzELGwnjs3lYhAXJ3d28cYB4eHnBxccHq1aslj509fUYC9vXXO7GBtWfbhhIULUpARcx07Jj5Fc4vmoSrSyfhaUkcfimLw9N10fixUAnw6bpY/FQUg58K4/Bj0XzUrI3Ezcxo1KTM4CTE4oe82filNA4/iYkom4+6/Pk4vDoG2XNnoihltQTI3t7x7wPz8fERJ5FOtJV0vJ1EIJREFQngyuUq5OVkYF3qWqxPmItD86ajetkUVC0ezUHNw0+lMc+A/Uz7lQN+SoC/FMfgV9pvJQn4WQI5F0+5VR4Tgx+KZuPn9Qn8/nz8Z8tKXGM4b4iZitT5cfV51nihKJ1IKAdRiAWoUydP4DLlUUFuFvJWrkD5vLk4Nm8iPTUR15aNxy/01s8cvPCS2BdgBIinhdHS9ueiuPrt8/cbTHznx5J4PC1LxNPShbiTGoVTa+OwZMp4aRyurs6NC0zIo6/37JJkkpBEe/bsxqHKvTi6fTNK507HiXkTCEqAGycNrsEEsKclDEGC+3EdgQhP0Z5y/1X2fc5s3M+dg0eFsRK4hzlzcD0jHulRU9AyKBCN5jE1NVXpRNlZGcjPy5HACRlVWXkQBw98jRM7t2LdrAgciRmHK0kTUb14LJ7kz60HFc/wmicB+aEwBjfWTEZdcgSuLp+Ae+nTn9mt5ClKWzsNdbSbadOZf1NwJ20aczIWdzJjUZ44G6F+3vD29m5cj+VkZ0oCVeTY3q93s0h/jaoLp7GVVFwaNwtH5k9DddJkXEgcSVACULxEFALYU76uXR2OO+mRuJcxE/ezyI5JY55ZzfLxkl1fMR73s2crw1BY8Tw8pgdvZ87GtmXRaOblBnNz08b1WF5uNoStZ7E8c/okheoOHD38DQpTV2NT0kJsjRxLmp+AmhXhuJ8ZKc30L/TU99lz8EN+rGRPyHyPc8V+PH7Oj/mDSd/hRIgwFOTxJC8G/ylbgns50di+IhbNfZvAxtqycYDJ5TIlMMqinNwMei0Vxevycej4Qezbu49qvRKn9u9AWcwU7J0xBJeXTED1olGkbrIdaVuEX/Wi0bi8eAyuLBmLSwtHoSZpvAT+fsYs3EuLkuy7tEg8SI1E3apwhvMYVPG468vGoW7peDwunIfDqYnoFhIMS8tGAiZTl0snKqAWzM/LR2pyCvJz87CuOB8VFeXYzobx2KZirJ8xGvtZxy4tDZfy7D/rF0jsdzd1qlSXRHj+QvuthKFJj1QnDsel+cNwYd5InJs3gjYMZ/j6VPxQei6anp2JHwrmSF67VxSP/anz0KFFAD1m3TjANHW0pRMVFRYiNysb6alpyM3NlXqmnOx0arl0lCZESTl2YOZgXFk2CZeTWMuK46QBCqZ7UiRqlaD6aPwi1a25+IXF+leRgwV8L58FnCB+KhDvkx3zo/jZHMnjT/ITcC+bHktbgJ5tm8HT06NxgGloaCjJIy0DuSnpWLtsJXIyMpGXlYVKksie3HSkDOuH0wun4HTccFwj4z0ujMfDkvm4X74EV5lPV3PjcL9kMb6nPVm/GA/LFuEmPfHT+oWSF3/KmyUB+ZXAv8+KwsOCWDxYtxBXMmNwt2QF9kaPQ8W8mXgvLLjxdKKamjLHZk8JR8LMSCybl4CUVSvYJyVhZ1kpkqdMwOaIEahaQdG7hHS/cipuUvhWly5H6eLpyJo/FTuyluBwwUocK1hBtZ+KU+uTcSB9HvYun4YHG5biBwJ8si4eDyi1hIw6V7QMpUtmY/74wShYEInyFbORlRiFfh90Q6Cv558HFxk7+6Uv9WofCkcNVbR1M0dnZyN8EdYcc4ePRFJcLDLpwY05ecicOwMlc8bh2Op4HE2Nw/nMRbi0PgWjurVAsEIDzW0NEOJijA4epujaxBQd3YzR1dsSnT2tMer9dlgyqj8uFK7AxbwknClYhpLE6ege4IL23o6ShbnZ8/pm6NTEAU4WRrAz00RokM/f81zfZt7YMmcizq+dhzNrOfBlMejr7wp3Sy142VrA284GLdzFAHhxLweEuNsipIkt3zNF2awJ2D93PMqjR2Lh2IFInxOOVdPHYXnEKOTET8fy8MEY9VEndG/tjfdDPPB+Mzf0aOGOzkEe6N2+JQa/1xEDuoZh/KcfYkfyfCSzc4geORCLZ4zCiAGf/XVgfhzwZ97OOMU2JOVf7ZD2WTcUDOiOkwunYfmQ3hj1eS8M6dcHwwd+iomff4SI/n0QOag3Jg3+EJOHf4KYT96XhPGqMb0x+qMw/KtrKFo1a0LzQP8P2iCibzdEfvYxOoV4IyVyJDbNHouS+AiM7d0d/bp3RnM3R7hYGaCJhyX6Evg36fORPXMEtwmIn/Q31kH8vVzQz8se1UtnonhEX2wcNwQpvTugakkUTibOwKJRAzCNMzjjy8+xMS4c59JicTVvPi7nLcPmFXEY/UFbxPTriHlD2+P/Vu3A/9w9i5ZNLNHKywr/8/A8jmfNR0HUeHwY4o6d8RNxa3U0rnPQOdOGo1+HFvjPrWtYOTscrYPccP2bjSiOH4v0iM9xf3cG1kSPhb+/518D5+lsj77uVqhKisT2UZ/hcOQYbJwwDHM7NcPBWWOQNepzlLD9L6CG2z8/HP/eugKPNy7Aow3LsWNJJEb2CMKVokSyWgxqs2bhSnYsdiWMxf4FE3FieQQOsiR8szoKvX0scXLNHEqtWDwUtL5iFqb174Fpvdoie/SnyBv3GZb174K88M9wMnMebm1JwfLYCQhs+hfzrEvbMHS3N8XxuInYPvpjHIkai9IJXyKmWyj2TRnM3BuFlVETkB0fifMpVPDFC/G0gkojayaOrIrC9J7NcbdsKe6zuN7MisRdCuP76xJwOzcad3JjcGh5JAqmf4UFn3RBbUYc7iRPxZOsWFSRgOKH9kLyqI/YbUehJnkWatNm4Xoem9no0biwIRMrF8z5e+QRZq3AMRbeE3NGIufzbkgZ+jGie4Ri15SBOLN6DlJmTUFO3ExsnD6EonURFUY87rCtPxg/DpWJ4VjevwOe7EzDox3JeLhzLR7uWIsH29fi/vZkHM9IxJxeodg7dwyuJU3DrZUReJg1m5OQgFXDPsayYR8geUQvXC1Kwm1+7/ruFBQtjcQCXvNv17CmLvYIUFfBqdixuLJwMkomDMGMzi2oCYfiXHI0MuZGIDOWwJj8dWzzf6VS+JFi9076XM5yNE4sHIeMoR2xemh3rBzaBcsGdcSi/m2xZADfY3idWzkHZ+ZNwfUF4RKwR9lzKaUScD1rARI+fw9j2vsisrs35nwShqgBndCnUyMVaA83F7gYaOFo4jScmvMlviF9z+7SAifjx6M6OY7N30Skx8xC9oQvcH7hRPzKAvszQ+2XAqqJQrb3bDt+LJ5PT4oCnIjHRfOpKtg8Fi5C1bIo7JlGbRg3BdXzp+Dm6hl4wO9+zybz8bolSOrXCzHdQ1GzLBx1qTNxMT0WAzqFwLaxtOLIoQPhraWGPZFf4lt2ydumDkHxkO6onDMWS8mKlaWFuFxeJHXQdSsn42c2lL9JGpCasDCmfvFmjmRPqAsfF81jGxKHY3MnYF73lkgb0gdfR47Ct3Hj2Hsl4GEaiSRvMRb8qwfiuzfHI6r+/0O5db90Mfq29YeuieFfB9ahe7uXvmwiU8XKIR/i7MJJuLZqGu5mJGD/1GHIDB+J/UUFOFmYjSPxE3Bx4WgKXIrf/NkUtrMkME8L2GvlUQxTG/5AAniSuwQ7xw/EybipzMFemNq9Daa1b4r9UaNxKno8DnNbNPELhHcOQ2yXpniYPJNRQOIpXo5eob4wtDBpPL1oYqALAe74qjicnj8WZxZNwaZpI5A1bgQqi4rotXwcJU2fThyNx2wmhceEgn9Kxf6LBIhACfjG2jnYNLofbqWyFWFofUuSORQ3CaOauWMMlXtMn65I6t8bM7q2xlgW86rlM/EjBfSPBVQ+ybFo4eMGC1Obxl0NdrdzgJu6DPnTRyFuQB+MCAvEspFfYmtmBjZT4X+TnIjjS+jRNRG4m84erDhaalt+Jpn8SLX+qCABh2PGYGf4IIak6KxjcDs1GvdIFDsjR2ALy8mM9v6Y1sYbUZ2D8A2L/rWVUfghMxY3UmahcnUs2gX7w1xh3fjr+NHTpsBcWx366mrwVBgiefpUbE5Lw/aSIhwoysapjPk4s3wqLrMnE82lWC/8pSCOhBCN/dHDsHnKAPxSvgpP1yfi34UiD+nZnFh8lzoHtatm4gIj4UziZJxaPBU1VCYH40dT8S/AFXp34/IYtA9p9s/fUjLS0UJefAwO5GZjn1i/L8zHscJUHF0Vi7NJU1mwE0n/8QQQh0dFHNi0fji2YAIesZA/2rgUt9iz3SVL3syJpzKJw7XseNwoWITvylfjXvlyXEqdTQ+PpHcX42JOEkqTkxDW4r8ATJfAnNVUsWrccGxOT8Ye9mYHt6zH0XVpqM5fiitpbO3ZRApmfFQci71xX+Iey8C9/HmY2SMQU3oEY3qP5pjSuSnCOwViUudAhPO9iJ7NMKWLF55sW8vGdCke57M0FGfAkaRhbW72zwOTsQQ4yVSw6stBqFizBBsz07F/60bsLSvA3lT2VmkJeFy6kMwYLS2UfpdHyub+DdapkynTcTY9EqdTp+HbtVQ2ydNp3KeXjq+ZxfcicT03Fo/ZhN7NjsPBtBWwNDeCk5PjPw9MXS6Hq6YcmcMGImXqWOQlLUJFfg4ObKnAqZ0bcSArCScobu8WURivW4BfNiTRluCH0gW4X7IQd/JZrxiO59lxn1hEYbx4Ao4tmYzDZN3vOSE/bliEB+zEn1SsxYl12dDX04Cj438DmEwNLjoy7GMDOSbEE2umT8L65LU4uHUzDn+9Eye+3oqjZTmoTFuMupI1eLJ+BX4rW4zfCOzf65Pw63oOnur/2ooZOJc4CecXTJbq5KXFk/Ab1cpvnIT7JJpbm3Px7ZYy6GproEmTJv8FYKoyeBtoYNPkodhKG97cC4PDKLe2bMLXm8qxc3MF9nN7fs92nC/PxvUygqtYgV8I6Ceq/B9LKLXouZ9KkvC0ZBl+KFqKJ4UL8TPB/shcfFC8CI8ry3GY3oqaNOq/d4PdXEUF/S1skDfwQ+yZMJAAB2Fi60BsiJ+F8hVLUZaSjJ2l6+hBhmV5MZ5e+hYX6bnvKlbh8frF+JGe+4kefFqWhJ/LluDnUnYHJQvwhPaQ7c7V0jW4dXw/5s+e+c+D0tMVz0Bpw8pUgY6aRkh08MVQIz1cjJ+KyqivUDzmc6R89RliP/0IEz58H2kJMdhKubUxv5AloRzHKopxbVMubqwTpMD6xRr2MEepLJ6uo2AuZWNamIjqwqX4tjQLh3ZsxthRo/8ZYIGBAXB0doG1kx101GTQ1lDDuQOH2DcVIk3fDqtcvDBMRw+XF0fhwIyvkDOoJ9KH9kbmmMEY160dhn/QHetWrcCe8jLs2VCK09s2onpTCS7mLUc1dePV7ETcK1nOurYEdYXLWCpWoTI/FSf37UJJQR70dXT/PrBZM8IxK/LlRk5bSx1yHU0YaGviyd1b+P5SFVBTC5RvxkFdO5RrmWG1wh7DNNVxcu447J78OUq+eg9lI/piQe8OFLltMah1MPq2DkF5TgYOiOc5dmzBt7u24tsdG3Fx92ac21yMGpJN9e5NOL5lA779ehdyUtZCxjpp4/gPPBVnKKd0srbC+bMn8LTmJvDgIbB7NzYrbHFQ3xrVasY4oWOKMnUFVikcMFBHA2cSpmPX5IHYMeZj7JrwGVZ82AoJH7bDzI86Y3jPjvikc1t80qMzNlKxlGWkoYS5mE+Pbs5OR2lqChJnRGJQnw9hwAltdEAOxoZwk8uwcvxofFOUh1+vXUZVdAy2GdnguJ45alRNUadqTDPAdXVDXNC0xEZdG8wj4JlWtijs3RO7hn2Gsk86YNOQbtg0og/Kx36Ohf/qgohuYRjTuSU+9fPBoGZBGNoiBF+2aIGhDPlxwaGIDGmHka4e6G1uCSfWytFDBzcOwB5twtBCJsMsQ0tkefgBK9Zgi0MTHFXYoU7DDHc0zXBbTYGbMgPckBlxa4g6uQkualtho6YJ1pJUZmgZYnf//sh/ry0Ojv0Uu77qie1f9MK2ER8xVAdhV8QXiGgWgAGWFvhc1wijDS0whRalx7A2skWZoTNWaljgS3N7jOnTp3GAuZDGJ7P4lnHQp7WscVbNiF5RcPCmBGSKO7TbMoVkNwnwBq1WrkANj7mkYYoj2gpskxsiTc8Uy5h767u8j9wuXZDRvSvSu3HbqSPSO3dCcpf3EGXjigQ9S2TTKjSNsVtuhAMyE5ziRB1n7q7QskBLHf2/D6xrWCu0I7AsDUOc07TCVZkprjKPxMBv1gO7ze0tmgDVYHX1dkNmhisqRqjhcUc0TbFdi17XtkCsTB/R9HC0miHi1U0Qr6lAgrYx1upboJjnPqBqgmradWlyjHGNx1/RMMJWLVOM0TZEkJUVPun5wV8D2L/vR2ivrYNZmrqoZDjVcubuqJngFoGJwQswt9XNpO2LwBq8p/SgMW5xYDflzD0tY1zRtcS3muY4RDvG0DpKoAfphcOaFjjG0D1OUBd4rhqCvU3gt1T1UKfOrZoeatV0UKVljnxtM+abFUnsLzaYoVbWmKmjQB5PesWE3mJo1MhFDhmhjiBf9JAIxxdfP/ecAQdmhMsMrbMMpbOGNjitbYpqzfrPBQh6sk5dgDGTIqGW5FNLMHVypV3nxFznda/IdXmsOfZoKDBJYYUmir+w1mFtaYIwFTnW6tlgH/PkFmdJXKCWoXiLISKA1TWAUlXgO7Lird+FYQ3zQoTrt/r2KAsKQ3brzigM64Cd3sG4oGvBMLbgdywIwgJ3ZRa4QXB1cjIr81F4WHhb7Neqc0IZKdcItpase4ahnO3mDx/Tv7A65WhmgPdUZMgh4x0SoSe8JAasakZQCulC4sK3ZcYSMJFrYrZvi8Hwsysa5jjF0DpmYI0NVh744Zt9wE+P2EWX4be5Caih90QY35GbSeDvygQJKaRQv8m8U1oDMOX+NS2GP79TTe9l2jghwMjgzwOzVVXFQBU1VPBi55gDN+ihWg7iBgdwW8VEsluqRrgjU+baZV7wKu0eX1dzEg6aOmP9558gbxC14pdDcGxnOXDpIiqNnHCtnnhuvWB3JHY1kSbqptrLpgxNYxzj/nle4wrDeKulE/qZWSHU1+vdwXUIDUE3LQPEqRpiHwd6WdsSN1WFx5TABCBRs2pJ+zforQs6Nvha14qToI9qJnctc+aEli1+WLoG/7l5A7hzC//OLcY2Uwd6yhJVIn/qyec5qOfAbr0ATrwWXrvGc+7k+Q+qGOIqr3FKzxoLeL5QsqOx+Tvm2vs+vhimoo0Ceugc4/+6XHnBOuaRAHaDhFBD+r/B9y/x8xIzeyxycsccmQ52MDdqtExwlQPYT+Xxn6XJ+E/SGlxiXtRx1r/npNxTNXk2cMGwApCwu/XbBrslV25F3l1hSmxlfh1TM8dtVXNc1LFAoaUrWhqZwMDY6O3A3G1t0EXHEMt0rLCF4XdVnXJJ3Vg6+U3WJGmm6+O/lrO938AOk23s4M1aN0lFCxUcuCjM98XxHEwV96+T4u+Tye7IRegaS1Te4A0pR18A9ntwDcCusRxsZRjul5uzppmjiucstXBCKwKzNDF/OzBfF2d8pKKDVILYzTC7zhC5LryjoQSmpGgjAjahHjRHhbkzhrm6w4+glpNBizgZlzWtcYMh95Aze4sh+71gO3XxXeagqmBRApKb/AHQ3deAE6+vq9tgIye7ggx9nDLuCkO93MwJbYwU0JfrvR2YQl0NA8g+ZZr2OMjBXOcMCdUgklfYTZmoV+YsthY4a+KAJTaeaElxGkCPLdWzRQU/F3l0lwRRpy68+6LkMpY8dvc1YF5l92RiSwnHc27Xc8EaHWtkMczPaNtgr6krxtk4Sk3uW4EZaMvxqa4pcnTtqc4tUKlrzvhmnVFV5kMtQdWqWeIUgeXqWaGfsS3MVGXowJq3ijqylMAua1vjvmBPuYlU254rkT8P7Baj4wal1DXm6EaWmiR6LY4Ffg/HdsjIFePNbGFe/0DNG/9ZqsvRXWGO0QobRLDlSNQ3xSaqhSrWJJE7dZLANcMZQwcsptLuZGENf1U1xBg6IkXDCvnMu1MsyLdE0ZVY7m8CEzVM0D1D8CCL+QoCG0I1tMrABIeNvRBh7QoDmezNwNq2DEZnB1t0MjeAr0wFQQyvjhoqGGVoIInT/Qy1C/TKFQN7HDZwQ7yLN4TyH2NghUW8YDrzIFtuhXIVUfuYZ2rKovt3gAnCEaEocu26lg1yOYEdmM+zdc2wzyoYkY4+MFSTv91jbRR6KGK/VDj6AxR9+R7yh7yP900M0I0FO5KeW0gQK0xskGTujs8cXeFOYNMIYI2GHVLktsgkuAK5JbYyD6qFEpGZvgTsnQHVH6sEZiLVO8HChUZ2CJZpSk3nVHdfDPTwhkJLG/ZvWzjtYmeETRM/weWlE3ApbihOxw7GsZgxWP5xN4Spq6KZmipCOEMDmvghkGWhFYHN07VGLkGlywmKmm8TKf+wKKRkwdsM2wZgSqXy572mZEmWEeZVMctLUw1NWPC6rowqW24NaHb2dq8H1s7PC1/426MyajDupk3HTzmz8CRzqvQA5OHZX2Fv1JdI++JDLB81mHGtAheSRjgVQLquA3PLFjka1IWk83MGDgwbUr1c1CmTPwD7s6CURmasBxakqYlRHVtiHTvvrMlfoHer5nBxsn01MC1NdXwS7IsdU4Zg/9SPcTzqEzzJjsSjtIm4nzoZVxcNl26tbg3/HGsnDIWuqgprlypimdBZOvYEZodcDRtsZlNZzT7rpqoovIaSKP47OfY6YGNa+6Nq0URkf/khPm4VAkc7i1cDU6U7v2rpi68n9sPlpJF4mj0Dj3Km41HmdDzInopHWVO4H4Wtc8aiT6umEsUPYU1J13JAFomiUE5wzLNtKsYs3laS4pea0RdY8c4b8un3gP84ARQFbJ1KDO0ZihqY3LE5ri6djOJRH6N/u9Zo8rof7whgo9sHYf+Efri2YjSeEtCj7Ag8yRDAIvB91mTcTovC2G6toa4mgyGPH6HL8NO0wzoyYb66PUpZ4/aoiFUqU2lgN0UH/Q7AXgXkxddK4IYvAZvUPhD3chNQOro3RnUKhZ2p6ZuB7Rr7MS4vG4UfM6fgYVY4fsjgNnsyPTYRNSmR6OHjAlWGoBltqIElkqnsC5hbRXJr7Ga7coF9lhC7txmGIqdEU6oE9mr59Hvp9HsvNij+u6pKYOuM7BGkro7pXZvjTnY0rnJMSwZ0R8/Q1zzIoqupgfAeYdg17iPULB2Hx9mTlOFHe5wdjifcXk2OxPsBHpARlGCiL7RMkaohapcNNjG3qqgd69SF+hbeqm87VJUd9t23aMIXxXDD64a8FOcRyueajiWKjVhnVdQR2TUM9/NjcTdzLsojBqMv08Pfzw+vuAWk+gxY7SuBReBayiy0c7GWPKZPYEMILJ3ABNVvZW7VUJ3cYt16wO5ZCUzxp4D93oS3hdeFuhdy7hLDcQevEWFohfcVJhgebIF7qXNQmTAJfVsHST8S/+Oz9AQW8V5r7BrfBzeWjScjTnoGSgKYPhXVqyPRwc0WImz1ePxQhl0ageWp2UikcUPDQtniC11Zv9gjOmzx3mtJ4w3AGjymXFtRLuic1rVDMsX3BwameL8Jr8Ex7Z89Bh+2DHgNMA52es+2+HpcH+UD+8ypRxnh3E4muAj8mB2FmtRodHSzgyb1pCG99oUARqWR8wyYubITlrzF2Wabc0fV9LXA7v4O0O+XBJRLeUpgUldNj13k5BUxHHvpGaO7O5vetdOxf85I9AkNlH7e/4pQVALbO74vgU0gtU/A9+kElaX02MPUqaiMHon3/T2gxkkwIbBh2uaSPhTANotQ1KxfY1RTDub2OwB70Vt10rKe0l4CJqv3Lhm3mr1YsaEleukboJcLW6qUqQQ2Cn1Dm74amIaGHDPfb4fDU/rj2pKRDL1puC/AZZARcyLxICMKe2Z+hff83CVgZrSR7GLTtB0JzBKbWMcuSGrDQsqrOmlgQmmYKIH9zhqY8uWcMvqD3aaJPvCG3EBaMK2mRKvQt0MfI1P08bDAjdRpqJw7Gv3ahMDYyPBVwNQxqmcHrBveF8fmDiagaXiYMVEC9j2L9f2MmdhNYD183ciKKjClh0eRpdI1bVGoZY919NoOXvSSnr20FiKWD5SUrXhnYK8z4b077MRvyvSk1bAKQ1v0NSQwd7IwgR2MHoV+7UJgYvKatY8ebVvClwPeNvljPMxkUU6fKIXj91nTcT+dwCK/JDBXCZgJyWMEPZahRgHMcMyjrCogkezigMWKklAK37ExVK4X/tHeFVjDcvo9eu4G+7LzbDhLFfb4yFCBvm6MkBTxO7VR+Lx9CMxM37BaZc9BF4/sRQ9NkUA9TJvEMJxKYJHYFjEIHzT1pPJQg7GgexbMHHorj8AyqUCy1e1QLhZa9OwYkuYEJ1Z6zZ6t879obwPWEIpi4VS5nG6KKn1LHDFyQIqBLXobm+MjF1Ppx3PHY0ZjaOdQWFi84SkdO3qsbMSHeJAZzjCMkMA9YijeXB2OvbOG419kHzWpjqmij1wPaWz+8lmgs9QdkEn1kUdguwimiu9f1rRkfpj+fWD1K8vfEFiplhVWmrizRzQnefC8ayajasFkTP6oG8QjT69fAWY7UjayLx6wbj3IEA8bs4blTiflR6F61QysYZugS2/pytXwgboeMjWskE0KzhRtCz2WR5DrKII3kkR2E9B56UaDuVS4RW8mbhTe0DCRlsmVrGci2c2XqN8ENwQwcYNCTmAM7bOUbhuobDI5YUvZRXc3tqDH+L2VE1C9cDRm9OoIE603dNLiWY3MAd1wKfErei1C6sce0R6TTO5nReHs2ljEffU5DNhwtpbpYLWRK1LVLQiKwAguT00JroCAizjI/eLOpo6VNONi9apGQ9x4UEjhJQnjemUiuoC6+m5ATIK4+VGraYEqvndBwxJ79dlJaCiwisDmGTqhs4EJPm1CBl41CVUJQ1GZGIH48SOgIVN5NTgrAkvr1xUno/vjbuok/Jg+VWpdJBVCoHfSZuLM6jhYqrGDlWvhKyr8BcbOWM7WJYWWQZbM0LRBOqVPFsMwhx4qYXtTRq9uoI7cwrp2lMdcItArfO9qvYn9KgK/TBDX1K1xSdMaZ/RIRtrWKGXo5lK+pbGcLNKxxXhje7Q31Ed/H1vcXssJXzMOd1JnYNv8SJi9DphFPbBzCV/gQZbox8Klfuy7nClS6/I4axru5MShfFGUJIQ9Zdr4QNcMw6kGpiqsEWVkjbmGnFUDa6xkd53MgaVq20pdwFo9W6RxYHnsBopZ3MsYWuvrrYyDLiWwjZpW2MoJ2sBtoa4VMvVtsZoeT2RRjjO1R4SVMzqyOL/nbINZPVvidOwwPEieiIdrw3F5zVzkxUyFoc4rCrWpBKwbzs/7ku3KDNok3M+eJtkjqpDvuf0uZxZOrJiB6QP7QockYq6pA3sNAwTqGEnWTMcAnSh5PtUwRIKpMxYZO0k2jxpvnrEDFhhyq++A+Xrc17XHfB07JFADJhL8QgJfwvcS+V4co2EuGTDSzAXddUzgra0LF01tKOQydPPgZ71CcWLuVxzjLPyQE42D0/ph2+IoaKi8wmvWZMW0/j0ITHxhOoFMIoFE0HMzpKbz+yyqEAK7umIaMsMZ06R+XQtLaBlbwsDYBnomNtA1s4K5qSW8DM3hrWcALx09+GnpwUdbH740Py1udXXgT9EaoKOrNF2x1UIg32+qr0fTR6Aet7RmOsZwNLCAASNCjzQvU9dAD28nxL0fisrIQVIDvDv8Xzg0pQ92L53NPHvFOqOD8Njg91C9eBweUkrdz2EdyyI4SYFEoi4tEt/ys5LRfVAYNZ7UL4eNnT8snH1h7RwIW9cgWDn4wsbJH46uTaHPAenpKqCra0I6foXxfX1902dmoK+AgYGifmtMM4UxJ8jSxhXm9j6wsBe/x1THh02csKxXc+yb8yX7xGk4PGcQLsQOxe6VMZC/Cpg9PZY5uCeqEsdID/vfF500pdUD2qM8KvyUKKzp3wGzOvigbE4E1FVksHL0gY1jIMwc/ODs0wpNAlvD2iWAIAnUrSlsXAL/YNbOAc/Mytn/+WsXpdm4+ktm6+IPB772DAiDZ7MOsOUEqqqooY+nHXI+CcHO6YOQPqQbFnfxxM2kMdhHYtOo/532yx4jsLwRfbFjbC/Kqhn4Lj2CKiQc9+ixO3x9fe0sJPVpjakdm2L9/BiIBtXc2Ru2Dk0lYL4tOsMzuB2cfUPh6BMCJ9+W3G8FJx9hLZ+ZmAAnb+578TjPEDiKbb05ebfgMSE8hvv8rotfa/iEdKJ1hbWTD+SqcgwMdsVtioay0R9h9cDuWNI9ALVJE3AgLREaqq8A5qQtx9rh/bCmb2tULRmH26lTcI+Uf5Z17UTcV7iXnYADVNOJgz5C79ZhUJNrw8LVRwJmbu8LP17cp0VH+EoD6QS/Fh3g/woLqN8GhvBYToRvs7bwD+74zJqGdoJ/8/bwb9mF5+kMb57Tu0UXetCXUSLHsFZeqF0VgdyhPRDV3gvJfVuidk0UKrNXQlP+ikIdFhSM5lbmWDq4D1Z92gYVYzrh+ppw7Js2AHn92+Pb+BGoXjkDS0YOpMu1YGHrRWC+Uiia2/lysF3g27yjBO73JsA2mDeP8W/Zld5oBffANnALaA1Xv3rzF2HXHn6h4tgOjIK2/H57AutMYD4Epo7hYd4cx0zEtPfG3DbOuLp6OjZNHIDh73WA7HVr+f5erugdFooRXTthZtdAXEiOpQAeipX/ao+KiMH4ekU0Bn3QExo6+jC194aNcxDsXJvB1j0Y3sH0VPPOz0yEpi/Bin0x636hyq0A6te8HQwVdlBYOMKa57FgKAvycfBoBo+mbRDQ6gXv8/sBjAYb5phM3QAfhwQhaWBPLO0VjBV926BkxlgM+7AX2jbjBCvecOvWzdUeCj0t2GiqsCVoiYHtW2FI57YY2Kk1vviwO7RlVPjmdrByCpCsCQciAHg374SAlt3/CKx+gN7NOzC0OhKEJ/PFCypyfahpGnNilOexcWlKAJ2lCfAKbs/vPgcmJs3eLQAaWgoYamqhmZ0VxlEjTv64OyYO+gRWBnocs8673Wg3NDKGsakZFCambORMoWNgCE0tbSm3zGw9YO8cDAd6q0mzNlJ+vdpjnSRgYqB+DC0X72Cok+ZVZLpQmDvAiYMV5UEAEyXDRwrDzs8mw7/++8KLjk2CYU+mNDS1hqqqOkyMDTk2Y55H0UjPMso0YWbnDTunZrBjKDZp1volQA3m/UKOScRBQrCkt9RZsGVqmjA1s4OtE8/jFqSsgQTn1bStMlQFOHrYj/noHdJeMvG+s1cLKEytoNUYT8G94i8OQGHXhINibjk1lZjtTcB8mfx+BCXY0MTMAaam5tDXNYSamjYnxpegmknARCi6k1CEd4UJVhQT4hPa4Tkwz5ZQmFlC/G2sfwCYHGY2HhIwK4ZRQEi7l1mwAZxE0/VkwbB09mwGNS3lTJuaWUBVpiWFopWjMsfsSUAWDj5S2Em5JYWjEphgRqXHQqHDFHmn5zv+/F9SUIephRuBNZcGFcALN1D5i8B868H5ME/8Q3tw4E1JGEr1bcSclbELt3PyI5E0hZ1LkGTCayLPBIk0nFOEpXgt8s2NRd/I1IISzPAfACYXwFwlj1k6BD5L9j947AVgvs27wN27OcSkSMCMTKChqU/J5Cd5y9a5qWQCmHdQu7cAM4eevsE/AEymDjMrd+ZHMLVds2eK4/fAJFYMUQLzadqRrGoFVblGPTAjaDPP7Bw9SeOBLwHzDaY6qZ8sAer3wLTYNairazYeMPHn0YgK6lTmjkLgkhGtmfRCJbzRY2Q2z4C20GFTKntBfRspGI7qepJU+j2wwJZdXgImQAmGdKWGNGZ+ymTyxgPm5+fHhNeAlZ0n61dwPbBA+Lbs+Epg3pJ1kGjbmspCRaYDvxdu9xiyNRGlw9nzZY8JAL8HJt4TgF28QyRgamqN+By+tzfbBpk2B8C2wkm0IMraExja5dX6MFQJzI8DMmdPpaL68mB02FCqqOnwPM9zTJggEe/A9s+LNfPMM1jJisJjekamUHtVe/JX//n4UKvJdZ4Dq5/hJhSxrwLmLUiDudEkoBWsbAmMvdSrgflJ53sRnDBRrEVuCWBezZXMK4AZsUNvVGDSnRky2YseE8AsHX2lUPmDhXThwLqQOT1IGlrQ1Hx5UVND3CFhl2DrrATWAM6eBVt4zafpc3b0rgfm5q30mIFBYxdomZYETFzYyjFQAmZHImlK8RsY2k0yocT9mF+20gDpVQJTk//xYS4tLQ0JmJ2L/0vApHM7+KOJXxgCWyiBSaKYIe3p35pdgcU/BIw5oQTGrVszild/afuiOXg0lzxqzQKssBRPzqi+GpgqyYiU/yKw5xYAd3bc/vVEIohDrKmIUDQwbGStKNcwkLwgLmxdX1htnJQK3da5YWBBUv6JrT0Hp61r/Epgemwz5HJN2Ni5wsLei+cV4JTfU543EJb2fvBgAxrcqgfcfFrBmpNpae0AAyNF4wELbBoMNQ3D5/KnfpaV5v/CTAc9G5w980eLwFRVX//4nSq9ZmHv+QdgDSbAiNAUJq5lZmHLyWpE5eHg7E4S0H8lMNsX8sOOakQ5uEBqQR9o6hi9EZimtv5rgTWEp9g25J7CzBrqmjqNGIpMdHs3JXE4uAW/dNEXvfTcxPKZD2Qa2nizptYgc3q91mMvghTeEx5rXGAszk5NlHTcAErM4O/DT2mB0iSY2zizsXzzIMRfAFQCa/pOwEzNbaCr35hti7q+tD4h+iZpfYJUbGHvQ1p/1WACJGAqbCblb/GYWLa2InnY8zxiecDGpUFeKfel1/U1U3xuaGIBPcPGBKYmBGtTic7tSedBrVizKKek+hLQjrPu/1ItcmQTqUpg6hpabxyEKj+3tfd+Bsy6gV1dnwMTJiZUfCbaFkND48YGprywclUpAE6ezSXpE9iiK4JCu0sa77nmo7ZkY+ni6vGXgTUs8jREyT8DTKYrFWdRkAUo0aaHtOtFz3VHs5b0nlh+o5RSUn8ACcZfUhZu7m/+mwBy5qCtw3Ng0qTR82LShKJpMDffMOkzPTapjQ7MQawoOQdIZuMYILGjCDtbMbOOfs/utojPHd0DyIhv/0G2joERgflI524AZi8t7gQ882DDGqbwmr6xAjo6jSip1DSNqDZ8JRoXAxcs1kD7liSRBlASMA7CySNQWrB563kZinYU0gKYkiiUakYZGfXk4Rr0Uijq6jaipJJr6kLXyBzaegpoahlBz4AX0DeBlrYBjBW2VBk+Ul5ZO3pJ+yYKc7YXb+90DQwMoG9kQTBe0u0k0cDaOCkFgHLilLeUbJy9pRVkHX0DaGg3Yh3T1OEJ9Yxhau0EV09/+AS2gC8toFkILCwcqDBMYG3nBkdXsSiqCxm7XF3dt4eM+E9rVNU02WV70OtCEPvR4ywjjt7SVmHlBBVqVBV1Hal8qGlocjJ1Gw+YjL2Yd1BLeDdrhbmJS3Dr4Q+4+/gpvnvyMx7RdA3pST1DNqPq0tqGv3/AO19cxu5ajQOXsVaqEoRYC1FV14WaliG0DUwJ0IM57Urgzpg+M0o6b2BQ08YBp8ru2SOghWTu/s3hGRjC7rg5wYYgKCQMIa07wN7FAy5NPJlbsj91UVU1DZiyvTGzcYG5rRssxO1ZqhZTWxeGoCecPQOwc/8R7D9yCjNmzeXn9tJqlYpMDd6vemz2nX/B7uEJc2tHCcxHn3+B+z/9G49/+R88/Ok/ePT0/+Dhz7+hTdee8AkOg4sX2VBN1K8/8b8HyDTg5O7DFqUli30bNpRtOGktpWUFD/+WrJWtpaX0oFZdMGJcBEo2bsOajByKAE8YKEyhT2Z1dXX9cwANjE0h1zZkPxQsLWcHtuyAkPbd0bxtFzRv05m1rBtad+5JFdIO/i3as8mk+HX1/sMax5tdJmNu+sIrUAAKo7WR7md7BbeBR9NWbDTboUlQGILadMUng4djVUY++vQbihatOsHAxBoGxmYwtbCGvZML/Pze4T+scXZxJZW7wMrZiwUyBD7N2ipvrwa3+90t2Lbw48W9mnEgASFkRy92x38CGEPX0d0Pbn5hcA8UN+nbSCvC4jrihkbDNlDc6WzRVppgLwIVt3XdvVvAuYk/XL1E/+fJRvRd/uYHmc3WzRvuAaFw9Q+VQsMzMEwC2HBB6aK8WJMgMcNtpQvau4kVrT+xWstcEaJZqAsJWFDb+nWOdgTY5tn1AkLEIlFHbjvxPTG5nQm2K3ypWb352t0vBFa2ziSvt0yqWF2ydGzCGA+jJ0IJqpUU++K1N73jEyw8KMC0hBs9JcLGO7g1k92fwDTw7uShhsDmyoGuzi7G4rXZmL8qHW5NW8KF53X2byHtezZvo7yeGI8/r8UJEMt/zn6ccALz8AuFl18zqKi+jbzoMR+y3rXbD1FdcxeXa+/iUs0dXL5xD1frvpPs2s37/OwWzl+tw0V+dvXmd2SuaNL3u3tMsOiAwSMxfsocVNXewbmrN3C6ugZXbj/Aqcs1OFF1FScvXZf2r/BaVddvo+raLZy5XItTVTU4WXUNpy/V4uSFq0hcspTl4i0e06Qm0zc2h4kFmzvWEz2aAVWCMBNTGzZ9dkxaOygsbaTVI2NuLW0dGOeiy313YOociMLMCgqeT19hRkIwI6U7wtzKATZ2LrCwduC+PcxYEmzsHFm8nWkuEu0rrGxhyfes7JxgY+9EIjFhtKjh/wH5Uj73V6P7HAAAAABJRU5ErkJggg=="
  },
  walk: {
    w: 89,
    h: 131,
    src: "data:image/png;base64,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"
  },
  stride: {
    w: 84,
    h: 124,
    src: "data:image/png;base64,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"
  },
  cheer: {
    w: 66,
    h: 132,
    src: "data:image/png;base64,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"
  },
  throw: {
    w: 109,
    h: 127,
    src: "data:image/png;base64,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"
  },
};

function createRenzoImages() {
  const images = {};
  for (const [key, val] of Object.entries(RENZO_SPRITES)) {
    const img = new Image();
    img.src = val.src;
    images[key] = { img, w: val.w, h: val.h };
  }
  return images;
}

const sprites = {
  ball: createBallCanvas(),
  joao: createJoaoCanvas(false),
  joaoClimb: createJoaoCanvas(true),
  ciuffo: createCiuffoCanvas(false),
  ciuffoClimb: createCiuffoCanvas(true),
  leon: createLeonCanvas(false),
  leonClimb: createLeonCanvas(true),
  carlon: createCarlonCanvas(),
  barsalini: createBarsaliniCanvas(false),
  barsaliniClimb: createBarsaliniCanvas(true),
  renzoImages: createRenzoImages(),
  // Livello 1
  codeborgo: createCodeborgoCanvas(),
  aramaici: createAramaiciCanvas(),
  pedemonte11: createPedemonte11Canvas(),
  alex: createAlexCanvas(),
  // Livello 2
  aquila: createAquilaCanvas(),
  gnosca: createGnoscaCanvas(),
  chironicoGk: createChironicoGkCanvas(),
  camorino: createCamorinoCanvas(),
  taira: createTairaCanvas(),
  slipper: createSlipperCanvas(),
  pitch: createPitchCanvas(),
  girder: createPitchCanvas(),
  ladder: createLadderCanvas()
};

// -------------------------------------------------------------------------
// GEOMETRIA LIVELLI (Livello 1 e Livello 2 con più piani)
// -------------------------------------------------------------------------

class Platform {
  constructor(x1, y1, x2, y2) {
    this.x1 = Math.min(x1, x2);
    this.y1 = (x1 < x2) ? y1 : y2;
    this.x2 = Math.max(x1, x2);
    this.y2 = (x1 < x2) ? y2 : y1;
  }
  containsX(x) { return x >= this.x1 - 5 && x <= this.x2 + 5; }
  getSurfaceY(x) {
    if (x < this.x1) return this.y1;
    if (x > this.x2) return this.y2;
    const t = (x - this.x1) / (this.x2 - this.x1);
    return this.y1 + t * (this.y2 - this.y1);
  }
  draw(ctx) {
    const len = Math.hypot(this.x2 - this.x1, this.y2 - this.y1);
    const angle = Math.atan2(this.y2 - this.y1, this.x2 - this.x1);
    ctx.save();
    ctx.translate(this.x1, this.y1);
    ctx.rotate(angle);
    for (let d = 0; d < len; d += 32) {
      ctx.drawImage(sprites.pitch, d, 0);
    }
    ctx.restore();
  }
}

class Ladder {
  constructor(x, topY, bottomY, isBroken = false) {
    this.x = x;
    this.topY = Math.min(topY, bottomY);
    this.bottomY = Math.max(topY, bottomY);
    this.width = 24;
    this.isBroken = isBroken;
  }
  canClimb(px, py) {
    if (this.isBroken) return false;
    return Math.abs(px - this.x) <= 22 && py >= this.topY - 14 && py <= this.bottomY + 14;
  }
  draw(ctx) {
    if (this.isBroken) {
      const mid = (this.topY + this.bottomY) / 2;
      for (let y = this.topY; y < mid - 14; y += 16) {
        ctx.drawImage(sprites.ladder, this.x - 12, y);
      }
      for (let y = mid + 14; y < this.bottomY; y += 16) {
        ctx.drawImage(sprites.ladder, this.x - 12, y);
      }
      // Segnale scala spezzata
      ctx.fillStyle = '#ff2222';
      ctx.fillRect(this.x - 8, mid - 2, 16, 4);
    } else {
      for (let y = this.topY; y < this.bottomY; y += 16) {
        ctx.drawImage(sprites.ladder, this.x - 12, y);
      }
    }
  }
}

let platforms = [];
let ladders = [];

function buildLevelGeometry(level) {
  platforms = [];
  ladders = [];

  // Piattaforme autentiche stile Arcade Donkey Kong (6 Tiers + Terra a pendenze alternate)
  // [0] Cima Renzo (Pianeggiante in alto a sinistra)
  // [1] Girder 5 (Tier 5: inclinato a DESTRA)
  // [2] Girder 4 (Tier 4: inclinato a SINISTRA)
  // [3] Girder 3 (Tier 3: inclinato a DESTRA)
  // [4] Girder 2 (Tier 2: inclinato a SINISTRA)
  // [5] Girder 1 (Tier 1: inclinato a DESTRA)
  // [6] Terra (Piano 0: pianeggiante)

  const slope = (level === 2) ? 46 : 38;

  platforms.push(
    new Platform(50, 100, 480, 100),                          // [0] Cima Renzo & Porta da Calcio
    new Platform(140, 175, 1160, 175 + slope),                // [1] Girder 5
    new Platform(120, 325, 1160, 325 - slope),                // [2] Girder 4
    new Platform(120, 390, 1160, 390 + slope),                // [3] Girder 3
    new Platform(120, 535, 1160, 535 - slope),                // [4] Girder 2
    new Platform(120, 600, 1160, 600 + slope),                // [5] Girder 1
    new Platform(50, 695, 1230, 695)                          // [6] Terra
  );

  // Calcolo quote di superficie per aggancio millimetrico delle scale:
  const g1_rightY = platforms[5].getSurfaceY(1100);
  const g1_leftY  = platforms[5].getSurfaceY(180);
  const g2_rightY = platforms[4].getSurfaceY(1100);
  const g2_leftY  = platforms[4].getSurfaceY(180);
  const g3_rightY = platforms[3].getSurfaceY(1100);
  const g3_leftY  = platforms[3].getSurfaceY(180);
  const g4_rightY = platforms[2].getSurfaceY(1100);
  const g4_leftY  = platforms[2].getSurfaceY(180);
  const g5_rightY = platforms[1].getSurfaceY(1100);
  const g5_renzoY = platforms[1].getSurfaceY(380);

  // SCALE OBBLIGATORIE A ZIG-ZAG (Impossibile salire solo a sinistra!)
  // Per ogni piano il giocatore DEVE attraversare l'intera trave da destra a sinistra o viceversa!
  ladders.push(
    // 1. Dalla Terra a Girder 1: SOLO A DESTRA (x = 1100)
    new Ladder(1100, g1_rightY, 695),

    // 2. Da Girder 1 a Girder 2: SOLO A SINISTRA (x = 180)
    new Ladder(180, g2_leftY, g1_leftY),

    // 3. Da Girder 2 a Girder 3: SOLO A DESTRA (x = 1100)
    new Ladder(1100, g3_rightY, g2_rightY),

    // 4. Da Girder 3 a Girder 4: SOLO A SINISTRA (x = 180)
    new Ladder(180, g4_leftY, g3_leftY),

    // 5. Da Girder 4 a Girder 5: SOLO A DESTRA (x = 1100)
    new Ladder(1100, g5_rightY, g4_rightY),

    // 6. Da Girder 5 a Cima Renzo: A SINISTRA SOTTO RENZO (x = 380)
    new Ladder(380, 100, g5_renzoY)
  );

  // SCALE SPEZZATE (DECOY): Trabocchetti visivi a metà trave (non scalabili!)
  ladders.push(
    new Ladder(420, platforms[5].getSurfaceY(420), 695, true),
    new Ladder(640, platforms[4].getSurfaceY(640), platforms[5].getSurfaceY(640), true),
    new Ladder(640, platforms[3].getSurfaceY(640), platforms[4].getSurfaceY(640), true),
    new Ladder(640, platforms[2].getSurfaceY(640), platforms[3].getSurfaceY(640), true),
    new Ladder(640, platforms[1].getSurfaceY(640), platforms[2].getSurfaceY(640), true)
  );
}

// -------------------------------------------------------------------------
// STATO E GESTIONE DEL GIOCO
// -------------------------------------------------------------------------

let hero = {
  name: 'JOAO',
  x: 100,
  y: 695 - 52,
  vx: 0,
  vy: 0,
  speed: 230,
  jumpForce: -380,
  isGrounded: true,
  isClimbing: false,
  facingRight: true,
  invulnTimer: 0,
  scale: 1.3,
  hasBall: true,
  ballCooldown: 0
};

let renzo = {
  x: 230,
  y: 14,
  isThrowing: false,
  throwTimer: 2.0,
  animTimer: 0,
  tacticTimer: 0,
  quote: '',
  quoteTimer: 0
};

let goalState = {
  scored: false,
  animTimer: 0,
  bulge: 0,
  netParticles: []
};

let kickedBalls = [];
let slippers = [];
let rivals = [];

function setupRivalsForLevel(level) {
  rivals = [];

  if (level === 1) {
    // LIVELLO 1: Un rivale su ciascuna trave obbligatoria
    rivals.push(
      // Girder 1 (Tier 1): Codeborgo
      { name: 'Codeborgo', sprite: sprites.codeborgo, plat: platforms[5], x: 600, speed: 110, dir: 1, pts: 200, tagCol: '#f0c81e', defeated: false, fallVy: 0, spin: 0 },
      // Girder 2 (Tier 2): Aramaici
      { name: 'Aramaici', sprite: sprites.aramaici, plat: platforms[4], x: 700, speed: 155, dir: -1, pts: 300, tagCol: '#f0c81e', defeated: false, fallVy: 0, spin: 0 },
      // Girder 3 (Tier 3): Pedemonte #11 (Scatto d'ira se sei sul suo piano!)
      { name: 'Pedemonte #11', sprite: sprites.pedemonte11, plat: platforms[3], x: 650, speed: 175, dir: 1, pts: 500, tagCol: '#ff4444', isPedemonte: true, defeated: false, fallVy: 0, spin: 0, alertTimer: 0 },
      // Girder 4 (Tier 4): Alex il Traditore (AS Verzaschesi)
      { name: 'Alex (Verzaschesi)', sprite: sprites.alex, plat: platforms[2], x: 600, speed: 195, dir: -1, pts: 800, tagCol: '#28c8ff', isAlex: true, defeated: false, fallVy: 0, spin: 0 }
    );
  } else {
    // LIVELLO 2: Rivali potenziati + Attaccante Camorino sulla trave 5 prima di Renzo!
    rivals.push(
      // Girder 2 (Tier 2): Terzino dell'Aquila (urla "LANCIAMI!")
      { name: "Terzino Aquila", sprite: sprites.aquila, plat: platforms[4], x: 650, speed: 195, dir: -1, pts: 400, tagCol: '#28ff78', isAquila: true, bubbleTimer: 0, defeated: false, fallVy: 0, spin: 0 },
      // Girder 3 (Tier 3): Capitano dello Gnosca
      { name: "Capitano Gnosca", sprite: sprites.gnosca, plat: platforms[3], x: 700, speed: 215, dir: 1, pts: 550, tagCol: '#f5d228', defeated: false, fallVy: 0, spin: 0 },
      // Girder 4 (Tier 4): Portiere del Chironico (Guantoni enormi: hitbox allargata, K.O. consigliato con pallone!)
      { name: "Portiere Chironico", sprite: sprites.chironicoGk, plat: platforms[2], x: 550, speed: 220, dir: -1, pts: 700, tagCol: '#e6ff00', isChironicoGk: true, defeated: false, fallVy: 0, spin: 0 },
      // Girder 5 (Tier 5, sotto Renzo): Attaccante del Camorino (Scatta furioso con preavviso!)
      { name: "Attaccante Camorino", sprite: sprites.camorino, plat: platforms[1], x: 750, speed: 260, dir: -1, pts: 1000, tagCol: '#ff3c64', isCamorino: true, defeated: false, fallVy: 0, spin: 0, alertTimer: 0 }
    );
  }
}

// -------------------------------------------------------------------------
// INPUT MANAGEMENT
// -------------------------------------------------------------------------

const keys = {};

window.addEventListener('keydown', (e) => {
  initAudio();
  keys[e.code] = true;
  handleGlobalKey(e.code);
});

window.addEventListener('keyup', (e) => {
  keys[e.code] = false;
});

// Touch buttons
document.querySelectorAll('.touch-btn').forEach((btn) => {
  const code = btn.getAttribute('data-key');

  const activate = (e) => {
    e.preventDefault();
    initAudio();
    btn.classList.add('pressed');
    keys[code] = true;
    handleGlobalKey(code);
    if (navigator.vibrate) navigator.vibrate(15);
  };

  const deactivate = (e) => {
    e.preventDefault();
    btn.classList.remove('pressed');
    keys[code] = false;
  };

  btn.addEventListener('touchstart', activate, { passive: false });
  btn.addEventListener('touchend', deactivate, { passive: false });
  btn.addEventListener('touchcancel', deactivate, { passive: false });
  btn.addEventListener('mousedown', activate);
  btn.addEventListener('mouseup', deactivate);
});

canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  initAudio();
  handleGlobalKey('Space');
}, { passive: false });

function handleGlobalKey(code) {
  // Tasto P per mettere in PAUSA la partita
  if (code === 'KeyP') {
    if (gameState === STATE_PLAYING) {
      isPaused = !isPaused;
      playSound('score');
      return;
    }
  }

  if (gameState === STATE_SELECT) {
    if (code === 'ArrowLeft' || code === 'KeyA') {
      selectedHeroIndex = (selectedHeroIndex + 4) % 5;
      carlonNoticeTimer = 0;
      playSound('score');
    }
    if (code === 'ArrowRight' || code === 'KeyD') {
      selectedHeroIndex = (selectedHeroIndex + 1) % 5;
      carlonNoticeTimer = 0;
      playSound('score');
    }
    if (code === 'Space' || code === 'Enter' || code === 'KeyK') {
      if (selectedHeroIndex === 3) {
        // EASTER EGG 1: CARLON non è interessato a giocare!
        carlonNoticeTimer = 4.5;
        playSound('hit');
        return; // Blocca la partenza e forza a scegliere un altro personaggio!
      }
      carlonNoticeTimer = 0;
      applyHeroSelection();
      currentLevel = 1;
      gameState = STATE_BRIEFING;
      playSound('jump');
    }
  } else if (gameState === STATE_BRIEFING) {
    if (code === 'Space' || code === 'Enter' || code === 'KeyK') {
      startLevel(currentLevel);
      playSound('jump');
    }
  } else if (gameState === STATE_PLAYING) {
    if (!isPaused && (code === 'KeyK' || code === 'KeyX' || code === 'Enter') && hero.hasBall && !hero.isClimbing) {
      shootBall();
    }
  } else if (gameState === STATE_LEVEL_CLEAR) {
    if (code === 'Space' || code === 'Enter' || code === 'KeyK') {
      currentLevel = 2;
      startLevel(2);
      playSound('jump');
    }
  } else if (gameState === STATE_VICTORY || gameState === STATE_GAMEOVER) {
    if (code === 'Space' || code === 'Enter' || code === 'KeyK') {
      gameState = STATE_SELECT;
    }
  }
}

function applyHeroSelection() {
  if (selectedHeroIndex === 1) {
    hero.name = 'CIUFFO';
    hero.speed = 265;
    hero.jumpForce = -365;
  } else if (selectedHeroIndex === 2) {
    hero.name = 'LEON';
    hero.speed = 220;
    hero.jumpForce = -400; // Super salto di Leon!
  } else if (selectedHeroIndex === 4) {
    // EASTER EGG 2: BARSALINI!
    hero.name = 'BARSALINI';
    hero.speed = 245;
    hero.jumpForce = -385;
  } else {
    hero.name = 'JOAO';
    hero.speed = 230;
    hero.jumpForce = -380;
  }
}

function startLevel(lvl) {
  currentLevel = lvl;
  buildLevelGeometry(lvl);
  gameState = STATE_PLAYING;
  isPaused = false;
  bonusTimer = lvl === 1 ? 5000 : 7000;
  slippers = [];
  slipperSparks = [];
  kickedBalls = [];
  floatingTexts = [];
  throwWarnings = [];

  // Spawna a sinistra sulla Terra: DEVE attraversare verso destra per salire!
  hero.x = 100;
  hero.y = platforms[platforms.length - 1].y1 - 52;
  hero.vx = 0;
  hero.vy = 0;
  hero.isGrounded = true;
  hero.isClimbing = false;
  hero.invulnTimer = 0;
  hero.hasBall = true;
  hero.ballCooldown = 0;

  renzo.x = 280;
  renzo.y = platforms[0].y1 - 86;
  renzo.throwTimer = (hero.name === 'BARSALINI') ? 1.2 : 1.8;
  renzo.isThrowing = false;
  renzo.quote = (hero.name === 'BARSALINI') ? "BARSA!!" : "";
  renzo.quoteTimer = (hero.name === 'BARSALINI') ? 3.5 : 0;

  if (hero.name === 'BARSALINI') {
    floatingTexts.push({ text: 'MISTER RENZO: "BARSA!!" 💢', x: 250, y: 35, timer: 3.0, color: '#ff3333' });
  }

  goalState = {
    scored: false,
    animTimer: 0,
    bulge: 0,
    netParticles: []
  };

  setupRivalsForLevel(lvl);
}

function shootBall() {
  hero.hasBall = false;
  hero.ballCooldown = 1.6;
  playSound('kick');

  let shootDir = hero.facingRight ? 1 : -1;
  let shootVx = shootDir * 600;
  let shootVy = -120;

  if (hero.y < 120) {
    hero.facingRight = false; // sulla cima mira verso la porta a sinistra
    shootVx = -650;
    shootVy = -50;
  }

  // Spawna il pallone davanti al piede dell'eroe a seconda della direzione
  const spawnX = hero.facingRight ? (hero.x + 48) : (hero.x - 14);

  kickedBalls.push({
    x: spawnX,
    y: hero.y + 26,
    vx: shootVx,
    vy: shootVy,
    rot: 0,
    active: true,
    pickupTimer: 0.8 // Previene il riassorbimento immediato!
  });
}

// -------------------------------------------------------------------------
// GAME LOOP
// -------------------------------------------------------------------------

let lastTime = performance.now();

function gameLoop(now) {
  const dt = Math.min(0.08, (now - lastTime) / 1000);
  lastTime = now;

  update(dt);
  render();

  requestAnimationFrame(gameLoop);
}
requestAnimationFrame(gameLoop);

function update(dt) {
  if (gameState === STATE_SELECT) {
    if (carlonNoticeTimer > 0) carlonNoticeTimer -= dt;
    return;
  }
  if (gameState !== STATE_PLAYING || isPaused) return;

  bonusCountdown -= dt;
  if (bonusCountdown <= 0) {
    bonusCountdown = 1.0;
    bonusTimer = Math.max(0, bonusTimer - 100);
  }

  // Ricarica palla
  if (!hero.hasBall) {
    hero.ballCooldown -= dt;
    if (hero.ballCooldown <= 0) {
      hero.hasBall = true;
      floatingTexts.push({ text: '⚽ PALLA PRONTA!', x: hero.x - 10, y: hero.y - 20, timer: 0.8, color: '#66ff88' });
    }
  }

  // -----------------------------------------------------------------------
  // RENZO AI TATTICA E INTELLIGENTE (Lanci Mirati & Difesa della Porta)
  // EASTER EGG BARSALINI: Renzo lo prende particolarmente di mira!
  // -----------------------------------------------------------------------
  const isBarsa = (hero.name === 'BARSALINI');
  const barsaSpeedMult = isBarsa ? 0.72 : 1.0; // 28% più rapido a lanciare contro Barsalini!

  renzo.tacticTimer = (renzo.tacticTimer || 0) + dt;
  if (renzo.quoteTimer > 0) renzo.quoteTimer -= dt;

  // Rileva a quale piano si trova il giocatore
  let heroFloor = 0;
  if (hero.y < 120) heroFloor = 6;      // Cima / Dischetto di rigore e Porta
  else if (hero.y < 240) heroFloor = 5; // Tier 5 (ultimo piano sotto Renzo)
  else if (hero.y < 350) heroFloor = 4; // Tier 4
  else if (hero.y < 460) heroFloor = 3; // Tier 3
  else if (hero.y < 560) heroFloor = 2; // Tier 2
  else if (hero.y < 650) heroFloor = 1; // Tier 1
  else heroFloor = 0;                   // Terra

  // PATTUGLIAMENTO TATTICO DI RENZO SULLA LINEA TECNICA (x: 220 - 410)
  let targetRenzoX = 280;
  if (heroFloor === 6) {
    targetRenzoX = Math.max(210, Math.min(360, hero.x + (hero.facingRight ? 45 : -45)));
  } else if (heroFloor === 5) {
    targetRenzoX = Math.max(240, Math.min(410, hero.x - 20));
  } else {
    const normX = Math.max(0, Math.min(1, hero.x / V_WIDTH));
    targetRenzoX = 230 + normX * 180;
  }
  renzo.isMoving = Math.abs(targetRenzoX - renzo.x) > 3;
  renzo.x += (targetRenzoX - renzo.x) * (isBarsa ? 2.8 : 2.4) * dt;

  renzo.throwTimer -= dt;

  // Reazioni vocali di Mister Renzo alla posizione del giocatore
  if (heroFloor === 6 && !goalState.scored) {
    if (renzo.quoteTimer <= 0) {
      if (isBarsa) {
        renzo.quote = "NO BARSA!! NON TIRARE IN PORTA!";
      } else {
        const goalQuotes = [
          "NO! NON TIRARE IN PORTA!",
          "PARALA QUALCUNO!",
          "RIGORE INESISTENTE!",
          "CHIUDI LO SPECCHIO!"
        ];
        renzo.quote = goalQuotes[Math.floor(Math.random() * goalQuotes.length)];
      }
      renzo.quoteTimer = 2.0;
    }
  } else if (heroFloor === 5 && !goalState.scored) {
    if (renzo.quoteTimer <= 0) {
      if (isBarsa) {
        const barsaQuotes5 = [
          "BARSA!! DI QUI NON PASSI MAI!",
          "CATENACCIO SPECIALE PER IL BARSA!",
          "NON TI FACCIO TIRARE BARSA!",
          "CHIUDETE LA PORTA AL BARSA!"
        ];
        renzo.quote = barsaQuotes5[Math.floor(Math.random() * barsaQuotes5.length)];
      } else {
        const catenaccioQuotes = [
          "DIFESA A CATENACCIO!",
          "DI QUI NON SI PASSA!",
          "CHIUDETE LA PORTA!",
          "NON TI FACCIO TIRARE!",
          "MURO DIFENSIVO!"
        ];
        renzo.quote = catenaccioQuotes[Math.floor(Math.random() * catenaccioQuotes.length)];
      }
      renzo.quoteTimer = 1.8;
    }
  } else if (hero.isClimbing && renzo.quoteTimer <= 0) {
    if (isBarsa) {
      renzo.quote = "GIÙ DA QUELLA SCALA BARSA!!";
    } else {
      const ladderQuotes = [
        "GIÙ DA QUELLA SCALA!",
        "TI HO PRESO SUI GRADINI!",
        "FALLO TATTICO! SCENDI!",
        "ATTENTO ALLA TESTA!"
      ];
      renzo.quote = ladderQuotes[Math.floor(Math.random() * ladderQuotes.length)];
    }
    renzo.quoteTimer = 1.6;
  }

  // Preavviso di lancio (Renzo carica il braccio con la ciabatta!)
  if (renzo.throwTimer <= 0.45 && !renzo.isThrowing && !goalState.scored && heroFloor < 6) {
    renzo.isThrowing = true;
    renzo.animTimer = 0.45;
  }

  if (renzo.isThrowing && !goalState.scored && heroFloor < 6) {
    renzo.animTimer -= dt;
    if (renzo.animTimer <= 0) {
      renzo.isThrowing = false;
      playSound('throw');

      const renzoFacing = (hero.x >= renzo.x) ? 1 : -1;
      const renzoHandX = renzo.x + (renzoFacing * 38);
      const renzoHandY = 48;

      let inputDir = 0;
      if (keys['ArrowLeft'] || keys['KeyA']) inputDir -= 1;
      if (keys['ArrowRight'] || keys['KeyD']) inputDir += 1;

      // -------------------------------------------------------------------
      // STRATEGIA 1: PUNIZIONE SCALA
      // -------------------------------------------------------------------
      const climbingLadder = hero.isClimbing ? ladders.find(l => Math.abs((hero.x + 24) - l.x) < 30) : null;

      if (climbingLadder) {
        renzo.throwTimer = ((currentLevel === 2) ? 1.1 : 1.4) * barsaSpeedMult;
        renzo.quote = isBarsa ? "BARSA GIÙ DA QUELLA SCALA!" : "GIÙ DA QUELLA SCALA!";
        renzo.quoteTimer = 1.6;

        if (climbingLadder.x === 380) {
          slippers.push({
            x: 380,
            y: 105,
            vx: 0,
            vy: 330,
            isFalling: true,
            rot: 0,
            dir: 1,
            active: true,
            jumped: false,
            isLob: false,
            minLandingY: 0,
            isBouncer: false,
            bouncesLeft: 0,
            droppedDownLadder: true
          });
        } else {
          const flightTime = 0.85;
          const targetX = climbingLadder.x;
          const targetY = hero.y + 20;

          throwWarnings.push({
            x: targetX,
            y: targetY,
            timer: flightTime,
            maxTimer: flightTime,
            label: isBarsa ? '⚠️ BERSAGLIO: BARSA!' : '⚠️ SCALA SOTTO TIRO!'
          });

          const g = 750;
          const dx = targetX - renzoHandX;
          const dy = targetY - renzoHandY;
          const vx = dx / flightTime;
          const vy = (dy - 0.5 * g * flightTime * flightTime) / flightTime;

          slippers.push({
            x: renzoHandX,
            y: renzoHandY,
            vx: vx,
            vy: vy,
            isFalling: true,
            rot: 0,
            dir: (vx >= 0 ? 1 : -1),
            active: true,
            jumped: false,
            isLob: true,
            minLandingY: targetY - 28,
            isBouncer: false,
            bouncesLeft: 0,
            droppedDownLadder: false
          });
        }
      }
      // -------------------------------------------------------------------
      // STRATEGIA 2: ULTIMO PIANO - DIFESA DELLA PORTA A CATENACCIO (Tier 5)
      // -------------------------------------------------------------------
      else if (heroFloor === 5) {
        renzo.throwTimer = ((currentLevel === 2) ? 0.90 : 1.10) * barsaSpeedMult;

        const plat5 = platforms[1];
        const dirToHero = (hero.x > renzoHandX) ? 1 : -1;
        const isMissile = Math.random() < 0.55;

        if (isMissile) {
          renzo.quote = isBarsa ? "SILURO PER IL BARSA!" : "SILURO RASOTERRA!";
          renzo.quoteTimer = 1.3;
          const speed = (currentLevel === 2) ? 340 : 300;

          const startX = Math.max(plat5.x1 + 30, Math.min(plat5.x2 - 30, renzoHandX));
          const startY = plat5.getSurfaceY(startX) - 14;

          slippers.push({
            x: startX,
            y: startY,
            vx: dirToHero * speed,
            vy: 0,
            isFalling: false,
            rot: 0,
            dir: dirToHero,
            active: true,
            jumped: false,
            isLob: false,
            minLandingY: 0,
            isBouncer: false,
            bouncesLeft: 0,
            droppedDownLadder: false
          });
        } else {
          renzo.quote = isBarsa ? "BARSA SCHIVA QUESTA!" : "PALLONETTO A EFFETTO!";
          renzo.quoteTimer = 1.3;

          const startX = Math.max(plat5.x1 + 30, Math.min(plat5.x2 - 30, renzoHandX));
          const startY = plat5.getSurfaceY(startX) - 14;

          slippers.push({
            x: startX,
            y: startY,
            vx: dirToHero * 220,
            vy: -220,
            isFalling: true,
            rot: 0,
            dir: dirToHero,
            active: true,
            jumped: false,
            isLob: false,
            minLandingY: 0,
            isBouncer: true,
            bouncesLeft: 5,
            droppedDownLadder: false
          });
        }

        if ((currentLevel === 2 || isBarsa || Math.random() < 0.35) && !goalState.scored) {
          setTimeout(() => {
            if (gameState === STATE_PLAYING && !goalState.scored && hero.y > 120 && !isPaused) {
              const startX2 = Math.max(plat5.x1 + 30, Math.min(plat5.x2 - 30, renzo.x + (dirToHero * 38)));
              const startY2 = plat5.getSurfaceY(startX2) - 14;
              slippers.push({
                x: startX2,
                y: startY2,
                vx: dirToHero * 270,
                vy: 0,
                isFalling: false,
                rot: 0,
                dir: dirToHero,
                active: true,
                jumped: false,
                isLob: false,
                minLandingY: 0,
                isBouncer: false,
                bouncesLeft: 0,
                droppedDownLadder: false
              });
              renzo.quote = isBarsa ? "BARSA DOPPIO CATENACCIO!" : "DOPPIO CATENACCIO!";
              renzo.quoteTimer = 1.4;
            }
          }, 360);
        }
      }
      // -------------------------------------------------------------------
      // STRATEGIA 3: PIANI INFERIORI (Tier 0 - Tier 4)
      // -------------------------------------------------------------------
      else {
        const doTargetedLob = isBarsa ? (Math.random() < 0.85) : (Math.random() < 0.68);

        if (doTargetedLob) {
          renzo.throwTimer = ((currentLevel === 2) ? 1.30 : 1.65) * barsaSpeedMult;

          if (isBarsa) {
            const barsaQuotesLob = [
              "BARSA!! DOVE CREDI DI ANDARE?!",
              "BARSA! TI TENGO D'OCCHIO!",
              "TIRO MIRATO SU BARSALINI!",
              "BARSA QUESTA E PER TE!"
            ];
            renzo.quote = barsaQuotesLob[Math.floor(Math.random() * barsaQuotesLob.length)];
          } else {
            const lobQuotes = [
              "PRENDI QUESTO LOB!",
              "MARCATURA A UOMO!",
              "TI HO VISTO SULLA FASCIA!",
              "DIAGONALE DIFENSIVA!",
              "TI BEVIMENTO QUESTA!"
            ];
            renzo.quote = lobQuotes[Math.floor(Math.random() * lobQuotes.length)];
          }
          renzo.quoteTimer = 1.6;

          const flightTime = (currentLevel === 2) ? 0.95 : 1.15;
          const leadDist = inputDir * hero.speed * 0.35;
          const targetX = Math.max(120, Math.min(1160, hero.x + 20 + leadDist));
          const targetY = hero.y + 36;

          throwWarnings.push({
            x: targetX,
            y: targetY,
            timer: flightTime,
            maxTimer: flightTime,
            label: isBarsa ? '⚠️ OCCHIO BARSA!' : '⚠️ ATTENTO!'
          });

          const g = 750;
          const dx = targetX - renzoHandX;
          const dy = targetY - renzoHandY;
          const vx = dx / flightTime;
          const vy = (dy - 0.5 * g * flightTime * flightTime) / flightTime;

          slippers.push({
            x: renzoHandX,
            y: renzoHandY,
            vx: vx,
            vy: vy,
            isFalling: true,
            rot: 0,
            dir: (vx >= 0 ? 1 : -1),
            active: true,
            jumped: false,
            isLob: true,
            minLandingY: targetY - 32,
            isBouncer: (currentLevel === 2 && Math.random() < 0.4),
            bouncesLeft: 1,
            droppedDownLadder: false
          });
        } else {
          renzo.throwTimer = ((currentLevel === 2) ? 1.45 : 1.85) * barsaSpeedMult;
          renzo.quote = isBarsa ? "ROTOLA IN AREA BARSA!" : "ROTOLA IN AREA!";
          renzo.quoteTimer = 1.4;

          const slipperSpeed = (currentLevel === 2) ? 240 : 200;
          slippers.push({
            x: renzoHandX,
            y: renzoHandY,
            vx: slipperSpeed,
            vy: 0,
            isFalling: true,
            rot: 0,
            dir: 1,
            active: true,
            jumped: false,
            isLob: false,
            minLandingY: 0,
            isBouncer: (currentLevel === 2 && Math.random() < 0.3),
            bouncesLeft: 4,
            droppedDownLadder: false
          });
        }
      }
    }
  }

  // Aggiorna mirini di allerta per tiri a parabola
  for (let i = throwWarnings.length - 1; i >= 0; i--) {
    throwWarnings[i].timer -= dt;
    if (throwWarnings[i].timer <= 0) {
      throwWarnings.splice(i, 1);
    }
  }

  // Aggiorna scintille ciabatte polverizzate
  for (let i = slipperSparks.length - 1; i >= 0; i--) {
    const sp = slipperSparks[i];
    sp.x += sp.vx * dt;
    sp.y += sp.vy * dt;
    sp.vy += 380 * dt;
    sp.life -= dt;
    if (sp.life <= 0) slipperSparks.splice(i, 1);
  }

  // Aggiorna ciabatte
  for (let i = slippers.length - 1; i >= 0; i--) {
    const s = slippers[i];
    if (!s.active) {
      slippers.splice(i, 1);
      continue;
    }
    s.rot += s.dir * 14 * dt;

    // Discesa ciabatta dalle scale
    if (!s.isFalling && !s.droppedDownLadder) {
      for (let l of ladders) {
        if (!l.isBroken && Math.abs(s.x - l.x) < 18 && Math.abs(s.y - (l.topY - 14)) < 22) {
          const heroBeneath = (Math.abs(hero.x - l.x) < 140 && hero.y > s.y);
          const dropChance = heroBeneath ? 0.75 : ((currentLevel === 2) ? 0.35 : 0.2);
          if (Math.random() < dropChance) {
            s.isFalling = true;
            s.droppedDownLadder = true;
            s.x = l.x;
            s.vx = 0;
            s.vy = 280;
            break;
          }
        }
      }
    }

    if (s.isFalling) {
      s.vy += 800 * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;

      for (let plat of platforms) {
        if (plat.containsX(s.x)) {
          const surfY = plat.getSurfaceY(s.x) - 14;

          if (s.minLandingY && s.y < s.minLandingY) {
            continue;
          }

          if (s.y >= surfY - 10 && s.y <= surfY + 24 && s.vy >= 0) {
            if (s.isBouncer && s.bouncesLeft > 0) {
              s.vy = -220;
              s.bouncesLeft--;
              s.isFalling = true;
            } else {
              s.y = surfY;
              s.isFalling = false;
              s.isLob = false;
              s.minLandingY = 0;
              s.droppedDownLadder = false;

              const onHeroLevel = Math.abs((hero.y + 40) - surfY) < 55;
              if (onHeroLevel) {
                s.dir = (hero.x < s.x) ? -1 : 1;
              } else {
                s.dir = (plat.y2 - plat.y1 > 0) ? 1 : ((plat.y2 - plat.y1 < 0) ? -1 : -1);
              }
              s.vx = s.dir * (currentLevel === 2 ? 230 : 190);
            }
            break;
          }
        }
      }
    } else {
      s.x += s.dir * (currentLevel === 2 ? 230 : 190) * dt;
      let onPlat = null;
      for (let plat of platforms) {
        if (plat.containsX(s.x) && Math.abs(plat.getSurfaceY(s.x) - 14 - s.y) < 22) {
          onPlat = plat;
          s.y = plat.getSurfaceY(s.x) - 14;
          break;
        }
      }
      if (!onPlat) {
        s.isFalling = true;
        s.vy = 60;
        s.vx = s.dir * 120;
      }
    }

    if (s.active && hero.invulnTimer <= 0) {
      if (Math.hypot((hero.x + 20) - s.x, (hero.y + 25) - s.y) < 24) {
        hitHero('CIABATTATO DA RENZO!');
      }
    }

    if (s.y > V_HEIGHT + 30 || s.x < -40 || s.x > V_WIDTH + 40 || !s.active) {
      slippers.splice(i, 1);
    }
  }

  // Aggiorna palloni calciati
  for (let i = kickedBalls.length - 1; i >= 0; i--) {
    const b = kickedBalls[i];
    if (b.pickupTimer > 0) b.pickupTimer -= dt;

    b.x += b.vx * dt;
    b.vy += 450 * dt;
    b.y += b.vy * dt;
    b.rot += (b.vx > 0 ? 15 : -15) * dt;

    // RILEVAMENTO GOL NELLA PORTA (x: 60 a 195, y: 15 a 105)
    if (b.active && !goalState.scored) {
      if (b.x >= 60 && b.x <= 195 && b.y >= 15 && b.y <= 105) {
        triggerGoal(b);
      }
    }

    for (let plat of platforms) {
      if (plat.containsX(b.x)) {
        const surfY = plat.getSurfaceY(b.x) - 12;
        if (b.y >= surfY - 8 && b.y <= surfY + 16 && b.vy >= 0) {
          b.y = surfY;
          b.vy = -140;
          break;
        }
      }
    }

    // K.O. Rivali
    for (let r of rivals) {
      if (!r.defeated) {
        const hitRadius = r.isChironicoGk ? 40 : 36;
        if (Math.hypot(b.x - (r.x + 20), b.y - (r.y + 20)) < hitRadius) {
          r.defeated = true;
          r.fallVy = -320;
          playSound('ko');

          let koMsg = `GOOOL! +${r.pts * 2} PTS!`;
          if (r.isPedemonte) koMsg = `11 DEL PEDEMONTE ABBATTUTO! +1000 PTS!`;
          if (r.isAlex) koMsg = `ALEX IL TRADITORE MESSO K.O.! +1600 PTS!`;
          if (r.isCamorino) koMsg = `BOMBER DEL CAMORINO STESO! +2000 PTS!`;
          if (r.isAquila) koMsg = `AQUILA ZITTITA! +800 PTS!`;
          if (r.isChironicoGk) koMsg = `GOL SOTTO L'INCROCIO AL CHIRONICO! +1400 PTS!`;
          if (r.name.includes('Gnosca')) koMsg = `CAPITANO DELLO GNOSCA STESO! +1100 PTS!`;

          score += r.pts * 2;
          floatingTexts.push({ text: koMsg, x: r.x - 40, y: r.y - 25, timer: 1.4, color: '#00ff88' });
          b.active = false;
          break;
        }
      }
    }

    // Distrugge ciabatta (TRAFORAMENTO: puoi colpire più di una ciabatta con la stessa palla!)
    if (b.active) {
      for (let si = slippers.length - 1; si >= 0; si--) {
        const s = slippers[si];
        if (s.active && Math.hypot(b.x - s.x, b.y - s.y) < 38) {
          s.active = false;
          slippers.splice(si, 1); // Rimuove IMMEDIATAMENTE la ciabatta dal gioco!
          score += 150;
          playSound('score');
          floatingTexts.push({ text: '💥 CIABATTA POLVERIZZATA! +150', x: s.x - 30, y: s.y - 20, timer: 0.9, color: '#ffea00' });
          createSlipperSparks(s.x, s.y);
          // NOTA BENE: b.active rimane TRUE, la palla continua e travolge altre ciabatte!
        }
      }
    }

    // Recupero palla a terra (SOLO se pickupTimer è scaduto: impedisce auto-distruzione del tiro!)
    if (!hero.hasBall && b.pickupTimer <= 0 && Math.hypot((hero.x + 20) - b.x, (hero.y + 25) - b.y) < 32) {
      hero.hasBall = true;
      b.active = false;
      floatingTexts.push({ text: '⚽ PALLA RECUPERATA!', x: hero.x - 20, y: hero.y - 20, timer: 0.7, color: '#66ff88' });
    }

    if (!b.active || b.x < -50 || b.x > V_WIDTH + 50 || b.y > V_HEIGHT + 50) {
      kickedBalls.splice(i, 1);
    }
  }

  // Aggiorna rivali
  for (let r of rivals) {
    if (r.defeated) {
      r.fallVy += 850 * dt;
      r.y += r.fallVy * dt;
      r.spin += 10 * dt;
      continue;
    }

    let speed = r.speed;

    if (r.isAquila) {
      r.bubbleTimer = (r.bubbleTimer || 0) + dt;
    }

    if (r.isPedemonte || r.isCamorino) {
      const onSameLevel = Math.abs((hero.y + 40) - (r.y + 40)) < 35;
      if (onSameLevel) {
        r.alertTimer = (r.alertTimer || 0) + dt;
        if (r.alertTimer > 0.35) {
          speed = r.speed * 1.35;
          r.dir = (hero.x > r.x) ? 1 : -1;
        }
      } else {
        r.alertTimer = 0;
      }
    }

    r.x += r.dir * speed * dt;
    if (r.x < r.plat.x1 + 10) { r.x = r.plat.x1 + 10; r.dir = 1; }
    if (r.x > r.plat.x2 - 50) { r.x = r.plat.x2 - 50; r.dir = -1; }
    r.y = r.plat.getSurfaceY(r.x + 20) - 45;

    // Collisione con eroe
    if (hero.invulnTimer <= 0) {
      const hitRadius = r.isChironicoGk ? 34 : 26;
      if (Math.hypot((hero.x + 20) - (r.x + 20), (hero.y + 25) - (r.y + 25)) < hitRadius) {
        let msg = `COLPITO DAL ${r.name.toUpperCase()}!`;
        if (r.isAlex) msg = 'FALCIATO DA ALEX IL TRADITORE!';
        if (r.isPedemonte) msg = 'TRAVOLTO DAL N.11 DEL PEDEMONTE!';
        if (r.isCamorino) msg = 'ABBATTUTO DAL BOMBER DEL CAMORINO!';
        if (r.isAquila) msg = 'FALCIATO DAL TERZINO DELL\'AQUILA!';
        if (r.isChironicoGk) msg = 'PARATA ASSASSINA DEL PORTIERE!';
        hitHero(msg);
      }
    }
  }

  // Movimento eroe
  let moveX = 0;
  if (keys['ArrowLeft'] || keys['KeyA']) { moveX -= 1; hero.facingRight = false; }
  if (keys['ArrowRight'] || keys['KeyD']) { moveX += 1; hero.facingRight = true; }

  const wantsUp = keys['ArrowUp'] || keys['KeyW'];
  const wantsDown = keys['ArrowDown'] || keys['KeyS'];
  const wantsJump = keys['Space'];

  if (hero.invulnTimer > 0) hero.invulnTimer -= dt;

  const footX = hero.x + 24;
  const footY = hero.y + 52;

  // Scale
  let nearLadder = ladders.find(l => l.canClimb(footX, footY));
  if (nearLadder && (wantsUp || wantsDown)) {
    hero.isClimbing = true;
    hero.isGrounded = false;
    hero.x = nearLadder.x - 24;
  }

  if (hero.isClimbing) {
    hero.vy = 0;
    if (wantsUp) hero.y -= 160 * dt;
    if (wantsDown) hero.y += 160 * dt;
    if (!nearLadder || footY < nearLadder.topY - 14 || footY > nearLadder.bottomY + 14) {
      hero.isClimbing = false;
      hero.isGrounded = true;
    }
  } else {
    hero.x += moveX * hero.speed * dt;

    if (hero.isGrounded && wantsJump) {
      hero.vy = hero.jumpForce;
      hero.isGrounded = false;
      playSound('jump');
    }

    if (!hero.isGrounded) {
      hero.vy += 950 * dt;
      hero.y += hero.vy * dt;

      // Soffitto travi (impedisce di passare attraverso i piani dal basso saltando!)
      if (hero.vy < 0) {
        for (let plat of platforms) {
          if (plat.containsX(footX)) {
            const underY = plat.getSurfaceY(footX) + 24;
            if (hero.y <= underY && hero.y >= underY - 22) {
              hero.y = underY;
              hero.vy = 40; // Testata contro la trave d'acciaio!
              break;
            }
          }
        }
      }
    }

    hero.isGrounded = false;
    for (let plat of platforms) {
      if (plat.containsX(footX)) {
        const surfY = plat.getSurfaceY(footX);
        if (footY >= surfY - 10 && footY <= surfY + 18 && hero.vy >= 0) {
          hero.y = surfY - 52;
          hero.vy = 0;
          hero.isGrounded = true;
          break;
        }
      }
    }
  }

  // Salto sopra ciabatte (+100) e rivali
  if (!hero.isGrounded && hero.vy !== 0) {
    slippers.forEach(s => {
      if (!s.jumped && Math.abs(footX - s.x) < 32 && (footY - s.y) >= -55 && (footY - s.y) <= -2) {
        s.jumped = true;
        score += 100;
        playSound('score');
        floatingTexts.push({ text: '+100', x: s.x, y: s.y - 20, timer: 0.9, color: '#ffea00' });
      }
    });

    rivals.forEach(r => {
      if (!r.defeated && !r.jumped && Math.abs(footX - (r.x + 20)) < 36 && (footY - r.y) >= -65 && (footY - r.y) <= -5) {
        r.jumped = true;
        score += r.pts;
        playSound('score');
        floatingTexts.push({ text: `+${r.pts}`, x: r.x + 10, y: r.y - 20, timer: 0.9, color: '#00ffcc' });
      }
    });
  }

  hero.x = Math.max(40, Math.min(V_WIDTH - 80, hero.x));

  // SULLA CIMA: Se l'eroe non ha la palla, forniscila subito per tirare in porta!
  if (hero.y <= platforms[0].y1 + 10 && !goalState.scored) {
    if (!hero.hasBall) {
      hero.hasBall = true;
      hero.ballCooldown = 0;
      floatingTexts.push({ text: '⚽ PALLA PRONTA! TIRA IN PORTA!', x: 220, y: 65, timer: 1.5, color: '#ffff00' });
    }
  }

  // Dribbling fin dentro la porta con palla al piede
  if (!goalState.scored && hero.hasBall && hero.y <= 105 && hero.x <= 185) {
    triggerGoal(null);
  }

  // Animazione gol ed esultanza prima del cambio livello
  if (goalState.scored) {
    goalState.animTimer -= dt;
    goalState.bulge = Math.max(0, goalState.bulge - 6 * dt);

    for (let p of goalState.netParticles) {
      p.x += p.vx * dt;
      p.vy += 420 * dt;
      p.y += p.vy * dt;
      p.life -= dt;
    }

    if (goalState.animTimer <= 0) {
      if (currentLevel === 1) {
        gameState = STATE_LEVEL_CLEAR;
        score += bonusTimer;
      } else {
        gameState = STATE_VICTORY;
        score += bonusTimer;
        if (score > highScore) highScore = score;
      }
    }
  }

  // Testi fluttuanti
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    const ft = floatingTexts[i];
    ft.timer -= dt;
    ft.y -= 30 * dt;
    if (ft.timer <= 0) floatingTexts.splice(i, 1);
  }
}

function triggerGoal(ball) {
  if (goalState.scored) return;
  goalState.scored = true;
  goalState.animTimer = 2.6;
  goalState.bulge = 18;

  if (ball) {
    ball.active = false;
  }
  hero.hasBall = false;

  playSound('whistle');
  playSound('victory');
  score += 3000;

  // Esplosione coriandoli / particelle rete
  goalState.netParticles = [];
  for (let p = 0; p < 35; p++) {
    goalState.netParticles.push({
      x: 120 + (Math.random() - 0.5) * 60,
      y: 55 + (Math.random() - 0.5) * 40,
      vx: (Math.random() - 0.5) * 260,
      vy: -160 - Math.random() * 220,
      color: Math.random() > 0.5 ? '#ffff00' : (Math.random() > 0.5 ? '#22c55e' : '#ffffff'),
      size: 4 + Math.random() * 5,
      life: 2.5
    });
  }

  floatingTexts.push({ text: '⚽ GOOOOOOOOOOOOOOOOOOL!', x: 80, y: 35, timer: 2.5, color: '#ffff00' });
  floatingTexts.push({ text: 'RETE! PROMOZIONE CONQUISTATA! +3000 PTS!', x: 50, y: 10, timer: 2.5, color: '#00ff88' });
  renzo.quote = "GOL CAPOLAVORO! SEI IN QUARTA LEGA!";
  renzo.quoteTimer = 3.0;
}

function hitHero(msg) {
  lives--;
  playSound('hit');
  floatingTexts.push({ text: msg, x: hero.x - 30, y: hero.y - 20, timer: 1.3, color: '#ff3333' });
  throwWarnings = [];

  if (lives <= 0) {
    gameState = STATE_GAMEOVER;
  } else {
    hero.x = 100;
    hero.y = platforms[platforms.length - 1].y1 - 52;
    hero.vx = 0;
    hero.vy = 0;
    hero.isGrounded = true;
    hero.isClimbing = false;
    hero.invulnTimer = 1.5;
  }
}

// -------------------------------------------------------------------------
// PORTA DA CALCIO SULLA CIMA
// -------------------------------------------------------------------------

function drawSoccerGoal(ctx, x, y, w, h, isScored, bulge) {
  ctx.save();

  // Sfondo scuro e maglie rete della porta
  ctx.fillStyle = 'rgba(0, 20, 10, 0.45)';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - 22 - bulge, y + 10);
  ctx.lineTo(x - 22 - bulge, y + h);
  ctx.lineTo(x, y + h);
  ctx.fill();

  ctx.fillStyle = 'rgba(0, 30, 15, 0.3)';
  ctx.fillRect(x, y, w, h);

  // Maglie della rete bianca a rombi
  ctx.strokeStyle = isScored ? 'rgba(255, 255, 100, 0.85)' : 'rgba(255, 255, 255, 0.55)';
  ctx.lineWidth = 1.5;
  const step = 10;
  for (let gx = x - 20; gx < x + w; gx += step) {
    ctx.beginPath();
    ctx.moveTo(gx, y);
    ctx.lineTo(gx + 12 + (isScored ? Math.sin(performance.now() * 0.03 + gx) * 5 : 0), y + h);
    ctx.stroke();
  }
  for (let gy = y; gy < y + h; gy += step) {
    ctx.beginPath();
    ctx.moveTo(x - 20, gy);
    ctx.lineTo(x + w, gy + (isScored ? Math.cos(performance.now() * 0.03 + gy) * 4 : 0));
    ctx.stroke();
  }

  // Pali e traversa bianchi spessi
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';

  // Traversa
  ctx.beginPath();
  ctx.moveTo(x - 3, y);
  ctx.lineTo(x + w + 3, y);
  ctx.stroke();

  // Palo sinistro
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y + h);
  ctx.stroke();

  // Palo destro
  ctx.beginPath();
  ctx.moveTo(x + w, y);
  ctx.lineTo(x + w, y + h);
  ctx.stroke();

  // Supporti posteriori metallici
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - 22, y + 10);
  ctx.lineTo(x - 22, y + h);
  ctx.stroke();

  // Linea di porta bianca sul prato
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x + w, y + h);
  ctx.stroke();

  // Area di rigore bianca
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.strokeRect(x, y + h - 3, 190, 3);

  // Dischetto del rigore
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x + 200, y + h - 2, 4, 0, Math.PI * 2);
  ctx.fill();

  // Target visivo quando l'eroe è sulla cima
  if (!isScored && hero.y < 130) {
    const pulse = Math.abs(Math.sin(performance.now() * 0.008));
    ctx.fillStyle = '#ffff00';
    ctx.font = 'bold 15px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('⚽ TIRA IN PORTA!', x + w / 2, y - 18 - pulse * 6);
    ctx.fillText('▼', x + w / 2, y - 4 - pulse * 4);
    ctx.textAlign = 'left';
  }

  ctx.restore();
}

// -------------------------------------------------------------------------
// RENDERING
// -------------------------------------------------------------------------

function render() {
  ctx.fillStyle = '#05050a';
  ctx.fillRect(0, 0, V_WIDTH, V_HEIGHT);

  if (gameState === STATE_SELECT) {
    drawCharacterSelect();
    return;
  }

  // Piattaforme e scale verdi da campo da calcio
  platforms.forEach(p => p.draw(ctx));
  ladders.forEach(l => l.draw(ctx));

  // Porta da calcio in cima
  drawSoccerGoal(ctx, 70, 25, 120, 75, goalState.scored, goalState.bulge);

  // Coriandoli ed effetti del gol
  if (goalState.netParticles && goalState.netParticles.length > 0) {
    goalState.netParticles.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    });
  }

  // Mirini di allerta per lanci mirati a parabola di Mister Renzo
  throwWarnings.forEach(w => {
    const progress = Math.max(0, w.timer / w.maxTimer);
    const pulse = 1 + 0.25 * Math.sin((1 - progress) * 16);
    const radius = 20 * pulse;

    ctx.save();
    ctx.strokeStyle = '#ff2222';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.arc(w.x, w.y, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(w.x - radius - 6, w.y);
    ctx.lineTo(w.x + radius + 6, w.y);
    ctx.moveTo(w.x, w.y - radius - 6);
    ctx.lineTo(w.x, w.y + radius + 6);
    ctx.stroke();

    ctx.fillStyle = '#ffff00';
    ctx.font = 'bold 12px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText(w.label, w.x, w.y - radius - 6);
    ctx.restore();
  });

  // Mister Renzo (con lo sprite ufficiale e animazioni dinamiche)
  let renzoImgObj = sprites.renzoImages.idle;
  if (goalState.scored) {
    renzoImgObj = sprites.renzoImages.cheer;
  } else if (renzo.isThrowing) {
    renzoImgObj = sprites.renzoImages.throw;
  } else if (renzo.quote && renzo.quoteTimer > 0) {
    renzoImgObj = sprites.renzoImages.walk;
  } else if (renzo.isMoving) {
    const walkFrame = Math.floor(performance.now() * 0.007) % 2;
    renzoImgObj = (walkFrame === 0) ? sprites.renzoImages.walk : sprites.renzoImages.stride;
  }

  const renzoCenterX = renzo.x;
  const renzoFacesRight = (hero.x >= renzoCenterX);

  ctx.save();
  if (renzoImgObj && renzoImgObj.img) {
    const drawH = 94;
    const drawW = Math.round(drawH * (renzoImgObj.w / renzoImgObj.h));
    const drawY = 100 - drawH; // Piedi perfettamente appoggiati a quota 100 sulla superficie della trave

    if (!renzoFacesRight) {
      ctx.translate(renzoCenterX, drawY + drawH / 2);
      ctx.scale(-1, 1);
      ctx.drawImage(renzoImgObj.img, -drawW / 2, -drawH / 2, drawW, drawH);
    } else {
      ctx.drawImage(renzoImgObj.img, renzoCenterX - drawW / 2, drawY, drawW, drawH);
    }
  }
  ctx.restore();

  // Fumetto tattico di Mister Renzo!
  if (renzo.quote && renzo.quoteTimer > 0) {
    drawSpeechBubble(renzoCenterX, -4, renzo.quote);
  }

  // Rivali (FIX: Disegno sprite isolato per evitare che il testo finisca a sinistra!)
  rivals.forEach(r => {
    // 1. Disegna solo lo sprite con l'eventuale flip dentro save/restore
    ctx.save();
    if (r.defeated) {
      ctx.translate(r.x + 20, r.y + 20);
      ctx.rotate(r.spin);
      ctx.drawImage(r.sprite, -22, -22, 45, 45);
    } else {
      if (r.dir < 0) {
        ctx.translate(r.x + 45, r.y);
        ctx.scale(-1, 1);
        ctx.drawImage(r.sprite, 0, 0, 45, 45);
      } else {
        ctx.drawImage(r.sprite, r.x, r.y, 45, 45);
      }
    }
    ctx.restore();

    // 2. Disegna scritte e fumetti SEMPRE in coordinate assolute sopra la testa!
    if (!r.defeated) {
      const centerX = r.x + 22;

      // Terzino dell'Aquila: Fumetto "LANCIAMI!"
      if (r.isAquila) {
        const cycle = Math.sin(r.bubbleTimer * 3.5);
        if (cycle > -0.2) {
          drawSpeechBubble(centerX, r.y - 20, "LANCIAMI!");
        }
      }

      // Icona allerta '!' per Pedemonte e Camorino
      if ((r.isPedemonte || r.isCamorino) && r.alertTimer > 0) {
        ctx.fillStyle = '#ff0000';
        ctx.font = 'bold 22px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText('! !', centerX, r.y - 12);
      }

      // Nome rivale centrato sulla testa
      ctx.fillStyle = r.tagCol;
      ctx.font = 'bold 13px Courier New';
      ctx.textAlign = 'center';
      ctx.fillText(r.name, centerX, r.y - 6);
      ctx.textAlign = 'left'; // reset
    }
  });

  // Ciabatte
  slippers.forEach(s => {
    if (!s.active) return;
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.rot);
    ctx.drawImage(sprites.slipper, -16, -16, 32, 32);
    ctx.restore();
  });

  // Scintille ciabatte polverizzate
  slipperSparks.forEach(sp => {
    ctx.fillStyle = sp.color;
    ctx.fillRect(sp.x, sp.y, sp.size, sp.size);
  });

  // Palloni calciati
  kickedBalls.forEach(b => {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.rot);
    ctx.drawImage(sprites.ball, -12, -12, 24, 24);
    ctx.restore();
  });

  // Eroe
  let heroSprite = (selectedHeroIndex === 1)
    ? (hero.isClimbing ? sprites.ciuffoClimb : sprites.ciuffo)
    : (selectedHeroIndex === 2)
      ? (hero.isClimbing ? sprites.leonClimb : sprites.leon)
      : (selectedHeroIndex === 4 || hero.name === 'BARSALINI')
        ? (hero.isClimbing ? sprites.barsaliniClimb : sprites.barsalini)
        : (hero.isClimbing ? sprites.joaoClimb : sprites.joao);

  if (hero.invulnTimer <= 0 || Math.floor(hero.invulnTimer * 15) % 2 === 0) {
    ctx.save();
    if (!hero.facingRight) {
      ctx.translate(hero.x + 48, hero.y);
      ctx.scale(-1, 1);
      ctx.drawImage(heroSprite, 0, 0, 48, 48);
    } else {
      ctx.drawImage(heroSprite, hero.x, hero.y, 48, 48);
    }
    ctx.restore();

    // Palla al piede
    if (hero.hasBall && !hero.isClimbing) {
      const ballOffset = hero.facingRight ? 32 : -8;
      const ballBounce = hero.isGrounded ? Math.abs(Math.sin(performance.now() * 0.015)) * 3 : 0;
      ctx.drawImage(sprites.ball, hero.x + ballOffset, hero.y + 26 - ballBounce, 22, 22);
    }
  }

  // Testi fluttuanti
  floatingTexts.forEach(ft => {
    ctx.save();
    ctx.fillStyle = ft.color;
    ctx.font = 'bold 20px Courier New';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 4;
    const clampedX = Math.max(30, Math.min(V_WIDTH - 280, ft.x));
    ctx.fillText(ft.text, clampedX, ft.y);
    ctx.restore();
  });

  drawHUD();

  if (gameState === STATE_BRIEFING) drawBriefing();
  if (gameState === STATE_LEVEL_CLEAR) drawLevelClear();
  if (gameState === STATE_VICTORY) drawVictory();
  if (gameState === STATE_GAMEOVER) drawGameOver();

  // Schermata di Pausa (tasto P)
  if (isPaused && gameState === STATE_PLAYING) {
    drawPauseScreen();
  }
}

function drawPauseScreen() {
  ctx.save();
  ctx.fillStyle = 'rgba(0, 5, 15, 0.76)';
  ctx.fillRect(0, 0, V_WIDTH, V_HEIGHT);

  const bw = 580;
  const bh = 250;
  const bx = (V_WIDTH - bw) / 2;
  const by = (V_HEIGHT - bh) / 2;

  drawBox(bx, by, bw, bh, 'rgba(15, 23, 42, 0.96)', '#00f0ff');

  ctx.fillStyle = '#00f0ff';
  ctx.font = 'bold 36px Courier New';
  ctx.textAlign = 'center';
  ctx.fillText('⏸ PARTITA IN PAUSA', V_WIDTH / 2, by + 65);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px Courier New';
  ctx.fillText('Premi [P] per riprendere la partita', V_WIDTH / 2, by + 120);

  ctx.fillStyle = '#ffd700';
  ctx.font = '17px Courier New';
  ctx.fillText(`EROE IN CAMPO: ${hero.name} | LIVELLO: ${currentLevel} | PUNTI: ${score}`, V_WIDTH / 2, by + 165);

  ctx.fillStyle = '#4ade80';
  ctx.font = '14px Courier New';
  ctx.fillText('⚽ SUGGERIMENTO: La palla travolge più ciabatte in linea retta!', V_WIDTH / 2, by + 205);
  ctx.textAlign = 'left';

  ctx.restore();
}

function drawSpeechBubble(x, y, text) {
  ctx.font = 'bold 14px Courier New';
  const tw = ctx.measureText(text).width + 12;
  const th = 20;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x - tw / 2, y - th, tw, th);
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#000000';
  ctx.strokeRect(x - tw / 2, y - th, tw, th);

  // Triangolino freccia fumetto
  ctx.beginPath();
  ctx.moveTo(x - 4, y);
  ctx.lineTo(x + 4, y);
  ctx.lineTo(x, y + 5);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#cc0000';
  ctx.textAlign = 'center';
  ctx.fillText(text, x, y - 5);
  ctx.textAlign = 'left';
}

function drawHUD() {
  ctx.fillStyle = '#ff2222'; ctx.font = 'bold 24px Courier New'; ctx.fillText('1UP', 100, 30);
  ctx.fillStyle = '#ffffff'; ctx.fillText(String(score).padStart(6, '0'), 100, 56);

  ctx.fillStyle = '#ff2222'; ctx.fillText('HIGH SCORE', 520, 30);
  ctx.fillStyle = '#ffffff'; ctx.fillText(String(highScore).padStart(6, '0'), 550, 56);

  ctx.fillStyle = '#00d2ff'; ctx.fillText('BONUS', 980, 30);
  ctx.fillStyle = '#ffe600'; ctx.fillText(String(bonusTimer).padStart(4, '0'), 980, 56);

  ctx.fillStyle = '#ffcc00'; ctx.font = 'bold 18px Courier New';
  ctx.fillText(`LIVELLO ${currentLevel}`, 535, 80);

  // Status palla e vite
  const ballStatus = hero.hasBall ? '⚽ PALLA AL PIEDE (CALCIA!)' : '⏳ RICARICA...';
  const ballColor = hero.hasBall ? '#66ff88' : '#aaaaaa';
  ctx.fillStyle = ballColor; ctx.font = 'bold 16px Courier New';
  ctx.fillText(ballStatus, 50, V_HEIGHT - 45);

  ctx.fillStyle = '#ffffff'; ctx.font = '18px Courier New';
  ctx.fillText(`EROE: ${hero.name} | VITE: `, 50, V_HEIGHT - 20);
  for (let i = 0; i < lives; i++) {
    ctx.fillStyle = '#ff2222';
    ctx.fillRect(260 + i * 24, V_HEIGHT - 32, 18, 16);
  }

  ctx.fillStyle = '#cccccc'; ctx.font = '14px Courier New';
  ctx.fillText('TOCCA [⚽ CALCIA] O PREMI [K/ENTER] PER STENDERE I RIVALI!', 520, V_HEIGHT - 20);
}

function drawCharacterSelect() {
  ctx.fillStyle = '#ffd700'; ctx.font = 'bold 32px Courier New'; ctx.textAlign = 'center';
  ctx.fillText('SCEGLI IL TUO EROE DELL\'AC BRISSAGO', V_WIDTH / 2, 55);
  ctx.fillStyle = '#94a3b8'; ctx.font = '18px Courier New';
  ctx.fillText('IL COMANDANTE TAIRA ASSEGNERA LA MISSIONE A LUI!', V_WIDTH / 2, 90);

  const heroes = [
    {
      name: 'JOAO',
      sub: 'L\'Eroe dai Ricci',
      badge: 'EQUILIBRATO',
      badgeCol: '#38bdf8',
      img: sprites.joao,
      desc: 'EQUILIBRATO\n\n• Velocita: 230\n• Salto: Calibrato\n• Tiro Preciso\n• Fede nel Brissago'
    },
    {
      name: 'CIUFFO',
      sub: 'Il Re del Gel',
      badge: 'SCATTANTE',
      badgeCol: '#f59e0b',
      img: sprites.ciuffo,
      desc: 'SCATTANTE\n\n• Velocita: +15%\n• Dribbling Veloce\n• Scatto rapido\n• Ciuffo intonso'
    },
    {
      name: 'LEON',
      sub: 'Guerriero Bandiera',
      badge: 'GRINTA PURA',
      badgeCol: '#ef4444',
      img: sprites.leon,
      desc: 'GRINTA PURA\n\n• Salto: +25%\n• Tiro Esplosivo\n• Fisico roccioso\n• Bandiera del 1967'
    },
    {
      name: 'CARLON',
      sub: 'L\'Impegnato',
      badge: 'EASTER EGG',
      badgeCol: '#a855f7',
      img: sprites.carlon,
      desc: 'MISTERIOSO\n\n• Ruolo: Fuoriclasse\n• Agilita: Stellare\n• Disponibilita: ???\n• Prova a sceglierlo!'
    },
    {
      name: 'BARSALINI',
      sub: 'Bersaglio Renzo',
      badge: 'HARD MODE',
      badgeCol: '#f43f5e',
      img: sprites.barsalini,
      desc: 'BERSAGLIO N.1\n\n• Velocita: 245\n• Salto: +15%\n• ⚠️ Odio Renzo: MAX\n• Renzo urla "BARSA!"'
    }
  ];

  const cardW = 224;
  const cardH = 460;
  const cardGap = 16;
  const startX = 48; // (1280 - (5*224 + 4*16)) / 2 = 48

  heroes.forEach((h, i) => {
    const cx = startX + i * (cardW + cardGap);
    const isSel = (selectedHeroIndex === i);

    // Box della carta
    ctx.fillStyle = isSel ? 'rgba(30, 48, 80, 0.96)' : 'rgba(15, 20, 32, 0.88)';
    ctx.fillRect(cx, 130, cardW, cardH);
    ctx.lineWidth = isSel ? 3.5 : 1.5;
    ctx.strokeStyle = isSel ? '#ffe600' : '#334155';
    ctx.strokeRect(cx, 130, cardW, cardH);

    // Badge in alto
    ctx.fillStyle = h.badgeCol;
    ctx.fillRect(cx + 32, 142, cardW - 64, 20);
    ctx.fillStyle = '#050510';
    ctx.font = 'bold 11px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText(h.badge, cx + cardW / 2, 156);

    // Nome Eroe
    ctx.fillStyle = isSel ? '#ffd700' : '#ffffff';
    ctx.font = 'bold 22px Courier New';
    ctx.fillText(h.name, cx + cardW / 2, 188);

    // Sottotitolo
    ctx.fillStyle = '#60a5fa';
    ctx.font = '12px Courier New';
    ctx.fillText(h.sub, cx + cardW / 2, 208);

    // Riquadro Avatar
    ctx.fillStyle = '#080c14';
    ctx.fillRect(cx + (cardW - 88) / 2, 222, 88, 88);
    ctx.drawImage(h.img, cx + (cardW - 74) / 2, 229, 74, 74);

    // Descrizione
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '13px Courier New';
    ctx.textAlign = 'left';
    h.desc.split('\n').forEach((line, li) => {
      ctx.fillText(line, cx + 18, 335 + li * 20);
    });

    // Stato di selezione in basso
    ctx.textAlign = 'center';
    if (isSel) {
      ctx.fillStyle = (i === 3) ? '#f43f5e' : '#22c55e';
      ctx.font = 'bold 15px Courier New';
      ctx.fillText((i === 3) ? '⚠️ EASTER EGG' : '▶ SELEZIONATO ◀', cx + cardW / 2, 565);
    } else {
      ctx.fillStyle = '#64748b';
      ctx.font = '12px Courier New';
      ctx.fillText('Premi invio', cx + cardW / 2, 565);
    }
  });

  ctx.fillStyle = '#00f0ff';
  ctx.font = 'bold 18px Courier New';
  ctx.textAlign = 'center';
  ctx.fillText('[◀ / ▶] Scegli Eroe  |  [SPAZIO / INVIO / ⚽ CALCIA] Conferma Eroe', V_WIDTH / 2, V_HEIGHT - 35);
  ctx.textAlign = 'left';

  // POPUP EASTER EGG: CARLON NON E INTERESSATO!
  if (carlonNoticeTimer > 0) {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 5, 15, 0.85)';
    ctx.fillRect(0, 0, V_WIDTH, V_HEIGHT);

    const boxW = 840;
    const boxH = 260;
    const boxX = (V_WIDTH - boxW) / 2;
    const boxY = (V_HEIGHT - boxH) / 2;

    drawBox(boxX, boxY, boxW, boxH, 'rgba(18, 14, 28, 0.98)', '#ff3344');

    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ffd700';
    ctx.strokeRect(boxX + 6, boxY + 6, boxW - 12, boxH - 12);

    ctx.drawImage(sprites.carlon, boxX + 35, boxY + 65, 120, 120);

    ctx.fillStyle = '#ff4444';
    ctx.font = 'bold 24px Courier New';
    ctx.textAlign = 'left';
    ctx.fillText('COMUNICAZIONE UFFICIALE AC BRISSAGO', boxX + 175, boxY + 55);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px Courier New';
    ctx.fillText('"Carlon non è interessato a giocare a questo gioco,', boxX + 175, boxY + 110);
    ctx.fillText('ha altri impegni"', boxX + 175, boxY + 145);

    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 18px Courier New';
    ctx.fillText('👉 Scegli un altro personaggio con i tasti [◀ / ▶]!', boxX + 175, boxY + 205);
    ctx.restore();
  }
}

function drawBriefing() {
  drawBox(120, 150, 1040, 410, 'rgba(15, 20, 35, 0.96)', '#f5c828');
  ctx.drawImage(sprites.taira, 150, 190, 100, 100);

  ctx.fillStyle = '#ffd700'; ctx.font = 'bold 26px Courier New';
  ctx.fillText(`ORDINE DEL COMANDANTE TAIRA A SOLDATO ${hero.name}!`, 280, 200);

  ctx.fillStyle = '#ffffff'; ctx.font = '18px Courier New';
  ctx.fillText(`'${hero.name}! LA MISSIONE E VINCERE LA QUINTA LEGA E RICONQUISTARE LA QUARTA!`, 280, 240);

  ctx.fillStyle = '#66ff88';
  ctx.fillText('LE TRAVI ORA SONO IN ERBA COME IL CAMPO: PORTA IL PALLONE E STENDI I RIVALI!', 280, 275);

  ctx.fillStyle = '#ffffff';
  ctx.fillText('ATTENTO AGLI SCHEMI DI RENZO: LANCI MIRATI, DOPPIETTE E DIFESA FEROCE SUL FINALE.', 280, 310);

  ctx.fillStyle = '#50c8ff';
  ctx.fillText('SULLA CIMA C\'E LA PORTA DA CALCIO: ARRIVA SUL DISCHETTO E CALCIA IN RETE!', 280, 345);
  ctx.fillText('SOLO SEGNANDO IL GOL CONQUISTERAI LA VITTORIA E LA FIDUCIA DEL MISTER!\'', 280, 380);

  ctx.fillStyle = '#22c55e'; ctx.font = 'bold 22px Courier New';
  ctx.fillText('TOCCA IL PULSANTE VERDE/ROSSO O PREMI [SPAZIO] PER INIZIARE LA PARTITA', 200, 500);
}

function drawLevelClear() {
  drawBox(140, 170, 1000, 380, 'rgba(10, 30, 45, 0.96)', '#00f0ff');
  ctx.drawImage(sprites.taira, 170, 210, 100, 100);

  ctx.fillStyle = '#00f0ff'; ctx.font = 'bold 30px Courier New';
  ctx.fillText('GOOOOOOOL! LIVELLO 1 CONQUISTATO! BRAVO ' + hero.name + '!', 290, 220);

  ctx.fillStyle = '#ffffff'; ctx.font = '19px Courier New';
  ctx.fillText('COMANDANTE TAIRA: \'CHE GOL! MA IL LIVELLO 2 E IL VERO INFERNO!', 290, 270);
  ctx.fillText('ORA RENZO METTE IL CATENACCIO TOTALE SULL\'ULTIMA TRAVE PRIMA DELLA PORTA!', 290, 305);

  ctx.fillStyle = '#ffcc00';
  ctx.fillText('PIU CIABATTE RIMBALZANTI E AVVERSARI DECISIVI:', 290, 345);
  ctx.fillStyle = '#ffffff';
  ctx.fillText('- IL TERZINO DELL\'AQUILA ("LANCIAMI!"), LO GNOSCA E IL PORTIERE DEL CHIRONICO', 300, 380);
  ctx.fillText('- SULL\'ULTIMA TRAVE: L\'ATTACCANTE DEL CAMORINO IN SCATTO FURIOSO!', 300, 410);
  ctx.fillText('- SFONDA LA LINEA E SEGNA IL GOL DEFINITIVO PER LA QUARTA LEGA!\'', 300, 440);

  ctx.fillStyle = '#22c55e'; ctx.font = 'bold 22px Courier New';
  ctx.fillText('TOCCA IL PULSANTE ROSSO O PREMI [SPAZIO] PER ENTRARE NEL LIVELLO 2', 200, 515);
}

function drawVictory() {
  drawBox(160, 220, 960, 270, 'rgba(10, 40, 20, 0.96)', '#ffd700');
  ctx.fillStyle = '#ffd700'; ctx.font = 'bold 30px Courier New';
  ctx.fillText(`VITTORIA TOTALE! QUARTA LEGA RICONQUISTATA!`, 220, 270);

  ctx.fillStyle = '#ff6464'; ctx.font = 'bold 22px Courier New';
  ctx.fillText('MISTER RENZO (AC BRISSAGO):', 200, 320);

  ctx.fillStyle = '#ffffff'; ctx.font = '19px Courier New';
  ctx.fillText(`'CHE BOMBA DI TIRO ${hero.name}! HAI MESSO K.O. CODEBORGO, ARAMAICI, PEDEMONTE,`, 200, 355);
  ctx.fillText('ALEX, L\'AQUILA, LO GNOSCA, IL CHIRONICO E PERSINO IL CAMORINO!', 200, 385);

  ctx.fillStyle = '#ffd700';
  ctx.fillText('HAI LA MIA COMPLETA FIDUCIA: CON TE E TAIRA L\'AC BRISSAGO E IN QUARTA LEGA!\'', 200, 420);

  ctx.fillStyle = '#00f0ff'; ctx.font = 'bold 20px Courier New';
  ctx.fillText('TOCCA LO SCHERMO O PREMI [SPAZIO] PER GIOCARE ANCORA', 310, 465);
}

function drawGameOver() {
  drawBox(200, 240, 880, 240, 'rgba(50, 10, 10, 0.96)', '#ff2222');
  ctx.fillStyle = '#ff3333'; ctx.font = 'bold 32px Courier New';
  ctx.fillText('MISSIONE FALLITA!', 480, 290);

  ctx.fillStyle = '#ffd700'; ctx.font = 'bold 22px Courier New';
  ctx.fillText('COMANDANTE TAIRA:', 240, 340);

  ctx.fillStyle = '#ffffff'; ctx.font = '19px Courier New';
  ctx.fillText(`'${hero.name}! NON MOLLARE ADESSO! L\'AC BRISSAGO HA BISOGNO DI TE!`, 240, 375);
  ctx.fillText('CALCIA QUEL PALLONE CONTRO DI LORO E RIPROVA PER LA QUARTA LEGA!\'', 240, 405);

  ctx.fillStyle = '#00f0ff'; ctx.font = 'bold 20px Courier New';
  ctx.fillText('TOCCA LO SCHERMO O PREMI [SPAZIO] PER RIPROVARE', 330, 455);
}

function drawBox(x, y, w, h, bg, border) {
  ctx.fillStyle = bg;
  ctx.fillRect(x, y, w, h);
  ctx.lineWidth = 4;
  ctx.strokeStyle = border;
  ctx.strokeRect(x, y, w, h);
}
