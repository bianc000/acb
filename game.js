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
const STATE_UNDERGROUND = 6;
const STATE_NAME_ENTRY = 7;
const STATE_LEADERBOARD = 8;

let gameState = STATE_SELECT;
let currentLevel = 1; // Livello 1 o Livello 2
let selectedHeroIndex = 0; // 0=Ciuffo, 1=Leon, 2=Joao, 3=Barsalini, 4=Carlon, 5=Lindi
let score = 0;

// RECORD E CLASSIFICA (ALBO D'ORO AC BRISSAGO)
const DEFAULT_HIGHSCORES = [
  { name: 'TAI', score: 14500, hero: 'TAIRA', level: 2, date: '01/11' },
  { name: 'REN', score: 12800, hero: 'RENZO', level: 2, date: '02/11' },
  { name: 'SAN', score: 9800, hero: 'SANDRO', level: 2, date: '03/11' },
  { name: 'TOL', score: 8400, hero: 'TOLIC', level: 2, date: '03/11' },
  { name: 'VAZ', score: 7600, hero: 'VAZ', level: 2, date: '04/11' },
  { name: 'CIU', score: 6500, hero: 'CIUFFO', level: 2, date: '04/11' },
  { name: 'LEO', score: 5800, hero: 'LEON', level: 2, date: '04/11' },
  { name: 'JOA', score: 4900, hero: 'JOAO', level: 2, date: '05/11' },
  { name: 'BAR', score: 1500, hero: 'BARSALINI', level: 1, date: '05/11' }
];

