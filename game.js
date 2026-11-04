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
    } else if (type === 'hit') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.35);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
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

function createGirderCanvas() {
  return createPixelCanvas(32, 16, (p) => {
    p.fillStyle = '#dc2828'; p.fillRect(0, 0, 32, 16);
    p.fillStyle = '#ff5a5a'; p.fillRect(0, 0, 32, 2);
    p.fillStyle = '#500a0a'; p.fillRect(0, 14, 32, 2);
    p.fillStyle = '#ffe6c8'; p.fillRect(4, 1, 2, 2); p.fillRect(20, 1, 2, 2);
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
  girder: createGirderCanvas(),
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
      ctx.drawImage(sprites.girder, d, 0);
    }
    ctx.restore();
  }
}

class Ladder {
  constructor(x, topY, bottomY) {
    this.x = x;
    this.topY = Math.min(topY, bottomY);
    this.bottomY = Math.max(topY, bottomY);
    this.width = 24;
  }
  canClimb(px, py) {
    return Math.abs(px - this.x) <= 22 && py >= this.topY - 14 && py <= this.bottomY + 14;
  }
  draw(ctx) {
    for (let y = this.topY; y < this.bottomY; y += 16) {
      ctx.drawImage(sprites.ladder, this.x - 12, y);
    }
  }
}

let platforms = [];
let ladders = [];

function buildLevelGeometry(level) {
  platforms = [];
  ladders = [];

  if (level === 1) {
    // LIVELLO 1 (5 Tiers)
    platforms.push(
      new Platform(80, 130, 480, 130),     // Cima Renzo
      new Platform(380, 190, 1140, 230),   // Tier 4 (Alex Verzaschesi)
      new Platform(140, 370, 1140, 330),   // Tier 3 (Pedemonte 11)
      new Platform(140, 470, 1140, 510),   // Tier 2 (Aramaici)
      new Platform(140, 630, 1140, 590),   // Tier 1 (Codeborgo)
      new Platform(60, 695, 1220, 695)     // Terra
    );

    ladders.push(
      new Ladder(1050, 595, 695), new Ladder(420, 620, 695),
      new Ladder(240, 475, 625), new Ladder(800, 495, 605),
      new Ladder(1050, 335, 505), new Ladder(520, 355, 485),
      new Ladder(240, 200, 365), new Ladder(860, 220, 340),
      new Ladder(440, 130, 195)
    );
  } else {
    // LIVELLO 2 (Più Piani, 6 Tiers inclinati più ripidi!)
    platforms.push(
      new Platform(80, 110, 460, 110),     // Cima Renzo (ancora più in alto!)
      new Platform(340, 160, 1160, 200),   // Tier 5: Attaccante Camorino
      new Platform(120, 300, 1160, 260),   // Tier 4: Portiere Chironico
      new Platform(120, 400, 1160, 440),   // Tier 3: Capitano Gnosca
      new Platform(120, 540, 1160, 500),   // Tier 2: Terzino Aquila ("LANCIAMI!")
      new Platform(120, 620, 1160, 650),   // Tier 1: Slalom stretto
      new Platform(50, 700, 1230, 700)     // Terra
    );

    ladders.push(
      new Ladder(1080, 645, 700), new Ladder(350, 625, 700),
      new Ladder(200, 535, 625), new Ladder(880, 505, 640),
      new Ladder(1060, 435, 505), new Ladder(480, 410, 530),
      new Ladder(220, 295, 405), new Ladder(850, 265, 435),
      new Ladder(1020, 195, 265), new Ladder(420, 165, 295),
      new Ladder(410, 110, 165)
    );
  }
}

// -------------------------------------------------------------------------
// STATO E GESTIONE DEL GIOCO
// -------------------------------------------------------------------------

let hero = {
  name: 'JOAO',
  x: 160,
  y: 695 - 52,
  vx: 0,
  vy: 0,
  speed: 225,
  jumpForce: -435,
  isGrounded: true,
  isClimbing: false,
  facingRight: true,
  invulnTimer: 0,
  scale: 1.3,
  hasBall: true,
  ballCooldown: 0
};

let renzo = {
  x: 140,
  y: 44,
  isThrowing: false,
  throwTimer: 2.5,
  animTimer: 0
};

let kickedBalls = [];
let slippers = [];
let rivals = [];

