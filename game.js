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

function createRenzoCanvas(isThrowing = false) {
  return createPixelCanvas(64, 64, (p) => {
    p.fillStyle = '#191414'; p.fillRect(18, 6, 28, 52);
    p.fillStyle = '#1e2337'; p.fillRect(20, 48, 8, 10); p.fillRect(36, 48, 8, 10);
    p.fillStyle = '#28282d'; p.fillRect(18, 57, 10, 5); p.fillRect(36, 57, 10, 5);

    p.fillStyle = '#dc1919'; p.fillRect(18, 26, 28, 23); // AC Brissago
    p.fillStyle = '#ffffff';
    p.fillRect(22, 29, 3, 2);
    p.fillRect(28, 33, 14, 2); p.fillRect(28, 36, 11, 2);

    if (!isThrowing) {
      p.fillStyle = '#dc1919'; p.fillRect(11, 26, 7, 16); p.fillRect(46, 26, 7, 16);
      p.fillStyle = '#f5c3a0'; p.fillRect(11, 41, 7, 6); p.fillRect(46, 41, 7, 6);
      p.fillStyle = '#c8cdd7'; p.fillRect(46, 40, 7, 2); // orologio
    } else {
      p.fillStyle = '#dc1919'; p.fillRect(11, 26, 7, 16); p.fillRect(46, 16, 7, 14);
      p.fillStyle = '#f5c3a0'; p.fillRect(11, 41, 7, 6); p.fillRect(46, 10, 7, 7);
      p.fillStyle = '#c8cdd7'; p.fillRect(46, 17, 7, 2);
      p.fillStyle = '#1450be'; p.fillRect(44, 4, 12, 7);
    }

    p.fillStyle = '#f5c3a0'; p.fillRect(22, 10, 20, 14);
    p.fillStyle = '#6e737d'; p.fillRect(24, 13, 6, 4); p.fillRect(34, 13, 6, 4); p.fillRect(30, 14, 4, 1);
    p.fillStyle = '#f0f5ff'; p.fillRect(25, 14, 4, 2); p.fillRect(35, 14, 4, 2);
    p.fillStyle = '#281e19'; p.fillRect(26, 15, 1, 1); p.fillRect(36, 15, 1, 1);
    p.fillStyle = '#bebec3'; p.fillRect(24, 21, 16, 3);
    p.fillStyle = '#ebebf0'; p.fillRect(22, 6, 20, 5);
  });
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

const sprites = {
  ball: createBallCanvas(),
  joao: createJoaoCanvas(false),
  joaoClimb: createJoaoCanvas(true),
  ciuffo: createCiuffoCanvas(false),
  ciuffoClimb: createCiuffoCanvas(true),
  leon: createLeonCanvas(false),
  leonClimb: createLeonCanvas(true),
  renzoNormal: createRenzoCanvas(false),
  renzoThrow: createRenzoCanvas(true),
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
  if (gameState === STATE_SELECT) {
    if (code === 'ArrowLeft' || code === 'KeyA') {
      selectedHeroIndex = (selectedHeroIndex + 2) % 3;
      playSound('score');
    }
    if (code === 'ArrowRight' || code === 'KeyD') {
      selectedHeroIndex = (selectedHeroIndex + 1) % 3;
      playSound('score');
    }
    if (code === 'Space' || code === 'Enter' || code === 'KeyK') {
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
    if ((code === 'KeyK' || code === 'KeyX' || code === 'Enter') && hero.hasBall && !hero.isClimbing) {
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
  bonusTimer = lvl === 1 ? 5000 : 7000;
  slippers = [];
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
  renzo.throwTimer = 1.8;
  renzo.isThrowing = false;
  renzo.quote = "";
  renzo.quoteTimer = 0;

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
  if (gameState !== STATE_PLAYING) return;

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
  // -----------------------------------------------------------------------
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
  // Renzo cammina e segue l'avanzata del giocatore per chiudergli gli spazi!
  let targetRenzoX = 280;
  if (heroFloor === 6) {
    // Davanti alla porta: Renzo fa da baluardo tra il dischetto (x=280) e la porta
    targetRenzoX = Math.max(210, Math.min(360, hero.x + (hero.facingRight ? 45 : -45)));
  } else if (heroFloor === 5) {
    // Tier 5: Renzo va a coprire la scala di accesso a x=380 e blocca l'attacco
    targetRenzoX = Math.max(240, Math.min(410, hero.x - 20));
  } else {
    // Piani inferiori: Renzo passeggia lungo la trave seguendo l'asse dell'eroe
    const normX = Math.max(0, Math.min(1, hero.x / V_WIDTH));
    targetRenzoX = 230 + normX * 180;
  }
  renzo.x += (targetRenzoX - renzo.x) * 2.4 * dt;

  renzo.throwTimer -= dt;

  // Reazioni vocali di Mister Renzo alla posizione del giocatore
  if (heroFloor === 6 && !goalState.scored) {
    if (renzo.quoteTimer <= 0) {
      const goalQuotes = [
        "NO! NON TIRARE IN PORTA!",
        "PARALA QUALCUNO!",
        "RIGORE INESISTENTE!",
        "CHIUDI LO SPECCHIO!"
      ];
      renzo.quote = goalQuotes[Math.floor(Math.random() * goalQuotes.length)];
      renzo.quoteTimer = 2.0;
    }
  } else if (heroFloor === 5 && !goalState.scored) {
    if (renzo.quoteTimer <= 0) {
      const catenaccioQuotes = [
        "DIFESA A CATENACCIO!",
        "DI QUI NON SI PASSA!",
        "CHIUDETE LA PORTA!",
        "NON TI FACCIO TIRARE!",
        "MURO DIFENSIVO!"
      ];
      renzo.quote = catenaccioQuotes[Math.floor(Math.random() * catenaccioQuotes.length)];
      renzo.quoteTimer = 1.8;
    }
  } else if (hero.isClimbing && renzo.quoteTimer <= 0) {
    const ladderQuotes = [
      "GIÙ DA QUELLA SCALA!",
      "TI HO PRESO SUI GRADINI!",
      "FALLO TATTICO! SCENDI!",
      "ATTENTO ALLA TESTA!"
    ];
    renzo.quote = ladderQuotes[Math.floor(Math.random() * ladderQuotes.length)];
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

      const renzoHandX = renzo.x + 43;
      const renzoHandY = renzo.y + 25;

      // Direzione input dell'eroe per anticipo tiro
      let inputDir = 0;
      if (keys['ArrowLeft'] || keys['KeyA']) inputDir -= 1;
      if (keys['ArrowRight'] || keys['KeyD']) inputDir += 1;

      // -------------------------------------------------------------------
      // STRATEGIA 1: PUNIZIONE SCALA (Se l'eroe sta salendo una scala)
      // -------------------------------------------------------------------
      const climbingLadder = hero.isClimbing ? ladders.find(l => Math.abs((hero.x + 24) - l.x) < 30) : null;

      if (climbingLadder) {
        renzo.throwTimer = (currentLevel === 2) ? 1.2 : 1.5;
        renzo.quote = "GIÙ DA QUELLA SCALA!";
        renzo.quoteTimer = 1.6;

        if (climbingLadder.x === 380) {
          // Scala finale per la porta: Renzo scarica la ciabatta direttamente nel vano della scala!
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
          // Altra scala: Tiro a parabola calibrato sul punto in cui si trova l'eroe sulla scala!
          const flightTime = 0.85;
          const targetX = climbingLadder.x;
          const targetY = hero.y + 20;

          throwWarnings.push({
            x: targetX,
            y: targetY,
            timer: flightTime,
            maxTimer: flightTime,
            label: '⚠️ SCALA SOTTO TIRO!'
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
        renzo.throwTimer = (currentLevel === 2) ? 0.95 : 1.15; // Ritmo incalzante!

        const plat5 = platforms[1];
        const dirToHero = (hero.x > renzoHandX) ? 1 : -1;
        const isMissile = Math.random() < 0.55;

        if (isMissile) {
          // Siluro rasoterra velocissimo che spazza la trave verso l'eroe
          renzo.quote = "SILURO RASOTERRA!";
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
          // Pallonetto rimbalzante ad alto impatto
          renzo.quote = "PALLONETTO A EFFETTO!";
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

        // Raffica aggiuntiva per il livello 2
        if ((currentLevel === 2 || Math.random() < 0.35) && !goalState.scored) {
          setTimeout(() => {
            if (gameState === STATE_PLAYING && !goalState.scored && hero.y > 120) {
              const startX2 = Math.max(plat5.x1 + 30, Math.min(plat5.x2 - 30, renzo.x + 43));
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
              renzo.quote = "DOPPIO CATENACCIO!";
              renzo.quoteTimer = 1.4;
            }
          }, 360);
        }
      }
      // -------------------------------------------------------------------
      // STRATEGIA 3: PIANI INFERIORI (Tier 0 - Tier 4)
      // 68% Lancio Mirato Ballistico a Parabola / 32% Rotolamento Guidato
      // -------------------------------------------------------------------
      else {
        const doTargetedLob = Math.random() < 0.68;

        if (doTargetedLob) {
          // TIRO A PARABOLA MIRATO CON RETICOLO DI ALLERTA
          renzo.throwTimer = (currentLevel === 2) ? 1.35 : 1.7;

          const lobQuotes = [
            "PRENDI QUESTO LOB!",
            "MARCATURA A UOMO!",
            "TI HO VISTO SULLA FASCIA!",
            "DIAGONALE DIFENSIVA!",
            "TI BEVIMENTO QUESTA!"
          ];
          renzo.quote = lobQuotes[Math.floor(Math.random() * lobQuotes.length)];
          renzo.quoteTimer = 1.6;

          // Tempo di volo calibrato in base all'altezza dell'eroe
          const flightTime = (currentLevel === 2) ? 0.95 : 1.15;
          const leadDist = inputDir * hero.speed * 0.35;
          const targetX = Math.max(120, Math.min(1160, hero.x + 20 + leadDist));
          const targetY = hero.y + 36;

          // Mostra il mirino d'avviso rosso al suolo
          throwWarnings.push({
            x: targetX,
            y: targetY,
            timer: flightTime,
            maxTimer: flightTime,
            label: '⚠️ ATTENTO!'
          });

          // Calcolo traiettoria balistica esatta
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
            minLandingY: targetY - 32, // Non impatta su travi intermedie durante l'arco!
            isBouncer: (currentLevel === 2 && Math.random() < 0.4),
            bouncesLeft: 1,
            droppedDownLadder: false
          });
        } else {
          // LANCIO CLASSICO A ROTOLAMENTO GUIDATO
          renzo.throwTimer = (currentLevel === 2) ? 1.5 : 1.9;
          renzo.quote = "ROTOLA IN AREA!";
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

  // Aggiorna ciabatte
  for (let i = slippers.length - 1; i >= 0; i--) {
    const s = slippers[i];
    s.rot += s.dir * 14 * dt;

    // Discesa ciabatta dalle scale (stile Donkey Kong con intelligenza artificiale)
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
            s.vy = 280; // Piomba giù verticalmente per la scala!
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

          // Se è un tiro mirato a parabola, non fermarsi su travi sopra il bersaglio!
          if (s.minLandingY && s.y < s.minLandingY) {
            continue;
          }

          if (s.y >= surfY - 10 && s.y <= surfY + 24 && s.vy >= 0) {
            if (s.isBouncer && s.bouncesLeft > 0) {
              s.vy = -220; // Rimbalzo elastico in aria!
              s.bouncesLeft--;
              s.isFalling = true;
            } else {
              s.y = surfY;
              s.isFalling = false;
              s.isLob = false;
              s.minLandingY = 0;
              s.droppedDownLadder = false;

              // Se atterra vicino alla quota dell'eroe, rotola direttamente verso di lui!
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

    if (s.y > V_HEIGHT + 30 || s.x < -40 || s.x > V_WIDTH + 40) {
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

    // Distrugge ciabatta
    for (let s of slippers) {
      if (s.active && Math.hypot(b.x - s.x, b.y - s.y) < 26) {
        s.active = false;
        b.active = false;
        score += 150;
        playSound('score');
        floatingTexts.push({ text: 'CIABATTA POLVERIZZATA! +150', x: s.x - 40, y: s.y - 20, timer: 1.0, color: '#ffea00' });
        break;
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

  // Renzo (con specchio orizzontale per guardare sempre verso l'eroe)
  const renzoSprite = renzo.isThrowing ? sprites.renzoThrow : sprites.renzoNormal;
  const renzoCenterX = renzo.x + 43;
  const renzoCenterY = renzo.y + 43;
  const renzoFacesRight = (hero.x >= renzoCenterX);

  ctx.save();
  if (!renzoFacesRight) {
    ctx.translate(renzoCenterX, renzoCenterY);
    ctx.scale(-1, 1);
    ctx.drawImage(renzoSprite, -43, -43, 86, 86);
  } else {
    ctx.drawImage(renzoSprite, renzo.x, renzo.y, 86, 86);
  }
  ctx.restore();

  // Fumetto tattico di Mister Renzo!
  if (renzo.quote && renzo.quoteTimer > 0) {
    drawSpeechBubble(renzoCenterX, renzo.y - 18, renzo.quote);
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
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.rot);
    ctx.drawImage(sprites.slipper, -16, -16, 32, 32);
    ctx.restore();
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
  ctx.fillStyle = '#ffd700'; ctx.font = 'bold 32px Courier New';
  ctx.fillText('SCEGLI IL TUO EROE DELL\'AC BRISSAGO', 290, 60);
  ctx.fillStyle = '#a0a5b4'; ctx.font = '20px Courier New';
  ctx.fillText('IL COMANDANTE TAIRA ASSEGNERA LA MISSIONE A LUI!', 340, 100);

  const heroes = [
    { name: 'JOAO', sub: 'L\'Eroe dai Ricci', img: sprites.joao, desc: 'EQUILIBRATO\n\n- Velocita: Buona\n- Salto: Calibrato\n- Tiro Preciso\n- Fede nel Brissago' },
    { name: 'CIUFFO', sub: 'Il Re del Gel', img: sprites.ciuffo, desc: 'SCATTANTE\n\n- Velocita: +15%\n- Dribbling Veloce\n- Ciuffo sempre perfetto' },
    { name: 'LEON', sub: 'Guerriero Bandiera', img: sprites.leon, desc: 'GRINTA PURA\n\n- Super Salto: +25%\n- Tiro Esplosivo\n- Bandiera del 1967' }
  ];

  heroes.forEach((h, i) => {
    const cx = 110 + i * 370;
    const isSel = (selectedHeroIndex === i);

    ctx.fillStyle = isSel ? 'rgba(30, 45, 75, 0.95)' : 'rgba(15, 20, 30, 0.85)';
    ctx.fillRect(cx, 150, 320, 440);
    ctx.lineWidth = isSel ? 4 : 2;
    ctx.strokeStyle = isSel ? '#ffe600' : '#4b5569';
    ctx.strokeRect(cx, 150, 320, 440);

    ctx.fillStyle = isSel ? '#ffd700' : '#ffffff';
    ctx.font = 'bold 28px Courier New';
    ctx.fillText(h.name, cx + 110, 190);
    ctx.fillStyle = '#60a5fa'; ctx.font = '14px Courier New';
    ctx.fillText(h.sub, cx + 75, 215);

    ctx.fillStyle = '#0a0f19'; ctx.fillRect(cx + 105, 235, 110, 110);
    ctx.drawImage(h.img, cx + 115, 245, 90, 90);

    ctx.fillStyle = '#ffffff'; ctx.font = '16px Courier New';
    h.desc.split('\n').forEach((line, li) => {
      ctx.fillText(line, cx + 30, 390 + li * 22);
    });

    if (isSel) {
      ctx.fillStyle = '#22c55e'; ctx.font = 'bold 18px Courier New';
      ctx.fillText('>>> SELEZIONATO <<<', cx + 60, 560);
    }
  });

  ctx.fillStyle = '#00f0ff'; ctx.font = 'bold 20px Courier New';
  ctx.fillText('[◀ / ▶] Cambia Eroe  |  [TOCCA SALTO/CALCIA o SPAZIO] Conferma Eroe', 240, V_HEIGHT - 35);
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