function loadHighScores() {
  try {
    const saved = localStorage.getItem('donkey_brissago_highscores');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch(e) {}
  return DEFAULT_HIGHSCORES.map(x => Object.assign({}, x));
}

function saveHighScores(scores) {
  try {
    localStorage.setItem('donkey_brissago_highscores', JSON.stringify(scores));
  } catch(e) {}
}

let highScores = loadHighScores();
let highScore = (highScores[0] && highScores[0].score) ? highScores[0].score : 14500;
let lastPlayerRank = -1;

let nameEntry = ['A', 'A', 'A'];
let nameEntryIndex = 0;
const NAME_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!?-";
let bonusTimer = 5000;
let bonusCountdown = 1.0;
let lives = 3;
let floatingTexts = [];
let throwWarnings = [];
let slipperSparks = [];
let isPaused = false;
let carlonNoticeTimer = 0;
let hasCheckpoint = false;
let checkpointLevel = 1;
let checkpointScore = 0;

// Compagni di squadra nel Club/Spogliatoio segreto sotterraneo
let undergroundCharacters = [
  {
    name: 'SANDRO',
    x: 400,
    y: 516,
    quote: 'Eh deh ci sei anche te??',
    tagCol: '#4ade80',
    charKey: 'sandro',
    pose: 'idle',
    talkTimer: 0,
    speechBubbleTimer: 0
  },
  {
    name: 'TOLIC',
    x: 710,
    y: 508,
    quote: 'sushi?',
    tagCol: '#38bdf8',
    charKey: 'tolic',
    pose: 'idle',
    talkTimer: 0,
    speechBubbleTimer: 0
  },
  {
    name: 'VAZ',
    x: 1010,
    y: 514,
    quote: 'Oceano?',
    tagCol: '#f43f5e',
    charKey: 'vaz',
    pose: 'idle',
    talkTimer: 0,
    speechBubbleTimer: 0
  }
];

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

// PERSONAGGIO SPECIALE: LINDI (Il cocco di Renzo, radioso ed elegante)
function createLindiCanvas(isClimbing = false) {
  return createPixelCanvas(40, 40, (p) => {
    // Sagoma e scarpe bianche con dettagli oro
    p.fillStyle = '#15151e'; p.fillRect(11, 4, 18, 34);
    p.fillStyle = '#ffffff'; p.fillRect(12, 35, 6, 3); p.fillRect(22, 35, 6, 3);
    p.fillStyle = '#f59e0b'; p.fillRect(14, 36, 2, 2); p.fillRect(24, 36, 2, 2);
    // Pantaloncini neri
    p.fillStyle = '#19191e'; p.fillRect(13, 25, 14, 8);
    // Maglia AC Brissago rossa con colletto e rifiniture dorate
    p.fillStyle = '#dc2626'; p.fillRect(12, 17, 16, 9);
    p.fillStyle = '#f59e0b'; p.fillRect(18, 17, 4, 3);
    p.fillStyle = '#ffffff'; p.fillRect(19, 20, 2, 5);

    if (!isClimbing) {
      p.fillStyle = '#dc2626'; p.fillRect(9, 18, 3, 7); p.fillRect(28, 18, 3, 7);
      p.fillStyle = '#f5c39b'; p.fillRect(9, 25, 3, 3); p.fillRect(28, 25, 3, 3);
    } else {
      p.fillStyle = '#dc2626'; p.fillRect(9, 14, 3, 6); p.fillRect(28, 14, 3, 6);
      p.fillStyle = '#f5c39b'; p.fillRect(9, 11, 3, 3); p.fillRect(28, 11, 3, 3);
    }

    // Viso radioso
    p.fillStyle = '#f5c39b'; p.fillRect(14, 8, 12, 8);
    // Occhi vispi
    p.fillStyle = '#1e293b'; p.fillRect(16, 11, 2, 1); p.fillRect(22, 11, 2, 1);
    // Sorriso smagliante
    p.fillStyle = '#ffffff'; p.fillRect(18, 14, 4, 1);
    p.fillStyle = '#ef4444'; p.fillRect(18, 15, 4, 1);

    // Ciuffo biondo/dorato stiloso e curato
    p.fillStyle = '#eab308';
    p.fillRect(13, 3, 14, 5);
    p.fillRect(12, 4, 2, 3); p.fillRect(26, 4, 2, 3);
    p.fillStyle = '#fde047';
    p.fillRect(15, 2, 10, 2);
    p.fillRect(14, 4, 3, 3);
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


function createRenzoImages() {
  const images = {};
  const srcSprites = (typeof RENZO_SPRITES !== "undefined") ? RENZO_SPRITES : {};
  for (const [key, val] of Object.entries(srcSprites)) {
    const img = new Image();
    img.src = val.src;
    images[key] = { img, w: val.w, h: val.h };
  }
  return images;
}

function createCharacterImages() {
  const images = {};
  if (typeof CHARACTER_SPRITES !== 'undefined') {
    for (const [charKey, poses] of Object.entries(CHARACTER_SPRITES)) {
      images[charKey] = {};
      for (const [poseKey, val] of Object.entries(poses)) {
        const img = new Image();
        img.src = val.src;
        images[charKey][poseKey] = { img, w: val.w, h: val.h };
      }
    }
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
  lindi: createLindiCanvas(false),
  lindiClimb: createLindiCanvas(true),
  renzoImages: createRenzoImages(),
  characters: createCharacterImages(),
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
  quoteTimer: 0,
  isStunned: false,
  stunTimer: 0
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
  // Tasti C ed Escape: Ritorno immediato alla selezione personaggio da QUALSIASI punto del gioco con vite ricaricate a 3!
  if (code === 'KeyC' || code === 'Escape') {
    if (gameState !== STATE_SELECT) {
      lives = 3;
      isPaused = false;
      gameState = STATE_SELECT;
      playSound('score');
      return;
    }
  }

  // Tasto P per mettere in PAUSA la partita o lo spogliatoio
  if (code === 'KeyP') {
    if (gameState === STATE_PLAYING || gameState === STATE_UNDERGROUND) {
      isPaused = !isPaused;
      playSound('score');
      return;
    }
  }

  // Tasto L per aprire/chiudere l'Albo d'Oro e Classifica
  if (code === 'KeyL') {
    if (gameState === STATE_LEADERBOARD) {
      gameState = STATE_SELECT;
      playSound('score');
      return;
    } else if (gameState === STATE_SELECT || gameState === STATE_GAMEOVER) {
      lastPlayerRank = -1;
      gameState = STATE_LEADERBOARD;
      playSound('score');
      return;
    }
  }

  // Interazione nello Spogliatoio Sotterraneo (K, X, E, Spazio, Invio o tocco su Calcia)
  if (gameState === STATE_UNDERGROUND) {
    if (!isPaused && (code === 'KeyK' || code === 'KeyX' || code === 'KeyE' || code === 'Space' || code === 'Enter')) {
      interactWithUndergroundCharacters();
      return;
    }
  }

  if (gameState === STATE_SELECT) {
    if (code === 'ArrowLeft' || code === 'KeyA') {
      selectedHeroIndex = (selectedHeroIndex + 5) % 6;
      carlonNoticeTimer = 0;
      playSound('score');
    }
    if (code === 'ArrowRight' || code === 'KeyD') {
      selectedHeroIndex = (selectedHeroIndex + 1) % 6;
      carlonNoticeTimer = 0;
      playSound('score');
    }
    if (code === 'Space' || code === 'Enter' || code === 'KeyK') {
      if (selectedHeroIndex === 4) {
        // EASTER EGG: CARLON non è interessato a giocare!
        carlonNoticeTimer = 4.5;
        playSound('hit');
        return; // Blocca la partenza e forza a scegliere un altro personaggio!
      }
      carlonNoticeTimer = 0;
      applyHeroSelection();
      lives = 3;
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
  } else if (gameState === STATE_GAMEOVER) {
    if (code === 'Space' || code === 'Enter' || code === 'KeyK' || code === 'KeyR') {
      lives = 3;
      if (hasCheckpoint && checkpointLevel === 2) {
        score = checkpointScore;
        startLevel(2);
      } else {
        score = 0;
        startLevel(1);
      }
      playSound('jump');
    } else if (code === 'KeyC' || code === 'Escape') {
      lives = 3;
      gameState = STATE_SELECT;
      playSound('score');
    }
  } else if (gameState === STATE_VICTORY) {
    if (code === 'Space' || code === 'Enter' || code === 'KeyK') {
      lives = 3;
      hasCheckpoint = false;
      checkpointLevel = 1;
      nameEntry = ['A', 'A', 'A'];
      nameEntryIndex = 0;
      gameState = STATE_NAME_ENTRY;
      playSound('score');
      return;
    }
  } else if (gameState === STATE_NAME_ENTRY) {
    if (code === 'ArrowLeft' || code === 'KeyA') {
      nameEntryIndex = (nameEntryIndex + 2) % 3;
      playSound('jump');
      return;
    }
    if (code === 'ArrowRight' || code === 'KeyD') {
      nameEntryIndex = (nameEntryIndex + 1) % 3;
      playSound('jump');
      return;
    }
    if (code === 'ArrowUp' || code === 'KeyW') {
      let idx = NAME_CHARS.indexOf(nameEntry[nameEntryIndex]);
      idx = (idx - 1 + NAME_CHARS.length) % NAME_CHARS.length;
      nameEntry[nameEntryIndex] = NAME_CHARS[idx];
      playSound('jump');
      return;
    }
    if (code === 'ArrowDown' || code === 'KeyS') {
      let idx = NAME_CHARS.indexOf(nameEntry[nameEntryIndex]);
      idx = (idx + 1) % NAME_CHARS.length;
      nameEntry[nameEntryIndex] = NAME_CHARS[idx];
      playSound('jump');
      return;
    }
    if (code === 'Backspace') {
      nameEntry[nameEntryIndex] = 'A';
      nameEntryIndex = Math.max(0, nameEntryIndex - 1);
      playSound('hit');
      return;
    }
    if (code.startsWith('Key') && code.length === 4) {
      const letter = code.charAt(3).toUpperCase();
      nameEntry[nameEntryIndex] = letter;
      playSound('score');
      if (nameEntryIndex < 2) nameEntryIndex++;
      return;
    }
    if (code.startsWith('Digit') && code.length === 6) {
      const num = code.charAt(5);
      nameEntry[nameEntryIndex] = num;
      playSound('score');
      if (nameEntryIndex < 2) nameEntryIndex++;
      return;
    }
    if (code === 'Enter' || code === 'Space' || code === 'KeyK') {
      if (nameEntryIndex < 2) {
        nameEntryIndex++;
        playSound('score');
      } else {
        confirmHighScore();
      }
      return;
    }
  } else if (gameState === STATE_LEADERBOARD) {
    if (code === 'Space' || code === 'Enter' || code === 'KeyK' || code === 'KeyC' || code === 'Escape' || code === 'KeyL') {
      gameState = STATE_SELECT;
      playSound('score');
      return;
    }
  }
}

function applyHeroSelection() {
  if (selectedHeroIndex === 0) {
    // CIUFFO (FACILE): Molto veloce, scattante, ottimo tiro
    hero.name = 'CIUFFO';
    hero.speed = 280;
    hero.jumpForce = -385;
  } else if (selectedHeroIndex === 1) {
    // LEON (MEDIO): Meno veloce di Ciuffo ma ottimo salto e tiro potente
    hero.name = 'LEON';
    hero.speed = 235;
    hero.jumpForce = -400;
  } else if (selectedHeroIndex === 2) {
    // JOAO (DIFFICILE): Velocità moderata, tiro meno preciso
    hero.name = 'JOAO';
    hero.speed = 220;
    hero.jumpForce = -375;
  } else if (selectedHeroIndex === 3) {
    // BARSALINI (MOLTO DIFFICILE): Vittima prediletta di Renzo
    hero.name = 'BARSALINI';
    hero.speed = 225;
    hero.jumpForce = -365;
  } else if (selectedHeroIndex === 5) {
    // LINDI (MOLTO FACILE): Il cocco di Renzo
    hero.name = 'LINDI';
    hero.speed = 265;
    hero.jumpForce = -390;
  } else {
    hero.name = 'CIUFFO';
    hero.speed = 280;
    hero.jumpForce = -385;
  }
}

function startLevel(lvl) {
  currentLevel = lvl;
  lives = 3; // Ricarica le vite a ogni avvio di livello senza dover ricaricare la pagina!
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

  const isLindi = (hero.name === 'LINDI');
  const isBarsa = (hero.name === 'BARSALINI');

  renzo.x = 280;
  renzo.y = platforms[0].y1 - 86;
  renzo.throwTimer = isLindi ? 999 : (isBarsa ? 1.2 : 1.8);
  renzo.isThrowing = false;
  renzo.isStunned = false;
  renzo.stunTimer = 0;
  renzo.quote = isLindi ? "VAI LINDI! GRANDE LINDI!" : (isBarsa ? "BARSA!!" : "");
  renzo.quoteTimer = (isLindi || isBarsa) ? 3.5 : 0;

  if (isLindi) {
    floatingTexts.push({ text: 'MISTER RENZO: "VAI LINDI! SALI TRANQUILLO, SEI IL MIO CAMPIONE!" 👏', x: 180, y: 35, timer: 3.5, color: '#10b981' });
  } else if (isBarsa) {
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
  playSound('kick');

  let shootDir = hero.facingRight ? 1 : -1;
  let shootVx = shootDir * 600;
  let shootVy = -120;
  let cooldown = 1.5;

  if (hero.name === 'LINDI') {
    // MOLTO FACILE: Tiro radente laser perfetto, velocissimo, ricarica istantanea
    shootVx = shootDir * 780;
    shootVy = -25;
    cooldown = 0.80;
  } else if (hero.name === 'CIUFFO') {
    // FACILE: Ottimo tiro (laser radente piatto, super veloce, ricarica rapida)
    shootVx = shootDir * 750;
    shootVy = -30;
    cooldown = 0.95;
  } else if (hero.name === 'LEON') {
    // MEDIO: Sempre ottimo tiro (potente, teso)
    shootVx = shootDir * 690;
    shootVy = -60;
    cooldown = 1.30;
  } else if (hero.name === 'JOAO') {
    // ABBASTANZA DIFFICILE: Tiro meno preciso (leggero scarto/wobble verticale)
    const wobble = (Math.random() * 80 - 40);
    shootVx = shootDir * 530;
    shootVy = -110 + wobble;
    cooldown = 1.70;
  } else if (hero.name === 'BARSALINI') {
    // IMPOSSIBILE: Tiro debole, affannato, ricarica lunghissima
    shootVx = shootDir * 490;
    shootVy = -130 + (Math.random() * 60 - 30);
    cooldown = 2.20;
  }

  hero.ballCooldown = cooldown;

  if (hero.y < 120) {
    // Sulla cima: se rivolto a sinistra tira in porta, se rivolto a destra colpisce Renzo!
    if (!hero.facingRight) {
      shootVx = (hero.name === 'LINDI' || hero.name === 'CIUFFO' || hero.name === 'LEON') ? -750 : -620;
      shootVy = -40;
    } else {
      shootVx = (hero.name === 'LINDI' || hero.name === 'CIUFFO' || hero.name === 'LEON') ? 700 : 600;
      shootVy = -40;
    }
  } else if (hero.y >= 120 && hero.y < 280) {
    // Sul Tier 5 (appena sotto la rampa di Renzo):
    // Se tira verso Renzo, la palla compie un pallonetto parabolico che sale sulla piattaforma di Renzo per colpirlo!
    const facingRenzo = (hero.facingRight && hero.x < renzo.x) || (!hero.facingRight && hero.x > renzo.x);
    if (facingRenzo) {
      const dir = (hero.x < renzo.x) ? 1 : -1;
      shootVx = dir * ((hero.name === 'LINDI' || hero.name === 'CIUFFO' || hero.name === 'LEON') ? 560 : 500);
      shootVy = -410; // Pallonetto perfetto che scavalca la rampa e stende Renzo!
    }
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
  if (gameState === STATE_UNDERGROUND) {
    if (!isPaused) updateUnderground(dt);
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
  // Difficoltà implicita bilanciata: Molto facile (Lindi), Facile (Ciuffo), Medio (Leon), Difficile (Joao), Molto difficile (Barsalini)
  // -----------------------------------------------------------------------
  const isLindi = (hero.name === 'LINDI');
  const isBarsa = (hero.name === 'BARSALINI');
  const isJoao = (hero.name === 'JOAO');
  const isLeon = (hero.name === 'LEON');
  const isCiuffo = (hero.name === 'CIUFFO');

  // Gestione stordimento di Mister Renzo (se colpito dal pallone!)
  if (renzo.stunTimer > 0) {
    renzo.stunTimer -= dt;
    renzo.isStunned = true;
    renzo.isThrowing = false;
    renzo.throwTimer = Math.max(renzo.throwTimer, 2.5);
    if (renzo.stunTimer <= 0) {
      renzo.isStunned = false;
      renzo.quote = isBarsa ? "BARSA ME LA PAGHI!" : "RIMETTIAMOCI IN DIFESA!";
      renzo.quoteTimer = 1.8;
    }
  }

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

  // Scala su cui si trova l'eroe
  const climbingLadder = hero.isClimbing ? ladders.find(l => Math.abs((hero.x + 24) - l.x) < 30) : null;
  const isNearLadder380 = (climbingLadder && climbingLadder.x === 380);
  const isTier5Safe = (heroFloor === 5 && (hero.x <= 490 || Math.abs(hero.x - renzo.x) < 140));
  const isSafeZone = isNearLadder380 || isTier5Safe;

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

  // COMPORTAMENTO SPECIALE PER LINDI: Renzo non gli tira MAI le ciabatte e lo incita!
  if (isLindi) {
    renzo.throwTimer = 999;
    renzo.isThrowing = false;

    if (heroFloor === 6 && !goalState.scored) {
      // In cima Renzo tira la palla in rete per facilitare il lavoro a Lindi!
      renzo.quote = "LASCIA FARE A ME LINDI! TI SEGNO IL GOL IO!";
      renzo.quoteTimer = 2.5;
      playSound('kick');
      kickedBalls.push({
        x: renzo.x - 20,
        y: 55,
        vx: -720,
        vy: -25,
        rot: 0,
        active: true,
        pickupTimer: 999
      });
      floatingTexts.push({ text: '⚽ RENZO CALCIA IL PALLONE IN RETE PER LINDI!', x: 180, y: 35, timer: 2.5, color: '#10b981' });
    } else if (renzo.quoteTimer <= 0) {
      const lindiQuotes = [
        "VAI LINDI! GRANDE LINDI!",
        "SEI IL MIGLIORE LINDI, SALI!",
        "TRANQUILLO LINDI, NESSUNA CIABATTA PER TE!",
        "CHE CLASSE LINDI! VAI IN RETE!",
        "CAMPIONE VERO LINDI!"
      ];
      renzo.quote = lindiQuotes[Math.floor(Math.random() * lindiQuotes.length)];
      renzo.quoteTimer = 2.5;
    }
  } else {
    // Altri eroi: gestione lanci e reazioni vocali
    const difficultyThrowMult = isBarsa ? 0.62 : (isJoao ? 0.90 : (isLeon ? 1.05 : 1.30));
    const barsaSpeedMult = difficultyThrowMult;

    renzo.throwTimer -= dt;

    // Se il giocatore è nella Safe Zone sotto la rampa o su scala 380, Renzo non può colpirlo!
    if (isSafeZone) {
      renzo.isThrowing = false;
      renzo.throwTimer = 1.8;
      if (renzo.quoteTimer <= 0) {
        renzo.quote = isBarsa ? "BARSA SEI TROPPO VICINO! AIUTO!" : "E TROPPO VICINO! CATENACCIO ROTTO!";
        renzo.quoteTimer = 1.8;
      }
    }

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
    } else if (heroFloor === 5 && !goalState.scored && !isSafeZone) {
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
    } else if (hero.isClimbing && renzo.quoteTimer <= 0 && !isSafeZone) {
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

    // Preavviso di lancio (Renzo carica il braccio con la ciabatta, MA solo se non è stordito, non è Lindi e non è in Safe Zone!)
    if (renzo.throwTimer <= 0.45 && !renzo.isThrowing && !renzo.isStunned && !goalState.scored && heroFloor < 6 && !isSafeZone) {
      renzo.isThrowing = true;
      renzo.animTimer = 0.45;
    }

    if (renzo.isThrowing && !renzo.isStunned && !goalState.scored && heroFloor < 6 && !isSafeZone) {
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
        // STRATEGIA 1: PUNIZIONE SCALA (MAI SU SCALA 380!)
        // -------------------------------------------------------------------
        if (climbingLadder && climbingLadder.x !== 380) {
          renzo.throwTimer = ((currentLevel === 2) ? 1.1 : 1.4) * barsaSpeedMult;
          renzo.quote = isBarsa ? "BARSA GIÙ DA QUELLA SCALA!" : "GIÙ DA QUELLA SCALA!";
          renzo.quoteTimer = 1.6;

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
        // -------------------------------------------------------------------
        // STRATEGIA 2: ULTIMO PIANO - DIFESA DELLA PORTA A CATENACCIO (Tier 5)
        // -------------------------------------------------------------------
        else if (heroFloor === 5 && !isSafeZone) {
          renzo.throwTimer = ((currentLevel === 2) ? 0.90 : 1.10) * barsaSpeedMult;

          const plat5 = platforms[1];
          const dirToHero = (hero.x > renzoHandX) ? 1 : -1;
          const isMissile = Math.random() < 0.55;

          if (isMissile) {
            renzo.quote = isBarsa ? "SILURO PER IL BARSA!" : "SILURO RASOTERRA!";
            renzo.quoteTimer = 1.3;
            const baseMissileSpeed = (currentLevel === 2) ? 340 : 300;
            const speed = isBarsa ? 370 : (isJoao ? baseMissileSpeed + 20 : (isLeon ? baseMissileSpeed : baseMissileSpeed - 40));

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

          if ((currentLevel === 2 || isBarsa || (isJoao && Math.random() < 0.4) || (isLeon && Math.random() < 0.2)) && !isCiuffo && !goalState.scored && !isSafeZone) {
            setTimeout(() => {
              if (gameState === STATE_PLAYING && !goalState.scored && hero.y > 120 && !isPaused && hero.x > 490) {
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
        else if (heroFloor < 5) {
          const doTargetedLob = Math.random() < (isBarsa ? 0.92 : (isJoao ? 0.75 : (isLeon ? 0.55 : 0.35)));

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

            const baseSlipperSpeed = (currentLevel === 2) ? 240 : 200;
            const slipperSpeed = isBarsa ? 290 : (isJoao ? baseSlipperSpeed + 25 : (isLeon ? baseSlipperSpeed : baseSlipperSpeed - 35));
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
      const onLadder380 = (hero.isClimbing && climbingLadder && climbingLadder.x === 380);
      if (!onLadder380 && Math.hypot((hero.x + 20) - s.x, (hero.y + 25) - s.y) < 24) {
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

    // RILEVAMENTO COLPITO MISTER RENZO CON IL PALLONE
    if (b.active && !renzo.isStunned && !isLindi) {
      const renzoW = 74;
      const renzoH = 94;
      const renzoL = renzo.x - renzoW / 2;
      const renzoR = renzo.x + renzoW / 2;
      const renzoT = 6;
      const renzoB = 100;

      if (b.x >= renzoL && b.x <= renzoR && b.y >= renzoT && b.y <= renzoB) {
        b.active = false;
        renzo.isStunned = true;
        renzo.stunTimer = 4.5;
        renzo.isThrowing = false;
        score += 1000;
        playSound('ko');
        createSlipperSparks(renzo.x, 50);

        const stunQuotes = isBarsa ? [
          "AIA BARSA! MA SEI IMPAZZITO?!",
          "BARSA MI HAI PRESO IN PIENO!",
          "FALLO DA ESPULSIONE BARSA!"
        ] : [
          "AIA! MA COME TI PERMETTI?!",
          "CHE BOTTA! DOVE SONO LE MIE CIABATTE?!",
          "RIGORE E CARTELLINO ROSSO!"
        ];
        renzo.quote = stunQuotes[Math.floor(Math.random() * stunQuotes.length)];
        renzo.quoteTimer = 4.5;

        floatingTexts.push({
          text: '💥 MISTER RENZO COLPITO IN PIENO! STORDITO! +1000 PTS!',
          x: renzo.x - 120,
          y: 20,
          timer: 2.2,
          color: '#ffea00'
        });
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
    // Se siamo a terra (quota 695) e vogliamo scendere dalla scala, apriamo lo spogliatoio segreto!
    if (wantsDown && footY >= 685 && nearLadder.bottomY >= 690) {
      enterUndergroundRoom();
      return;
    }
    hero.isClimbing = true;
    hero.isGrounded = false;
    hero.x = nearLadder.x - 24;
  }

  if (hero.isClimbing) {
    hero.vy = 0;
    if (wantsUp) hero.y -= 160 * dt;
    if (wantsDown) {
      hero.y += 160 * dt;
      if (footY >= 690 && nearLadder && nearLadder.bottomY >= 690) {
        enterUndergroundRoom();
        return;
      }
    }
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

  // Caduta sotto il piano terra: entra nello spogliatoio segreto invece di cadere all'infinito
  if (hero.y > 670 || footY > 715) {
    enterUndergroundRoom();
    return;
  }

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
        hasCheckpoint = true;
        checkpointLevel = 2;
        checkpointScore = score;
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

  if (gameState === STATE_NAME_ENTRY) {
    drawNameEntry();
    return;
  }

  if (gameState === STATE_LEADERBOARD) {
    drawLeaderboard();
    return;
  }

  if (gameState === STATE_UNDERGROUND) {
    renderUnderground();
    if (isPaused) drawPauseScreen();
    return;
  }

  // Piattaforme e scale verdi da campo da calcio
  platforms.forEach(p => p.draw(ctx));
  ladders.forEach(l => l.draw(ctx));

  // Botola segreta per scendere nello spogliatoio dell'AC Brissago (quota 695 a destra, scala x = 1100)
  ctx.save();
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(1084, 694, 32, 6);
  ctx.fillStyle = '#000000';
  ctx.fillRect(1088, 696, 24, 2);
  if (hero.y >= 610 && Math.abs((hero.x + 24) - 1100) < 65) {
    const pulse = Math.abs(Math.sin(performance.now() * 0.007));
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 13px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('▼ SCENDI NELLO SPOGLIATOIO ▼', 1100, 680 - pulse * 4);
  }
  ctx.restore();

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
  if (renzo.isStunned) {
    renzoImgObj = sprites.renzoImages.stride || sprites.renzoImages.idle;
  } else if (goalState.scored) {
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
    const stunShakeX = renzo.isStunned ? Math.sin(performance.now() * 0.04) * 4 : 0;

    if (!renzoFacesRight) {
      ctx.translate(renzoCenterX + stunShakeX, drawY + drawH / 2);
      ctx.scale(-1, 1);
      ctx.drawImage(renzoImgObj.img, -drawW / 2, -drawH / 2, drawW, drawH);
    } else {
      ctx.drawImage(renzoImgObj.img, renzoCenterX + stunShakeX - drawW / 2, drawY, drawW, drawH);
    }
  }
  ctx.restore();

  // Stelle e testo STORDITO quando Renzo è colpito dalla palla
  if (renzo.isStunned) {
    ctx.save();
    ctx.font = 'bold 16px Courier New';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd700';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 6;
    const starCycle = Math.floor(performance.now() * 0.006) % 3;
    const starStr = (starCycle === 0) ? '⭐ 💫 ⭐ STORDITO!' : (starCycle === 1) ? '💫 ⭐ 💫 STORDITO!' : '⭐ ⭐ 💫 STORDITO!';
    ctx.fillText(starStr, renzoCenterX, 100 - 94 - 14);
    ctx.restore();
  }

  // Fumetto tattico di Mister Renzo!
  if (!renzo.isStunned && renzo.quote && renzo.quoteTimer > 0) {
    drawSpeechBubble(renzoCenterX, -4, renzo.quote);
  }

  // Rivali (FIX: Disegno sprite isolato per evitare che il testo finisca a sinistra!)
  rivals.forEach(r => {
    // 1. Disegna solo lo sprite con l'eventuale flip dentro save/restore
    ctx.save();
    if (r.defeated) {
      ctx.translate(r.x + 22, r.y + 22);
      ctx.rotate(r.spin);
      if (r.isAlex && sprites.characters && sprites.characters.alex) {
        const alexDef = sprites.characters.alex.defeated;
        const aW = 46, aH = 46;
        ctx.drawImage(alexDef.img, -aW / 2, -aH / 2, aW, aH);
      } else {
        ctx.drawImage(r.sprite, -22, -22, 45, 45);
      }
    } else {
      if (r.isAlex && sprites.characters && sprites.characters.alex) {
        const runFrame = Math.floor(performance.now() * 0.007) % 2;
        const alexImgObj = (runFrame === 0) ? sprites.characters.alex.run1 : sprites.characters.alex.run2;
        const aH = 50;
        const aW = Math.round(aH * (alexImgObj.w / alexImgObj.h));
        if (r.dir < 0) {
          ctx.translate(r.x + 22, r.y + 22);
          ctx.scale(-1, 1);
          ctx.drawImage(alexImgObj.img, -aW / 2, -aH / 2, aW, aH);
        } else {
          ctx.drawImage(alexImgObj.img, r.x + (44 - aW) / 2, r.y - 4, aW, aH);
        }
      } else {
        if (r.dir < 0) {
          ctx.translate(r.x + 45, r.y);
          ctx.scale(-1, 1);
          ctx.drawImage(r.sprite, 0, 0, 45, 45);
        } else {
          ctx.drawImage(r.sprite, r.x, r.y, 45, 45);
        }
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

  // Eroe (con sprite animati ad alta definizione per Ciuffo, Leon, Joao, Barsalini, Carlon, Lindi)
  let heroCharKey = (selectedHeroIndex === 0 || hero.name === 'CIUFFO') ? 'ciuffo'
    : (selectedHeroIndex === 1 || hero.name === 'LEON') ? 'leon'
    : (selectedHeroIndex === 2 || hero.name === 'JOAO') ? 'joao'
    : (selectedHeroIndex === 3 || hero.name === 'BARSALINI') ? 'barsalini'
    : (selectedHeroIndex === 4 || hero.name === 'CARLON') ? 'carlon'
    : 'lindi';

  let heroImgObj = null;
  if (sprites.characters && sprites.characters[heroCharKey]) {
    const charSprites = sprites.characters[heroCharKey];
    if (gameState === STATE_VICTORY || gameState === STATE_LEVEL_CLEAR) {
      heroImgObj = charSprites.cheer || charSprites.idle;
    } else if (hero.isClimbing) {
      heroImgObj = charSprites.climb || charSprites.idle;
    } else if (!hero.hasBall && hero.ballCooldown > 0.65 && charSprites.kick) {
      heroImgObj = charSprites.kick;
    } else if (Math.abs(hero.vx) > 12 || (keys['ArrowLeft'] || keys['ArrowRight'] || keys['KeyA'] || keys['KeyD'])) {
      const runFrame = Math.floor(performance.now() * 0.008) % 2;
      heroImgObj = (runFrame === 0) ? charSprites.run1 : (charSprites.run2 || charSprites.run1);
    } else {
      heroImgObj = charSprites.idle;
    }
  }

  let heroFallbackSprite = (selectedHeroIndex === 0 || hero.name === 'CIUFFO')
    ? (hero.isClimbing ? sprites.ciuffoClimb : sprites.ciuffo)
    : (selectedHeroIndex === 1 || hero.name === 'LEON')
      ? (hero.isClimbing ? sprites.leonClimb : sprites.leon)
      : (selectedHeroIndex === 2 || hero.name === 'JOAO')
        ? (hero.isClimbing ? sprites.joaoClimb : sprites.joao)
        : (selectedHeroIndex === 3 || hero.name === 'BARSALINI')
          ? (hero.isClimbing ? sprites.barsaliniClimb : sprites.barsalini)
          : (selectedHeroIndex === 5 || hero.name === 'LINDI')
            ? (hero.isClimbing ? sprites.lindiClimb : sprites.lindi)
            : (hero.isClimbing ? sprites.carlonClimb : sprites.carlon);

  if (hero.invulnTimer <= 0 || Math.floor(hero.invulnTimer * 15) % 2 === 0) {
    ctx.save();
    if (heroImgObj && heroImgObj.img) {
      const drawH = 50;
      const drawW = Math.round(drawH * (heroImgObj.w / heroImgObj.h));
      const drawY = hero.y + 48 - drawH;
      const drawX = hero.x + (48 - drawW) / 2;

      if (!hero.facingRight) {
        ctx.translate(hero.x + 24, drawY + drawH / 2);
        ctx.scale(-1, 1);
        ctx.drawImage(heroImgObj.img, -drawW / 2, -drawH / 2, drawW, drawH);
      } else {
        ctx.drawImage(heroImgObj.img, drawX, drawY, drawW, drawH);
      }
    } else {
      if (!hero.facingRight) {
        ctx.translate(hero.x + 48, hero.y);
        ctx.scale(-1, 1);
        ctx.drawImage(heroFallbackSprite, 0, 0, 48, 48);
      } else {
        ctx.drawImage(heroFallbackSprite, hero.x, hero.y, 48, 48);
      }
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
  if (isPaused && (gameState === STATE_PLAYING || gameState === STATE_UNDERGROUND)) {
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
  const locName = (gameState === STATE_UNDERGROUND) ? 'SPOGLIATOIO SEGRETO' : `LIVELLO ${currentLevel}`;
  ctx.fillText(`EROE: ${hero.name} | ${locName} | PUNTI: ${score}`, V_WIDTH / 2, by + 165);

  ctx.fillStyle = '#4ade80';
  ctx.font = '14px Courier New';
  ctx.fillText('[C / ESC] Menu Selezione Eroi  |  [P] Continua Partita', V_WIDTH / 2, by + 205);
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
  ctx.fillText('[C / ESC] MENU EROI  |  [P] PAUSA  |  [⚽ CALCIA] K / INVIO', 440, V_HEIGHT - 20);
}

function drawCharacterSelect() {
  ctx.fillStyle = '#ffd700'; ctx.font = 'bold 32px Courier New'; ctx.textAlign = 'center';
  ctx.fillText('SCEGLI IL TUO EROE DELL\'AC BRISSAGO', V_WIDTH / 2, 50);
  ctx.fillStyle = '#94a3b8'; ctx.font = '17px Courier New';
  ctx.fillText('IL COMANDANTE TAIRA ASSEGNERA LA MISSIONE A LUI!', V_WIDTH / 2, 82);

  const heroes = [
    {
      name: 'CIUFFO',
      badge: 'Facile',
      badgeColor: '#22c55e',
      motto: 'Nessuno si ricorda il suo vero nome',
      charKey: 'ciuffo',
      fallback: sprites.ciuffo
    },
    {
      name: 'LEON',
      badge: 'Medio',
      badgeColor: '#38bdf8',
      motto: 'Si okay ma tuo fratello?',
      charKey: 'leon',
      fallback: sprites.leon
    },
    {
      name: 'JOAO',
      badge: 'Difficile',
      badgeColor: '#f97316',
      motto: 'swag',
      charKey: 'joao',
      fallback: sprites.joao
    },
    {
      name: 'BARSALINI',
      badge: 'Molto difficile',
      badgeColor: '#ef4444',
      motto: 'Il bersaglio di Renzo',
      charKey: 'barsalini',
      fallback: sprites.barsalini
    },
    {
      name: 'CARLON',
      badge: '?',
      badgeColor: '#a855f7',
      motto: 'Ha altri impegni...',
      charKey: 'carlon',
      fallback: sprites.carlon
    },
    {
      name: 'LINDI',
      badge: 'Molto facile',
      badgeColor: '#10b981',
      motto: 'Il cocco di Renzo',
      charKey: 'lindi',
      fallback: sprites.lindi
    }
  ];

  const cardW = 186;
  const cardH = 470;
  const cardGap = 16;
  const startX = 42; // (1280 - (6*186 + 5*16)) / 2 = 42

  heroes.forEach((h, i) => {
    const cx = startX + i * (cardW + cardGap);
    const isSel = (selectedHeroIndex === i);

    // Box della carta
    ctx.fillStyle = isSel ? 'rgba(30, 48, 80, 0.96)' : 'rgba(15, 20, 32, 0.88)';
    ctx.fillRect(cx, 120, cardW, cardH);
    ctx.lineWidth = isSel ? 3.5 : 1.5;
    ctx.strokeStyle = isSel ? '#ffe600' : '#334155';
    ctx.strokeRect(cx, 120, cardW, cardH);

    // Badge Difficoltà a Pillola
    ctx.font = 'bold 12px Courier New';
    const bTextW = ctx.measureText(h.badge).width;
    const pillW = Math.max(74, bTextW + 16);
    const pillH = 22;
    const pillX = cx + (cardW - pillW) / 2;
    const pillY = 132;

    ctx.fillStyle = h.badgeColor;
    ctx.fillRect(pillX, pillY, pillW, pillH);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.strokeRect(pillX, pillY, pillW, pillH);

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(h.badge, pillX + pillW / 2, pillY + 15);

    // Nome Eroe
    ctx.fillStyle = isSel ? '#ffd700' : '#ffffff';
    ctx.font = 'bold 21px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText(h.name, cx + cardW / 2, 178);

    // Riquadro Avatar Portrait
    ctx.fillStyle = '#080c14';
    ctx.fillRect(cx + 12, 192, cardW - 24, 185);
    ctx.lineWidth = isSel ? 2 : 1;
    ctx.strokeStyle = isSel ? '#ffd700' : '#1e293b';
    ctx.strokeRect(cx + 12, 192, cardW - 24, 185);

    // Disegno sprite del personaggio (ufficiale da spritesheet se disponibile)
    let charImgObj = null;
    if (sprites.characters && sprites.characters[h.charKey] && sprites.characters[h.charKey].idle) {
      charImgObj = sprites.characters[h.charKey].idle;
    }

    if (charImgObj && charImgObj.img) {
      const pH = 165;
      const pW = Math.round(pH * (charImgObj.w / charImgObj.h));
      ctx.drawImage(charImgObj.img, cx + (cardW - pW) / 2, 202, pW, pH);
    } else {
      ctx.drawImage(h.fallback, cx + (cardW - 110) / 2, 228, 110, 110);
    }

    // Unica scritta ammessa: Motto del personaggio
    ctx.fillStyle = isSel ? '#ffd700' : '#93c5fd';
    ctx.font = 'bold 13px Courier New';
    ctx.textAlign = 'center';
    if (h.motto.length > 18) {
      const words = h.motto.split(' ');
      const mid = Math.ceil(words.length / 2);
      ctx.fillText(words.slice(0, mid).join(' '), cx + cardW / 2, 412);
      ctx.fillText(words.slice(mid).join(' '), cx + cardW / 2, 432);
    } else {
      ctx.fillText(h.motto, cx + cardW / 2, 420);
    }

    // Stato di selezione in basso
    ctx.textAlign = 'center';
    if (isSel) {
      ctx.fillStyle = (i === 4) ? '#f43f5e' : '#22c55e';
      ctx.font = 'bold 14px Courier New';
      ctx.fillText((i === 4) ? '⚠️ EASTER EGG' : '▶ SELEZIONATO ◀', cx + cardW / 2, 565);
    } else {
      ctx.fillStyle = '#64748b';
      ctx.font = '12px Courier New';
      ctx.fillText('Premi invio', cx + cardW / 2, 565);
    }
  });

  ctx.fillStyle = '#00f0ff';
  ctx.font = 'bold 18px Courier New';
  ctx.textAlign = 'center';
  ctx.fillText('[◀ / ▶] Scegli Eroe  |  [SPAZIO / INVIO / ⚽] Conferma  |  [L / 🏆] ALBO D\'ORO RECORD', V_WIDTH / 2, V_HEIGHT - 35);
  ctx.textAlign = 'left';

  // POPUP EASTER EGG: CARLON NON E INTERESSATO!
  if (carlonNoticeTimer > 0) {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 5, 15, 0.88)';
    ctx.fillRect(0, 0, V_WIDTH, V_HEIGHT);

    const boxW = 860;
    const boxH = 270;
    const boxX = (V_WIDTH - boxW) / 2;
    const boxY = (V_HEIGHT - boxH) / 2;

    drawBox(boxX, boxY, boxW, boxH, 'rgba(18, 14, 28, 0.98)', '#ff3344');

    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ffd700';
    ctx.strokeRect(boxX + 6, boxY + 6, boxW - 12, boxH - 12);

    if (sprites.characters && sprites.characters.carlon && sprites.characters.carlon.idle) {
      const cImgObj = sprites.characters.carlon.idle;
      const cDrawH = 160;
      const cDrawW = Math.round(cDrawH * (cImgObj.w / cImgObj.h));
      ctx.drawImage(cImgObj.img, boxX + 45, boxY + 55, cDrawW, cDrawH);
    } else {
      ctx.drawImage(sprites.carlon, boxX + 35, boxY + 65, 120, 120);
    }

    ctx.fillStyle = '#ff4444';
    ctx.font = 'bold 24px Courier New';
    ctx.textAlign = 'left';
    ctx.fillText('COMUNICAZIONE UFFICIALE AC BRISSAGO', boxX + 175, boxY + 55);

    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 21px Courier New';
    ctx.fillText('Il pres scrive:', boxX + 175, boxY + 100);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 19px Courier New';
    ctx.fillText('"Carlon ha il compleanno della nonna e non può venire,', boxX + 175, boxY + 138);
    ctx.fillText('Alegher."', boxX + 175, boxY + 170);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 17px Courier New';
    ctx.fillText('👉 Scegli un altro personaggio con i tasti [◀ / ▶]!', boxX + 175, boxY + 225);
    ctx.restore();
  }
}

function drawBriefing() {
  drawBox(120, 150, 1040, 410, 'rgba(15, 20, 35, 0.96)', '#f5c828');
  if (sprites.characters && sprites.characters.taira && sprites.characters.taira.salute) {
    const tImg = sprites.characters.taira.salute;
    const tH = 150;
    const tW = Math.round(tH * (tImg.w / tImg.h));
    ctx.drawImage(tImg.img, 140, 175, tW, tH);
  } else {
    ctx.drawImage(sprites.taira, 150, 190, 100, 100);
  }

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
  if (sprites.characters && sprites.characters.taira && sprites.characters.taira.point1) {
    const tImg = sprites.characters.taira.point1;
    const tH = 150;
    const tW = Math.round(tH * (tImg.w / tImg.h));
    ctx.drawImage(tImg.img, 150, 190, tW, tH);
  } else {
    ctx.drawImage(sprites.taira, 170, 210, 100, 100);
  }

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
  ctx.textAlign = 'center';
  ctx.fillText('TOCCA LO SCHERMO O PREMI [SPAZIO] PER REGISTRARE IL RECORD NELL\'ALBO D\'ORO!', V_WIDTH / 2, 465);
  ctx.textAlign = 'left';
}

function drawGameOver() {
  drawBox(180, 220, 920, 275, 'rgba(50, 10, 10, 0.96)', '#ff2222');
  if (sprites.characters && sprites.characters.taira && sprites.characters.taira.radio) {
    const tImg = sprites.characters.taira.radio;
    const tH = 140;
    const tW = Math.round(tH * (tImg.w / tImg.h));
    ctx.drawImage(tImg.img, 195, 275, tW, tH);
  }
  ctx.fillStyle = '#ff3333'; ctx.font = 'bold 32px Courier New'; ctx.textAlign = 'center';
  ctx.fillText('MISSIONE FALLITA!', V_WIDTH / 2, 270);

  ctx.fillStyle = '#ffd700'; ctx.font = 'bold 22px Courier New';
  ctx.fillText('COMANDANTE TAIRA:', V_WIDTH / 2, 315);

  ctx.fillStyle = '#ffffff'; ctx.font = '19px Courier New';
  ctx.fillText(`'${hero.name}! NON MOLLARE ADESSO! L\'AC BRISSAGO HA BISOGNO DI TE!`, V_WIDTH / 2, 350);
  ctx.fillText('CALCIA QUEL PALLONE CONTRO DI LORO E RIPROVA PER LA QUARTA LEGA!\'', V_WIDTH / 2, 380);

  if (hasCheckpoint && checkpointLevel === 2) {
    ctx.fillStyle = '#22c55e'; ctx.font = 'bold 20px Courier New';
    ctx.fillText('★ CHECKPOINT ATTIVO: LIVELLO 2 ★', V_WIDTH / 2, 422);
    ctx.fillStyle = '#00f0ff'; ctx.font = 'bold 17px Courier New';
    ctx.fillText('[SPAZIO / INVIO / ⚽] RICOMINCIA DA LIVELLO 2  |  [C / ESC] CAMBIA PERSONAGGIO', V_WIDTH / 2, 458);
  } else {
    ctx.fillStyle = '#00f0ff'; ctx.font = 'bold 20px Courier New';
    ctx.fillText('TOCCA LO SCHERMO O PREMI [SPAZIO] PER RIPROVARE', V_WIDTH / 2, 445);
  }
  ctx.textAlign = 'left';
}

function drawBox(x, y, w, h, bg, border) {
  ctx.fillStyle = bg;
  ctx.fillRect(x, y, w, h);
  ctx.lineWidth = 4;
  ctx.strokeStyle = border;
  ctx.strokeRect(x, y, w, h);
}


// -------------------------------------------------------------------------
// SPOGLIATOIO SEGRETO / CLUB AC BRISSAGO (Sandro, Tolic, Vaz)
// -------------------------------------------------------------------------

function enterUndergroundRoom() {
  gameState = STATE_UNDERGROUND;
  isPaused = false;
  hero.x = 140 - 24;
  hero.y = 120; // Sta scendendo dalla scala in alto a sinistra
  hero.vx = 0;
  hero.vy = 0;
  hero.isClimbing = true;
  hero.isGrounded = false;
  hero.facingRight = true;
  playSound('jump');
  floatingTexts.push({ text: 'SALA TATTICA & SPOGLIATOIO SEGRETO AC BRISSAGO!', x: 260, y: 70, timer: 3.0, color: '#ffd700' });
}

function exitUndergroundRoom() {
  gameState = STATE_PLAYING;
  hero.x = 1100 - 24;
  hero.y = platforms[platforms.length - 1].y1 - 52;
  hero.vx = 0;
  hero.vy = 0;
  hero.isGrounded = true;
  hero.isClimbing = false;
  hero.facingRight = false;
  playSound('jump');
  floatingTexts.push({ text: 'RITORNO AL CAMPO DI CALCIO!', x: hero.x - 40, y: hero.y - 20, timer: 2.0, color: '#22c55e' });
}

function interactWithUndergroundCharacters() {
  const heroCenterX = hero.x + 24;
  for (let c of undergroundCharacters) {
    if (Math.abs(heroCenterX - c.x) < 85) {
      c.speechBubbleTimer = 3.5;
      c.talkTimer = 2.0;
      if (c.charKey === 'sandro') {
        c.pose = (c.pose === 'salute') ? 'thumbs_up' : 'salute';
      } else if (c.charKey === 'tolic') {
        c.pose = (c.pose === 'thumbs_up') ? 'think' : 'thumbs_up';
      } else if (c.charKey === 'vaz') {
        c.pose = (c.pose === 'flex') ? 'talk' : 'flex';
      }
      playSound('score');
      floatingTexts.push({ text: `${c.name}: "${c.quote}"`, x: c.x - 70, y: 480, timer: 2.5, color: c.tagCol });
      return true;
    }
  }
  return false;
}

function updateUnderground(dt) {
  let moveX = 0;
  if (keys['ArrowLeft'] || keys['KeyA']) { moveX -= 1; hero.facingRight = false; }
  if (keys['ArrowRight'] || keys['KeyD']) { moveX += 1; hero.facingRight = true; }

  const wantsUp = keys['ArrowUp'] || keys['KeyW'];
  const wantsDown = keys['ArrowDown'] || keys['KeyS'];
  const wantsJump = keys['Space'];

  const footX = hero.x + 24;
  const roomLadderX = 140;
  const isNearRoomLadder = Math.abs(footX - roomLadderX) < 32;

  if (isNearRoomLadder && (wantsUp || wantsDown)) {
    hero.isClimbing = true;
    hero.isGrounded = false;
    hero.x = roomLadderX - 24;
  }

  const floorY = 612;
  const heroGroundedY = floorY - 52;

  if (hero.isClimbing) {
    hero.vy = 0;
    if (wantsUp) hero.y -= 160 * dt;
    if (wantsDown) hero.y += 160 * dt;

    // Se sale fino in cima alla scala (y <= 85), risale al campo principale!
    if (hero.y <= 85) {
      exitUndergroundRoom();
      return;
    }

    // Se scende fino al pavimento dello spogliatoio
    if (hero.y >= heroGroundedY) {
      hero.y = heroGroundedY;
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
    }

    if (hero.y >= heroGroundedY) {
      hero.y = heroGroundedY;
      hero.vy = 0;
      hero.isGrounded = true;
    }
  }

  hero.x = Math.max(60, Math.min(V_WIDTH - 80, hero.x));

  // Gestione timer e pose compagni
  for (let c of undergroundCharacters) {
    if (c.speechBubbleTimer > 0) c.speechBubbleTimer -= dt;
    if (c.talkTimer > 0) {
      c.talkTimer -= dt;
      if (c.talkTimer <= 0) c.pose = 'idle';
    }

    // Se il giocatore cammina vicinissimo (<= 50px) e non c'è ancora un fumetto attivo, fai partire il dialogo
    if (Math.abs(footX - c.x) < 50 && c.speechBubbleTimer <= 0) {
      interactWithUndergroundCharacters();
    }
  }

  // Testi fluttuanti nello spogliatoio
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    const ft = floatingTexts[i];
    ft.timer -= dt;
    ft.y -= 30 * dt;
    if (ft.timer <= 0) floatingTexts.splice(i, 1);
  }
}

function renderUnderground() {
  ctx.save();

  // Sfondo stanza sotterranea / Spogliatoio & Club
  ctx.fillStyle = '#0a0d18';
  ctx.fillRect(0, 0, V_WIDTH, V_HEIGHT);

  // Muro a blocchi / pannelli sportivi blu scuro
  ctx.fillStyle = '#111827';
  ctx.fillRect(40, 70, V_WIDTH - 80, 542);
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#1e293b';
  ctx.strokeRect(40, 70, V_WIDTH - 80, 542);

  // Texture mattoni / pannelli
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.lineWidth = 1;
  for (let y = 110; y < 610; y += 45) {
    ctx.beginPath();
    ctx.moveTo(40, y);
    ctx.lineTo(V_WIDTH - 40, y);
    ctx.stroke();
  }

  // Insegna luminosa Club AC Brissago
  ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
  ctx.fillRect(V_WIDTH / 2 - 280, 85, 560, 48);
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#ef4444';
  ctx.strokeRect(V_WIDTH / 2 - 280, 85, 560, 48);

  ctx.fillStyle = '#f87171';
  ctx.font = 'bold 22px Courier New';
  ctx.textAlign = 'center';
  ctx.fillText('⚽ AC BRISSAGO - CLUB SEGRETO & SPOGLIATOIO TATTICO ⚽', V_WIDTH / 2, 117);

  // Lavagna tattica degli schemi (a sinistra)
  ctx.fillStyle = '#064e3b';
  ctx.fillRect(230, 160, 170, 120);
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#78350f';
  ctx.strokeRect(230, 160, 170, 120);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px Courier New';
  ctx.fillText('MODULO: 4-3-3', 315, 185);
  ctx.fillStyle = '#a7f3d0';
  ctx.font = '11px Courier New';
  ctx.fillText("TUTTI ALL'ATTACCO!", 315, 205);
  ctx.fillText('RENZO: NO CIABATTE', 315, 225);
  ctx.fillText('GOL = QUARTA LEGA', 315, 245);
  ctx.strokeStyle = '#fde047';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(315, 260, 8, 0, Math.PI * 2);
  ctx.stroke();

  // Banchina spogliatoio e armadietti
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(490, 260, 200, 240);
  ctx.strokeStyle = '#334155';
  ctx.strokeRect(490, 260, 200, 240);
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 12px Courier New';
  ctx.fillText('ARMADIETTI', 590, 285);
  ctx.fillText('SANDRO #7', 590, 315);
  ctx.fillText('TOLIC #4', 590, 340);
  ctx.fillText('VAZ #10', 590, 365);
  ctx.fillText('BARSALINI #11', 590, 390);

  // Vetrina dei Trofei (a destra)
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(820, 170, 170, 110);
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#ffd700';
  ctx.strokeRect(820, 170, 170, 110);
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 13px Courier New';
  ctx.fillText('🏆 BACHECA TROFEI 🏆', 905, 200);
  ctx.fillStyle = '#fef08a';
  ctx.font = '11px Courier New';
  ctx.fillText('COPA TICINO 2023', 905, 228);
  ctx.fillText('SOGNO QUARTA LEGA', 905, 252);

  // Pavimento in parquet sportivo e prato rasato
  ctx.fillStyle = '#78350f';
  ctx.fillRect(40, 612, V_WIDTH - 80, 14);
  ctx.fillStyle = '#15803d';
  ctx.fillRect(40, 612, V_WIDTH - 80, 5);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(40, 612, V_WIDTH - 80, 2);

  // Scala metallica per risalire (a sinistra: x = 140)
  for (let y = 70; y < 612; y += 16) {
    ctx.drawImage(sprites.ladder, 140 - 12, y);
  }

  // Portola / botola illuminata d'uscita in alto
  ctx.fillStyle = 'rgba(34, 197, 94, 0.25)';
  ctx.fillRect(110, 65, 60, 16);
  ctx.fillStyle = '#22c55e';
  ctx.font = 'bold 13px Courier New';
  ctx.textAlign = 'center';
  ctx.fillText('▲ USCITA AL CAMPO', 140, 55);

  // Disegno compagni di squadra (Sandro, Tolic, Vaz)
  for (let c of undergroundCharacters) {
    let charImgObj = null;
    if (sprites.characters && sprites.characters[c.charKey]) {
      charImgObj = sprites.characters[c.charKey][c.pose] || sprites.characters[c.charKey].idle;
    }

    const drawH = 96;
    const drawY = 612 - drawH;

    if (charImgObj && charImgObj.img) {
      const drawW = Math.round(drawH * (charImgObj.w / charImgObj.h));
      const drawX = c.x - drawW / 2;
      ctx.drawImage(charImgObj.img, drawX, drawY, drawW, drawH);
    } else {
      ctx.fillStyle = c.tagCol;
      ctx.fillRect(c.x - 20, drawY, 40, drawH);
    }

    // Badge Nome sopra la testa
    ctx.fillStyle = c.tagCol;
    ctx.font = 'bold 16px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText(c.name, c.x, drawY - 14);

    // Fumetto con frase se attivo
    if (c.speechBubbleTimer > 0) {
      drawSpeechBubble(c.x, drawY - 26, c.quote);
    } else {
      // Suggerimento di interazione se vicino
      const heroCenterX = hero.x + 24;
      if (Math.abs(heroCenterX - c.x) < 70) {
        const pulse = Math.abs(Math.sin(performance.now() * 0.008));
        ctx.fillStyle = '#fde047';
        ctx.font = 'bold 12px Courier New';
        ctx.fillText('💬 [⚽ / INVIO] PARLA', c.x, drawY - 26 - pulse * 4);
      }
    }
  }

  // Disegno Eroe
  let heroCharKey = (selectedHeroIndex === 0 || hero.name === 'CIUFFO') ? 'ciuffo'
    : (selectedHeroIndex === 1 || hero.name === 'LEON') ? 'leon'
    : (selectedHeroIndex === 2 || hero.name === 'JOAO') ? 'joao'
    : (selectedHeroIndex === 3 || hero.name === 'BARSALINI') ? 'barsalini'
    : (selectedHeroIndex === 4 || hero.name === 'CARLON') ? 'carlon'
    : 'lindi';

  let heroImgObj = null;
  if (sprites.characters && sprites.characters[heroCharKey]) {
    const charSprites = sprites.characters[heroCharKey];
    if (hero.isClimbing) {
      heroImgObj = charSprites.climb || charSprites.idle;
    } else if (keys['ArrowLeft'] || keys['ArrowRight'] || keys['KeyA'] || keys['KeyD']) {
      const runFrame = Math.floor(performance.now() * 0.008) % 2;
      heroImgObj = (runFrame === 0) ? charSprites.run1 : (charSprites.run2 || charSprites.run1);
    } else {
      heroImgObj = charSprites.idle;
    }
  }

  const hDrawH = 50;
  const hDrawW = heroImgObj ? Math.round(hDrawH * (heroImgObj.w / heroImgObj.h)) : 48;
  const hDrawY = hero.y + 48 - hDrawH;
  const hDrawX = hero.x + (48 - hDrawW) / 2;

  ctx.save();
  if (!hero.facingRight) {
    ctx.translate(hero.x + 24, hDrawY + hDrawH / 2);
    ctx.scale(-1, 1);
    if (heroImgObj && heroImgObj.img) {
      ctx.drawImage(heroImgObj.img, -hDrawW / 2, -hDrawH / 2, hDrawW, hDrawH);
    } else {
      ctx.drawImage(sprites.ciuffo, -24, -24, 48, 48);
    }
  } else {
    if (heroImgObj && heroImgObj.img) {
      ctx.drawImage(heroImgObj.img, hDrawX, hDrawY, hDrawW, hDrawH);
    } else {
      ctx.drawImage(sprites.ciuffo, hero.x, hero.y, 48, 48);
    }
  }
  ctx.restore();

  // Testi fluttuanti nello spogliatoio
  floatingTexts.forEach(ft => {
    ctx.fillStyle = ft.color;
    ctx.font = 'bold 20px Courier New';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 4;
    const clampedX = Math.max(30, Math.min(V_WIDTH - 280, ft.x));
    ctx.fillText(ft.text, clampedX, ft.y);
  });

  // Barra di stato e comandi in basso
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, V_HEIGHT - 40, V_WIDTH, 40);
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 15px Courier New';
  ctx.textAlign = 'left';
  ctx.fillText('SPOGLIATOIO SEGRETO | EROE: ' + hero.name + ' (VITE: ' + lives + ')', 30, V_HEIGHT - 16);
  ctx.fillStyle = '#38bdf8';
  ctx.textAlign = 'right';
  ctx.fillText('[C / ESC] MENU SELEZIONE EROI  |  [P] PAUSA  |  [▲ SCALA A SINISTRA] TORNA AL CAMPO', V_WIDTH - 30, V_HEIGHT - 16);

  ctx.restore();
}


// -------------------------------------------------------------------------
// CLASSIFICA GENERALE & INSERIMENTO RECORD 3 LETTERE (ALBO D'ORO)
// -------------------------------------------------------------------------

function confirmHighScore() {
  const nickname = nameEntry.join('').toUpperCase();
  const today = new Date();
  const dateStr = String(today.getDate()).padStart(2, '0') + '/' + String(today.getMonth() + 1).padStart(2, '0');

  const newEntry = {
    name: nickname,
    score: score,
    hero: hero.name,
    level: currentLevel,
    date: dateStr
  };

  highScores.push(newEntry);
  highScores.sort((a, b) => b.score - a.score);
  if (highScores.length > 10) highScores = highScores.slice(0, 10);

  lastPlayerRank = highScores.findIndex(e => e === newEntry);
  saveHighScores(highScores);
  highScore = highScores[0] ? highScores[0].score : score;

  playSound('victory');
  gameState = STATE_LEADERBOARD;
}

function drawNameEntry() {
  ctx.save();
  ctx.fillStyle = '#050714';
  ctx.fillRect(0, 0, V_WIDTH, V_HEIGHT);

  const boxW = 920;
  const boxH = 570;
  const boxX = (V_WIDTH - boxW) / 2;
  const boxY = (V_HEIGHT - boxH) / 2;

  drawBox(boxX, boxY, boxW, boxH, 'rgba(12, 18, 36, 0.98)', '#ffd700');

  // Titolo Arcade Gold
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 30px Courier New';
  ctx.textAlign = 'center';
  ctx.fillText('★ ALBO D\'ORO: REGISTRA IL TUO RECORD! ★', V_WIDTH / 2, boxY + 55);

  ctx.fillStyle = '#4ade80';
  ctx.font = 'bold 20px Courier New';
  ctx.fillText('PROMOZIONE IN QUARTA LEGA CONQUISTATA!', V_WIDTH / 2, boxY + 95);

  // Eroe portrait o sprite
  let heroCharKey = (selectedHeroIndex === 0 || hero.name === 'CIUFFO') ? 'ciuffo'
    : (selectedHeroIndex === 1 || hero.name === 'LEON') ? 'leon'
    : (selectedHeroIndex === 2 || hero.name === 'JOAO') ? 'joao'
    : (selectedHeroIndex === 3 || hero.name === 'BARSALINI') ? 'barsalini'
    : (selectedHeroIndex === 4 || hero.name === 'CARLON') ? 'carlon'
    : 'lindi';

  let heroImgObj = null;
  if (sprites.characters && sprites.characters[heroCharKey]) {
    const charSprites = sprites.characters[heroCharKey];
    heroImgObj = charSprites.cheer || charSprites.celebrate || charSprites.idle;
  }

  if (heroImgObj && heroImgObj.img) {
    const hH = 110;
    const hW = Math.round(hH * (heroImgObj.w / heroImgObj.h));
    ctx.drawImage(heroImgObj.img, V_WIDTH / 2 - hW / 2, boxY + 120, hW, hH);
  }

  // Punteggio finale in evidenza
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px Courier New';
  ctx.fillText(`EROE: ${hero.name}   |   PUNTEGGIO: ${score} PUNTI`, V_WIDTH / 2, boxY + 265);

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 18px Courier New';
  ctx.fillText('INSERISCI LE TUE 3 INIZIALI:', V_WIDTH / 2, boxY + 310);

  // 3 riquadri per le 3 lettere
  const slotW = 86;
  const slotH = 96;
  const slotGap = 24;
  const startSlotX = V_WIDTH / 2 - (3 * slotW + 2 * slotGap) / 2;
  const slotY = boxY + 335;

  const pulse = Math.abs(Math.sin(performance.now() * 0.008));

  for (let i = 0; i < 3; i++) {
    const sx = startSlotX + i * (slotW + slotGap);
    const isCur = (nameEntryIndex === i);

    ctx.fillStyle = isCur ? 'rgba(30, 58, 100, 0.95)' : 'rgba(15, 23, 42, 0.8)';
    ctx.fillRect(sx, slotY, slotW, slotH);

    ctx.lineWidth = isCur ? 4 : 2;
    ctx.strokeStyle = isCur ? '#ffd700' : '#475569';
    ctx.strokeRect(sx, slotY, slotW, slotH);

    // Lettera
    ctx.fillStyle = isCur ? '#ffd700' : '#ffffff';
    ctx.font = 'bold 56px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText(nameEntry[i], sx + slotW / 2, slotY + 70);

    // Frecce per lettera attiva
    if (isCur) {
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 24px Courier New';
      ctx.fillText('▲', sx + slotW / 2, slotY - 12 - pulse * 4);
      ctx.fillText('▼', sx + slotW / 2, slotY + slotH + 24 + pulse * 4);
    }
  }

  // Istruzioni comandi
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 14px Courier New';
  ctx.fillText('[▲ / ▼] Cambia Lettera   |   [◀ / ▶] Sposta Lettera   |   [INVIO / ⚽] Conferma', V_WIDTH / 2, boxY + 490);
  ctx.fillStyle = '#a855f7';
  ctx.fillText('Puoi anche digitare direttamente le lettere (A-Z) da tastiera!', V_WIDTH / 2, boxY + 520);

  ctx.restore();
}

function drawLeaderboard() {
  ctx.save();
  ctx.fillStyle = '#050714';
  ctx.fillRect(0, 0, V_WIDTH, V_HEIGHT);

  const boxW = 1040;
  const boxH = 630;
  const boxX = (V_WIDTH - boxW) / 2;
  const boxY = (V_HEIGHT - boxH) / 2;

  drawBox(boxX, boxY, boxW, boxH, 'rgba(12, 18, 36, 0.98)', '#a855f7');

  // Titolo oro & viola
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 30px Courier New';
  ctx.textAlign = 'center';
  ctx.fillText('🏆 ALBO D\'ORO & CLASSIFICA AC BRISSAGO 🏆', V_WIDTH / 2, boxY + 50);

  ctx.fillStyle = '#38bdf8';
  ctx.font = '16px Courier New';
  ctx.fillText('I MIGLIORI RECORD DI SEMPRE NELLA CONQUISTA DELLA QUARTA LEGA', V_WIDTH / 2, boxY + 80);

  // Tabella Header
  const rowStartX = boxX + 40;
  const tableW = boxW - 80;
  const headerY = boxY + 120;

  ctx.fillStyle = 'rgba(30, 41, 59, 0.9)';
  ctx.fillRect(rowStartX, headerY - 22, tableW, 30);
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 1;
  ctx.strokeRect(rowStartX, headerY - 22, tableW, 30);

  ctx.fillStyle = '#fde047';
  ctx.font = 'bold 14px Courier New';
  ctx.textAlign = 'left';
  ctx.fillText('POS', rowStartX + 15, headerY);
  ctx.fillText('NOME', rowStartX + 95, headerY);
  ctx.fillText('EROE', rowStartX + 200, headerY);
  ctx.fillText('LIV.', rowStartX + 420, headerY);
  ctx.fillText('DATA', rowStartX + 540, headerY);
  ctx.textAlign = 'right';
  ctx.fillText('PUNTEGGIO', rowStartX + tableW - 20, headerY);

  // Righe classifica (Top 10)
  const rowH = 40;
  const pulse = Math.abs(Math.sin(performance.now() * 0.008));

  highScores.slice(0, 10).forEach((entry, i) => {
    const ry = headerY + 20 + i * rowH;
    const isPlayer = (i === lastPlayerRank);

    // Sfondo riga
    if (isPlayer) {
      ctx.fillStyle = `rgba(34, 197, 94, ${0.20 + pulse * 0.15})`;
      ctx.fillRect(rowStartX, ry - 14, tableW, rowH - 4);
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#22c55e';
      ctx.strokeRect(rowStartX, ry - 14, tableW, rowH - 4);
    } else if (i % 2 === 0) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.fillRect(rowStartX, ry - 14, tableW, rowH - 4);
    }

    // Posizione & Medaglia
    let posStr = `${i + 1}°`;
    let posColor = '#94a3b8';
    if (i === 0) { posStr = '🥇 1°'; posColor = '#ffd700'; }
    else if (i === 1) { posStr = '🥈 2°'; posColor = '#e2e8f0'; }
    else if (i === 2) { posStr = '🥉 3°'; posColor = '#f59e0b'; }

    ctx.font = 'bold 16px Courier New';
    ctx.textAlign = 'left';
    ctx.fillStyle = posColor;
    ctx.fillText(posStr, rowStartX + 12, ry + 12);

    // Nome (3 lettere)
    ctx.fillStyle = isPlayer ? '#ffd700' : '#ffffff';
    ctx.font = 'bold 18px Courier New';
    ctx.fillText(entry.name, rowStartX + 100, ry + 12);

    // Eroe
    let heroColor = '#38bdf8';
    if (entry.hero === 'LINDI') heroColor = '#10b981';
    else if (entry.hero === 'CIUFFO') heroColor = '#22c55e';
    else if (entry.hero === 'LEON') heroColor = '#38bdf8';
    else if (entry.hero === 'JOAO') heroColor = '#f97316';
    else if (entry.hero === 'BARSALINI') heroColor = '#ef4444';
    else if (entry.hero === 'CARLON') heroColor = '#a855f7';
    else if (entry.hero === 'TAIRA') heroColor = '#f59e0b';
    else if (entry.hero === 'RENZO') heroColor = '#ef4444';

    ctx.fillStyle = heroColor;
    ctx.font = 'bold 15px Courier New';
    ctx.fillText(entry.hero, rowStartX + 200, ry + 12);

    // Livello
    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px Courier New';
    ctx.fillText(`LIV ${entry.level || 2}`, rowStartX + 420, ry + 12);

    // Data
    ctx.fillText(entry.date || '--/--', rowStartX + 540, ry + 12);

    // Punti
    ctx.textAlign = 'right';
    ctx.fillStyle = isPlayer ? '#ffd700' : '#fde047';
    ctx.font = 'bold 18px Courier New';
    ctx.fillText(`${entry.score.toLocaleString()} PTS`, rowStartX + tableW - 20, ry + 12);

    if (isPlayer) {
      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 12px Courier New';
      ctx.textAlign = 'left';
      ctx.fillText('★ TUO RECORD!', rowStartX + tableW + 8 - 190, ry + 12);
    }
  });

  // Footer istruzioni
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 17px Courier New';
  ctx.textAlign = 'center';
  ctx.fillText('[SPAZIO / INVIO / 👥 EROI / C / L] Torna alla Selezione Eroi', V_WIDTH / 2, boxY + boxH - 25);

  ctx.restore();
}