function setupRivalsForLevel(level) {
  rivals = [];

  if (level === 1) {
    // Rivali Livello 1
    rivals.push(
      { name: 'Codeborgo', sprite: sprites.codeborgo, plat: platforms[4], x: 600, speed: 95, dir: 1, pts: 200, tagCol: '#f0c81e', defeated: false, fallVy: 0, spin: 0 },
      { name: 'Aramaici', sprite: sprites.aramaici, plat: platforms[3], x: 450, speed: 145, dir: 1, pts: 300, tagCol: '#f0c81e', defeated: false, fallVy: 0, spin: 0 },
      { name: 'Pedemonte #11', sprite: sprites.pedemonte11, plat: platforms[2], x: 650, speed: 165, dir: 1, pts: 500, tagCol: '#ff4444', isPedemonte: true, defeated: false, fallVy: 0, spin: 0, alertTimer: 0 },
      { name: 'Alex (Verzaschesi)', sprite: sprites.alex, plat: platforms[1], x: 800, speed: 175, dir: 1, pts: 800, tagCol: '#28c8ff', isAlex: true, defeated: false, fallVy: 0, spin: 0 }
    );
  } else {
    // Rivali Livello 2 (Più tosti!)
    rivals.push(
      // Tier 2: Terzino dell'Aquila (urla "LANCIAMI!")
      { name: "Terzino Aquila", sprite: sprites.aquila, plat: platforms[4], x: 500, speed: 185, dir: 1, pts: 350, tagCol: '#28ff78', isAquila: true, bubbleTimer: 0, defeated: false, fallVy: 0, spin: 0 },
      // Tier 3: Capitano dello Gnosca
      { name: "Capitano Gnosca", sprite: sprites.gnosca, plat: platforms[3], x: 720, speed: 195, dir: -1, pts: 500, tagCol: '#f5d228', defeated: false, fallVy: 0, spin: 0 },
      // Tier 4: Portiere del Chironico
      { name: "Portiere Chironico", sprite: sprites.chironicoGk, plat: platforms[2], x: 450, speed: 205, dir: 1, pts: 650, tagCol: '#e6ff00', isChironicoGk: true, defeated: false, fallVy: 0, spin: 0 },
      // Tier 5 (ultimo piano prima di Renzo): Attaccante del Camorino
      { name: "Attaccante Camorino", sprite: sprites.camorino, plat: platforms[1], x: 850, speed: 240, dir: -1, pts: 1000, tagCol: '#ff3c64', isCamorino: true, defeated: false, fallVy: 0, spin: 0, alertTimer: 0 }
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
    hero.speed = 255;
    hero.jumpForce = -415;
  } else if (selectedHeroIndex === 2) {
    hero.name = 'LEON';
    hero.speed = 210;
    hero.jumpForce = -465;
  } else {
    hero.name = 'JOAO';
    hero.speed = 225;
    hero.jumpForce = -435;
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

  hero.x = 160;
  hero.y = platforms[platforms.length - 1].y1 - 52;
  hero.vx = 0;
  hero.vy = 0;
  hero.isGrounded = true;
  hero.isClimbing = false;
  hero.invulnTimer = 0;
  hero.hasBall = true;
  hero.ballCooldown = 0;

  renzo.x = 140;
  renzo.y = platforms[0].y1 - 86;
  renzo.throwTimer = 2.2;
  renzo.isThrowing = false;

  setupRivalsForLevel(lvl);
}

function shootBall() {
  hero.hasBall = false;
  hero.ballCooldown = 1.6;
  playSound('kick');

  const shootDir = hero.facingRight ? 1 : -1;
  kickedBalls.push({
    x: hero.x + (hero.facingRight ? 40 : -10),
    y: hero.y + 30,
    vx: shootDir * 600,
    vy: -120,
    rot: 0,
    active: true
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

  // Renzo ciabatte
  renzo.throwTimer -= dt;
  if (renzo.throwTimer <= 0.6 && !renzo.isThrowing) {
    renzo.isThrowing = true;
    renzo.animTimer = 0.7;
  }
  if (renzo.isThrowing) {
    renzo.animTimer -= dt;
    if (renzo.animTimer <= 0) {
      renzo.isThrowing = false;
      // Nel livello 2 Renzo tira più veloce!
      renzo.throwTimer = (currentLevel === 2) ? 1.9 : 2.5;
      slippers.push({
        x: renzo.x + 80,
        y: renzo.y + 60,
        vx: 190,
        vy: 0,
        isFalling: true,
        rot: 0,
        dir: 1,
        active: true,
        jumped: false
      });
    }
  }

  // Aggiorna ciabatte
  for (let i = slippers.length - 1; i >= 0; i--) {
    const s = slippers[i];
    s.rot += s.dir * 12 * dt;

    if (s.isFalling) {
      s.vy += 750 * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;

      for (let plat of platforms) {
        if (plat.containsX(s.x)) {
          const surfY = plat.getSurfaceY(s.x) - 14;
          if (s.y >= surfY - 8 && s.y <= surfY + 16 && s.vy >= 0) {
            s.y = surfY;
            s.isFalling = false;
            s.dir = (plat.y2 - plat.y1 >= 0) ? 1 : -1;
            s.vx = s.dir * 200;
            break;
          }
        }
      }
    } else {
      s.x += s.dir * 200 * dt;
      let onPlat = null;
      for (let plat of platforms) {
        if (plat.containsX(s.x) && Math.abs(plat.getSurfaceY(s.x) - 14 - s.y) < 20) {
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
    b.x += b.vx * dt;
    b.vy += 450 * dt;
    b.y += b.vy * dt;
    b.rot += (b.vx > 0 ? 15 : -15) * dt;

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
        if (Math.hypot(b.x - (r.x + 20), b.y - (r.y + 20)) < 36) {
          r.defeated = true;
          r.fallVy = -320;
          playSound('ko');

          let koMsg = `GOOOL! +${r.pts * 2} PTS!`;
          if (r.isPedemonte) koMsg = `11 DEL PEDEMONTE ABBATTUTO! +1000 PTS!`;
          if (r.isAlex) koMsg = `ALEX IL TRADITORE MESSO K.O.! +1600 PTS!`;
          if (r.isCamorino) koMsg = `BOMBER DEL CAMORINO STESO! +2000 PTS!`;
          if (r.isAquila) koMsg = `AQUILA ZITTITA! +700 PTS!`;

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

    // Recupero palla a terra
    if (!hero.hasBall && Math.hypot((hero.x + 20) - b.x, (hero.y + 25) - b.y) < 32) {
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
        if (r.alertTimer > 0.4) {
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
      if (Math.hypot((hero.x + 20) - (r.x + 20), (hero.y + 25) - (r.y + 25)) < 26) {
        let msg = `COLPITO DAL ${r.name.toUpperCase()}!`;
        if (r.isAlex) msg = 'FALCIATO DA ALEX IL TRADITORE!';
        if (r.isPedemonte) msg = 'TRAVOLTO DAL N.11 DEL PEDEMONTE!';
        if (r.isCamorino) msg = 'ABBATTUTO DAL BOMBER DEL CAMORINO!';
        if (r.isAquila) msg = 'FALCIATO DAL TERZINO DELL\'AQUILA!';
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
      hero.vy += 880 * dt;
      hero.y += hero.vy * dt;
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
      if (!s.jumped && Math.abs(footX - s.x) < 32 && (footY - s.y) >= -65 && (footY - s.y) <= -4) {
        s.jumped = true;
        score += 100;
        playSound('score');
        floatingTexts.push({ text: '+100', x: s.x, y: s.y - 20, timer: 0.9, color: '#ffea00' });
      }
    });

    rivals.forEach(r => {
      if (!r.defeated && !r.jumped && Math.abs(footX - (r.x + 20)) < 36 && (footY - r.y) >= -75 && (footY - r.y) <= -5) {
        r.jumped = true;
        score += r.pts;
        playSound('score');
        floatingTexts.push({ text: `+${r.pts}`, x: r.x + 10, y: r.y - 20, timer: 0.9, color: '#00ffcc' });
      }
    });
  }

  hero.x = Math.max(40, Math.min(V_WIDTH - 80, hero.x));

  // VITTORIA / CAMBIO LIVELLO
  if (hero.y <= platforms[0].y1 + 10 && hero.x <= 420) {
    if (currentLevel === 1) {
      gameState = STATE_LEVEL_CLEAR;
      score += bonusTimer;
      playSound('victory');
    } else {
      gameState = STATE_VICTORY;
      score += bonusTimer;
      if (score > highScore) highScore = score;
      playSound('victory');
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

function hitHero(msg) {
  lives--;
  playSound('hit');
  floatingTexts.push({ text: msg, x: hero.x - 30, y: hero.y - 20, timer: 1.3, color: '#ff3333' });

  if (lives <= 0) {
    gameState = STATE_GAMEOVER;
  } else {
    hero.x = 160;
    hero.y = platforms[platforms.length - 1].y1 - 52;
    hero.vx = 0;
    hero.vy = 0;
    hero.isGrounded = true;
    hero.isClimbing = false;
    hero.invulnTimer = 1.5;
  }
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

  // Piattaforme e scale
  platforms.forEach(p => p.draw(ctx));
  ladders.forEach(l => l.draw(ctx));

  // Renzo
  const renzoSprite = renzo.isThrowing ? sprites.renzoThrow : sprites.renzoNormal;
  ctx.drawImage(renzoSprite, renzo.x, renzo.y, 86, 86);

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
  drawBox(120, 160, 1040, 390, 'rgba(15, 20, 35, 0.96)', '#f5c828');
  ctx.drawImage(sprites.taira, 150, 200, 100, 100);

  ctx.fillStyle = '#ffd700'; ctx.font = 'bold 26px Courier New';
  ctx.fillText(`ORDINE DEL COMANDANTE TAIRA A SOLDATO ${hero.name}!`, 280, 210);

  ctx.fillStyle = '#ffffff'; ctx.font = '18px Courier New';
  ctx.fillText(`'${hero.name}! LA MISSIONE E VINCERE LA QUINTA LEGA E RICONQUISTARE LA QUARTA!`, 280, 255);

  ctx.fillStyle = '#66ff88';
  ctx.fillText('PORTA IL PALLONE TRA I PIEDI: SE TROVI NEMICI SULLE TRAVI, CALCIA FORTE PER STENDERLI!', 280, 290);

  ctx.fillStyle = '#ffffff';
  ctx.fillText('ATTENTO AL CODEBORGO, AGLI ARAMAICI E AL NUMERO 11 DEL PEDEMONTE (MOLTO ARRABBIATO!).', 280, 325);

  ctx.fillStyle = '#50c8ff';
  ctx.fillText('SULLA TRAVE PIU ALTA C\'E ALEX IL TRADITORE: COLPISCILO IN PIENO CON IL PALLONE!', 280, 365);
  ctx.fillText('SCHIVA LE CIABATTE DI RENZO, SFONDA LE LINEE E CONQUISTA LA FIDUCIA DEL MISTER!\'', 280, 400);

  ctx.fillStyle = '#22c55e'; ctx.font = 'bold 22px Courier New';
  ctx.fillText('TOCCA IL PULSANTE VERDE/ROSSO O PREMI [SPAZIO] PER INIZIARE LA PARTITA', 200, 490);
}

function drawLevelClear() {
  drawBox(140, 180, 1000, 360, 'rgba(10, 30, 45, 0.96)', '#00f0ff');
  ctx.drawImage(sprites.taira, 170, 220, 100, 100);

  ctx.fillStyle = '#00f0ff'; ctx.font = 'bold 30px Courier New';
  ctx.fillText('LIVELLO 1 SUPERATO! BRAVO ' + hero.name + '!', 290, 230);

  ctx.fillStyle = '#ffffff'; ctx.font = '19px Courier New';
  ctx.fillText('COMANDANTE TAIRA: \'OTTIMO LAVORO, MA NON E FINITA QUI!', 290, 280);
  ctx.fillText('ORA ENTRIAMO NEL VERO INFERNO DELLA QUINTA LEGA: IL LIVELLO 2!', 290, 315);

  ctx.fillStyle = '#ffcc00';
  ctx.fillText('CI SONO PIU PIANI E AVVERSARI PIU TOSTI:', 290, 360);
  ctx.fillStyle = '#ffffff';
  ctx.fillText('- IL TERZINO DELL\'AQUILA CHE URLA "LANCIAMI!"', 300, 395);
  ctx.fillText('- IL CAPITANO DELLO GNOSCA E IL PORTIERE DEL CHIRONICO', 300, 425);
  ctx.fillText('- E ALL\'ULTIMO PIANO L\'ATTACCANTE DEL CAMORINO!\'', 300, 455);

  ctx.fillStyle = '#22c55e'; ctx.font = 'bold 22px Courier New';
  ctx.fillText('TOCCA IL PULSANTE ROSSO O PREMI [SPAZIO] PER ENTRARE NEL LIVELLO 2', 200, 505);
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
