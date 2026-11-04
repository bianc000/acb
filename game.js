// Donkey Brissago - WebApp Engine
// Realizzato per iPhone, Safari, Chrome e Desktop

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Risoluzione virtuale arcade
const V_WIDTH = 1280;
const V_HEIGHT = 720;

// STATI DI GIOCO
const STATE_SELECT = 0;
const STATE_BRIEFING = 1;
const STATE_PLAYING = 2;
const STATE_VICTORY = 3;
const STATE_GAMEOVER = 4;

let gameState = STATE_SELECT;
let selectedHeroIndex = 0; // 0 = Joao, 1 = Ciuffo, 2 = Leon
let score = 0;
let highScore = 7500;
let bonusTimer = 5000;
let bonusCountdown = 1.0;
let lives = 3;
let floatingTexts = [];

// WEB AUDIO SYNTH (Effetti sonori arcade vintage a costo zero)
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
// GENERAZIONE PROCEDURALE PIXEL ART (Identica alla versione C# / Desktop)
// -------------------------------------------------------------------------

function createPixelCanvas(w, h, drawFn) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const pctx = c.getContext('2d');
  drawFn(pctx);
  return c;
}

// Sprite di Joao (Capelli ricci neri, barbetta e baffetti, maglia rossa)
function createJoaoCanvas(isClimbing = false) {
  return createPixelCanvas(40, 40, (p) => {
    // Corpo
    p.fillStyle = '#15151e'; p.fillRect(11, 4, 18, 34); // contorno
    p.fillStyle = '#f0f0f5'; p.fillRect(12, 35, 6, 3); p.fillRect(22, 35, 6, 3); // scarpe
    p.fillStyle = '#19191e'; p.fillRect(13, 25, 14, 8); // pantaloncini
    p.fillStyle = '#d71e1e'; p.fillRect(12, 17, 16, 9); // maglia rossa

    if (!isClimbing) {
      p.fillStyle = '#d71e1e'; p.fillRect(9, 18, 3, 7); p.fillRect(28, 18, 3, 7);
      p.fillStyle = '#f5c39b'; p.fillRect(9, 25, 3, 3); p.fillRect(28, 25, 3, 3);
    } else {
      p.fillStyle = '#d71e1e'; p.fillRect(9, 14, 3, 6); p.fillRect(28, 14, 3, 6);
      p.fillStyle = '#f5c39b'; p.fillRect(9, 11, 3, 3); p.fillRect(28, 11, 3, 3);
    }

    // Viso
    p.fillStyle = '#f5c39b'; p.fillRect(14, 8, 12, 8);
    p.fillStyle = '#2d190f'; p.fillRect(16, 11, 1, 1); p.fillRect(23, 11, 1, 1); // occhi
    p.fillStyle = '#120f12'; p.fillRect(15, 9, 3, 1); p.fillRect(22, 9, 3, 1); // sopracciglia

    // Barba e Baffi dalla foto
    p.fillStyle = '#1e1614';
    p.fillRect(17, 13, 6, 1); // baffi
    p.fillRect(17, 15, 6, 2); // pizzetto
    p.fillRect(15, 14, 1, 1); p.fillRect(24, 14, 1, 1);

    // Riccioli neri dalla foto
    p.fillStyle = '#120f12';
    p.fillRect(13, 3, 14, 6);
    p.fillRect(12, 4, 1, 2); p.fillRect(27, 4, 1, 2);
    p.fillRect(15, 7, 1, 1); p.fillRect(18, 6, 1, 1); p.fillRect(21, 6, 1, 1); p.fillRect(24, 7, 1, 1);
  });
}

// Sprite di Ciuffo (Frangia/ciuffo sagomato, viso sbarazzino, maglia rossa)
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
    p.fillRect(15, 9, 4, 1); p.fillRect(21, 9, 4, 1); // sopracciglia decise
    p.fillRect(16, 11, 1, 1); p.fillRect(22, 11, 1, 1); // occhi
    p.fillStyle = '#c86e6e'; p.fillRect(19, 13, 2, 1); // bocca

    // Il Ciuffo pettinato sul davanti dalla foto
    p.fillStyle = '#231914';
    p.fillRect(13, 3, 14, 5);
    p.fillRect(14, 6, 12, 2);
  });
}

// Sprite di Leon (Capelli castani mossi, pizzetto, grinta da vittoria)
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
    p.fillStyle = '#500f0f'; p.fillRect(18, 12, 4, 2); // bocca aperta che grida
    p.fillStyle = '#371e14'; p.fillRect(18, 14, 4, 2); // pizzetto

    // Capelli castani mossi
    p.fillStyle = '#4b2819';
    p.fillRect(13, 3, 14, 6);
    p.fillRect(12, 4, 1, 2); p.fillRect(27, 4, 1, 2);
  });
}

// Sprite di Renzo Boss (Capelli bianchi, occhiali, maglia AC Brissago, orologio)
function createRenzoCanvas(isThrowing = false) {
  return createPixelCanvas(64, 64, (p) => {
    p.fillStyle = '#191414'; p.fillRect(18, 6, 28, 52); // sagoma
    p.fillStyle = '#1e2337'; p.fillRect(20, 48, 8, 10); p.fillRect(36, 48, 8, 10); // pantaloni
    p.fillStyle = '#28282d'; p.fillRect(18, 57, 10, 5); p.fillRect(36, 57, 10, 5); // scarpe

    // Maglia AC Brissago rossa con logo e scritta bianca
    p.fillStyle = '#dc1919'; p.fillRect(18, 26, 28, 23);
    p.fillStyle = '#ffffff';
    p.fillRect(22, 29, 3, 2); // logo
    p.fillRect(28, 33, 14, 2); p.fillRect(28, 36, 11, 2); // AC BRISSAGO

    // Braccia
    if (!isThrowing) {
      p.fillStyle = '#dc1919'; p.fillRect(11, 26, 7, 16); p.fillRect(46, 26, 7, 16);
      p.fillStyle = '#f5c3a0'; p.fillRect(11, 41, 7, 6); p.fillRect(46, 41, 7, 6);
      p.fillStyle = '#c8cdd7'; p.fillRect(46, 40, 7, 2); // OROLOGIO D'ARGENTO
    } else {
      p.fillStyle = '#dc1919'; p.fillRect(11, 26, 7, 16); p.fillRect(46, 16, 7, 14);
      p.fillStyle = '#f5c3a0'; p.fillRect(11, 41, 7, 6); p.fillRect(46, 10, 7, 7);
      p.fillStyle = '#c8cdd7'; p.fillRect(46, 17, 7, 2);
      p.fillStyle = '#1450be'; p.fillRect(44, 4, 12, 7); // Ciabatta impugnata
    }

    // Viso
    p.fillStyle = '#f5c3a0'; p.fillRect(22, 10, 20, 14);

    // OCCHIALI DA VISTA RETTANGOLARI
    p.fillStyle = '#6e737d';
    p.fillRect(24, 13, 6, 4); p.fillRect(34, 13, 6, 4); p.fillRect(30, 14, 4, 1);
    p.fillStyle = '#f0f5ff';
    p.fillRect(25, 14, 4, 2); p.fillRect(35, 14, 4, 2); // lenti
    p.fillStyle = '#281e19'; p.fillRect(26, 15, 1, 1); p.fillRect(36, 15, 1, 1); // occhi

    p.fillStyle = '#bebec3'; p.fillRect(24, 21, 16, 3); // barbetta bianca corta
    p.fillStyle = '#ebebf0'; p.fillRect(22, 6, 20, 5); // capelli bianchi corti
  });
}

// Sprite di Alex il Traditore (Alto, maglia azzurra AS Verzaschesi con chiocciola)
function createAlexCanvas() {
  return createPixelCanvas(42, 42, (p) => {
    p.fillStyle = '#141419'; p.fillRect(11, 3, 18, 37);
    p.fillStyle = '#28a5eb'; p.fillRect(12, 31, 6, 5); p.fillRect(22, 31, 6, 5); // calzettoni azzurri
    p.fillStyle = '#f5f5fa'; p.fillRect(12, 24, 16, 7); // pantaloncini bianchi
    p.fillStyle = '#28a5eb'; p.fillRect(12, 14, 16, 10); // maglia azzurra Verzaschesi

    // Stemma chiocciola
    p.fillStyle = '#d21e1e'; p.fillRect(22, 16, 4, 4);
    p.fillStyle = '#f0c81e'; p.fillRect(23, 17, 2, 2);

    // Viso sorridente e slanciato
    p.fillStyle = '#f5c39b'; p.fillRect(14, 7, 12, 8);
    p.fillStyle = '#000'; p.fillRect(16, 9, 1, 1); p.fillRect(22, 9, 1, 1);
    p.fillStyle = '#fff'; p.fillRect(17, 12, 6, 1); // denti

    // Capelli castani ondulati
    p.fillStyle = '#6e4123'; p.fillRect(13, 3, 14, 5);
  });
}

// Sprite Rivali
function createCodeborgoCanvas() {
  return createPixelCanvas(36, 36, (p) => {
    p.fillStyle = '#140f0a'; p.fillRect(10, 4, 16, 30);
    p.fillStyle = '#55321e'; p.fillRect(13, 7, 10, 7); // giocatore di colore
    p.fillStyle = '#fad71e'; p.fillRect(11, 14, 14, 9); // maglia giallonera
    p.fillStyle = '#19191e'; p.fillRect(14, 14, 3, 9); p.fillRect(20, 14, 3, 9);
    p.fillStyle = '#0f0f0f'; p.fillRect(12, 4, 12, 3); // capelli
  });
}

function createAramaiciCanvas() {
  return createPixelCanvas(36, 36, (p) => {
    p.fillStyle = '#141414'; p.fillRect(10, 4, 16, 30);
    p.fillStyle = '#f5c39b'; p.fillRect(13, 7, 10, 7);
    p.fillStyle = '#b41414'; p.fillRect(11, 14, 14, 9); // maglia rossa
    p.fillStyle = '#f0c81e'; // fascia oro
    for (let i = 0; i < 8; i++) p.fillRect(13 + i, 14 + i, 2, 1);
    p.fillStyle = '#1e140f'; p.fillRect(12, 4, 12, 3);
  });
}

function createPedemonte11Canvas() {
  return createPixelCanvas(40, 40, (p) => {
    p.fillStyle = '#1e0a0a'; p.fillRect(11, 4, 18, 34);
    p.fillStyle = '#ff8c82'; p.fillRect(14, 8, 12, 7); // faccia rossa furiosa!
    p.fillStyle = '#ff0000'; p.fillRect(23, 7, 2, 2); // vena
    p.fillStyle = '#1446b4'; p.fillRect(12, 15, 16, 10); // maglia blu
    p.fillStyle = '#ffffff';
    p.fillRect(15, 17, 3, 6); p.fillRect(21, 17, 3, 6); // NUMERO 11 GIGANTE
    p.fillStyle = '#640a0a'; p.fillRect(17, 13, 6, 2); // bocca che urla
    p.fillStyle = '#321e14'; p.fillRect(13, 4, 14, 4); // capelli
  });
}

function createTairaCanvas() {
  return createPixelCanvas(48, 48, (p) => {
    p.fillStyle = '#141414'; p.fillRect(13, 6, 22, 38);
    p.fillStyle = '#dc1919'; p.fillRect(15, 22, 18, 14); // maglia Brissago
    p.fillStyle = '#fad71e'; p.fillRect(11, 26, 4, 5); // FASCIA CAPITANO
    p.fillStyle = '#000000'; p.fillRect(12, 28, 2, 1);
    p.fillStyle = '#f5c39b'; p.fillRect(17, 12, 14, 8); // viso
    p.fillStyle = '#281e14'; p.fillRect(19, 18, 10, 2); // baffi
    p.fillStyle = '#2d4b2d'; p.fillRect(16, 5, 16, 6); // berretto militare
    p.fillStyle = '#141e14'; p.fillRect(14, 10, 20, 2); // visiera
    p.fillStyle = '#f5d228'; p.fillRect(23, 6, 3, 3); // fregio oro
  });
}

function createSlipperCanvas() {
  return createPixelCanvas(28, 28, (p) => {
    p.fillStyle = '#195ad2'; p.fillRect(7, 5, 14, 18);
    p.fillStyle = '#0a1e5a'; p.fillRect(9, 9, 10, 7); // fascia
    p.fillStyle = '#78b4ff'; p.fillRect(11, 11, 3, 2); // riflesso
  });
}

function createGirderCanvas() {
  return createPixelCanvas(32, 16, (p) => {
    p.fillStyle = '#dc2828'; p.fillRect(0, 0, 32, 16);
    p.fillStyle = '#ff5a5a'; p.fillRect(0, 0, 32, 2);
    p.fillStyle = '#500a0a'; p.fillRect(0, 14, 32, 2);
    p.fillStyle = '#ffe6c8'; p.fillRect(4, 1, 2, 2); p.fillRect(20, 1, 2, 2); // rivetti
  });
}

function createLadderCanvas() {
  return createPixelCanvas(24, 16, (p) => {
    p.fillStyle = '#00d2ff';
    p.fillRect(2, 0, 3, 16); p.fillRect(19, 0, 3, 16); // montanti
    p.fillRect(5, 7, 14, 2); // piolo
  });
}

// Inizializza texture
const sprites = {
  joao: createJoaoCanvas(false),
  joaoClimb: createJoaoCanvas(true),
  ciuffo: createCiuffoCanvas(false),
  ciuffoClimb: createCiuffoCanvas(true),
  leon: createLeonCanvas(false),
  leonClimb: createLeonCanvas(true),
  renzoNormal: createRenzoCanvas(false),
  renzoThrow: createRenzoCanvas(true),
  alex: createAlexCanvas(),
  codeborgo: createCodeborgoCanvas(),
  aramaici: createAramaiciCanvas(),
  pedemonte11: createPedemonte11Canvas(),
  taira: createTairaCanvas(),
  slipper: createSlipperCanvas(),
  girder: createGirderCanvas(),
  ladder: createLadderCanvas()
};

// -------------------------------------------------------------------------
// GEOMETRIA LIVELLO DONKEY BRISSAGO
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

// Costruzione piattaforme e scale
const platforms = [
  new Platform(80, 130, 480, 130),     // Cima Renzo
  new Platform(380, 190, 1140, 230),   // Tier 4 (Alex Verzaschesi)
  new Platform(140, 370, 1140, 330),   // Tier 3 (Pedemonte 11)
  new Platform(140, 470, 1140, 510),   // Tier 2 (Aramaici)
  new Platform(140, 630, 1140, 590),   // Tier 1 (Codeborgo)
  new Platform(60, 695, 1220, 695)     // Terra
];

const ladders = [
  new Ladder(1050, 595, 695), new Ladder(420, 620, 695),
  new Ladder(240, 475, 625), new Ladder(800, 495, 605),
  new Ladder(1050, 335, 505), new Ladder(520, 355, 485),
  new Ladder(240, 200, 365), new Ladder(860, 220, 340),
  new Ladder(440, 130, 195)
];

// -------------------------------------------------------------------------
// ENTITA: EROE, RENZO, CIABATTE E RIVALI
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
  scale: 1.3
};

let renzo = {
  x: 140,
  y: 44,
  isThrowing: false,
  throwTimer: 2.5,
  animTimer: 0
};

let slippers = [];
let rivals = [];

function setupRivals() {
  rivals = [
    { name: 'Codeborgo', sprite: sprites.codeborgo, plat: platforms[4], x: 600, speed: 95, dir: 1, pts: 200, tagCol: '#f0c81e', jumped: false },
    { name: 'Aramaici', sprite: sprites.aramaici, plat: platforms[3], x: 450, speed: 150, dir: 1, pts: 300, tagCol: '#f0c81e', jumped: false },
    { name: 'Pedemonte #11', sprite: sprites.pedemonte11, plat: platforms[2], x: 700, speed: 230, dir: 1, pts: 500, tagCol: '#ff4444', isPedemonte: true, jumped: false },
    { name: 'Alex (Verzaschesi)', sprite: sprites.alex, plat: platforms[1], x: 800, speed: 175, dir: 1, pts: 800, tagCol: '#28c8ff', isAlex: true, jumped: false }
  ];
}

// -------------------------------------------------------------------------
// INPUT MANAGEMENT (Tastiera + Touch Screen per iPhone)
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

// Tap su canvas per avanzare schermate
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
    if (code === 'Space' || code === 'Enter') {
      applyHeroSelection();
      gameState = STATE_BRIEFING;
      playSound('jump');
    }
  } else if (gameState === STATE_BRIEFING) {
    if (code === 'Space' || code === 'Enter') {
      startGame();
      playSound('jump');
    }
  } else if (gameState === STATE_VICTORY || gameState === STATE_GAMEOVER) {
    if (code === 'Space' || code === 'Enter') {
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

function startGame() {
  gameState = STATE_PLAYING;
  score = 0;
  bonusTimer = 5000;
  lives = 3;
  slippers = [];
  floatingTexts = [];
  hero.x = 160;
  hero.y = 695 - 52;
  hero.vx = 0;
  hero.vy = 0;
  hero.isGrounded = true;
  hero.isClimbing = false;
  hero.invulnTimer = 0;
  setupRivals();
}

// -------------------------------------------------------------------------
// GAME LOOP (Update & Render)
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

  // Countdown punteggio bonus
  bonusCountdown -= dt;
  if (bonusCountdown <= 0) {
    bonusCountdown = 1.0;
    bonusTimer = Math.max(0, bonusTimer - 100);
  }

  // Renzo lancia ciabatte
  renzo.throwTimer -= dt;
  if (renzo.throwTimer <= 0.6 && !renzo.isThrowing) {
    renzo.isThrowing = true;
    renzo.animTimer = 0.7;
  }
  if (renzo.isThrowing) {
    renzo.animTimer -= dt;
    if (renzo.animTimer <= 0) {
      renzo.isThrowing = false;
      renzo.throwTimer = 2.6;
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

    // Collisione con eroe
    if (s.active && hero.invulnTimer <= 0) {
      if (Math.hypot((hero.x + 20) - s.x, (hero.y + 25) - s.y) < 24) {
        hitHero('CIABATTATO DA RENZO!');
      }
    }

    if (s.y > V_HEIGHT + 30 || s.x < -40 || s.x > V_WIDTH + 40) {
      slippers.splice(i, 1);
    }
  }

  // Aggiorna rivali
  for (let r of rivals) {
    let speed = r.speed;
    if (r.isPedemonte && Math.hypot(hero.x - r.x, hero.y - r.y) < 250) {
      speed *= 1.4;
      r.dir = (hero.x > r.x) ? 1 : -1;
    }

    r.x += r.dir * speed * dt;
    if (r.x < r.plat.x1 + 10) { r.x = r.plat.x1 + 10; r.dir = 1; }
    if (r.x > r.plat.x2 - 50) { r.x = r.plat.x2 - 50; r.dir = -1; }
    r.y = r.plat.getSurfaceY(r.x + 20) - 45;

    // Collisione corpo a corpo
    if (hero.invulnTimer <= 0) {
      if (Math.hypot((hero.x + 20) - (r.x + 20), (hero.y + 25) - (r.y + 25)) < 28) {
        const msg = r.isAlex ? 'FALCIATO DA ALEX IL TRADITORE!' : (r.isPedemonte ? 'TRAVOLTO DAL N.11 DEL PEDEMONTE!' : `COLPITO DAL ${r.name.toUpperCase()}!`);
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

  // Salto sopra ciabatte (+100) e rivali (+200 / 300 / 500 / 800)
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
      if (!r.jumped && Math.abs(footX - (r.x + 20)) < 36 && (footY - r.y) >= -75 && (footY - r.y) <= -5) {
        r.jumped = true;
        score += r.pts;
        playSound('score');
        floatingTexts.push({ text: `+${r.pts}`, x: r.x + 10, y: r.y - 20, timer: 0.9, color: '#00ffcc' });
      }
    });
  }

  hero.x = Math.max(40, Math.min(V_WIDTH - 80, hero.x));

  // Vittoria
  if (hero.y <= 140 && hero.x <= 420) {
    gameState = STATE_VICTORY;
    score += bonusTimer;
    if (score > highScore) highScore = score;
    playSound('victory');
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
    hero.y = 695 - 52;
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

  // Rivali
  rivals.forEach(r => {
    ctx.save();
    if (r.dir < 0) {
      ctx.translate(r.x + 45, r.y);
      ctx.scale(-1, 1);
      ctx.drawImage(r.sprite, 0, 0, 45, 45);
    } else {
      ctx.drawImage(r.sprite, r.x, r.y, 45, 45);
    }
    ctx.restore();

    ctx.fillStyle = r.tagCol;
    ctx.font = 'bold 13px Courier New';
    ctx.fillText(r.name, r.x - 5, r.y - 8);
  });

  // Ciabatte
  slippers.forEach(s => {
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.rot);
    ctx.drawImage(sprites.slipper, -16, -16, 32, 32);
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
  }

  // Testi fluttuanti (+100, ecc.)
  floatingTexts.forEach(ft => {
    ctx.fillStyle = ft.color;
    ctx.font = 'bold 20px Courier New';
    ctx.fillText(ft.text, ft.x, ft.y);
  });

  drawHUD();

  if (gameState === STATE_BRIEFING) drawBriefing();
  if (gameState === STATE_VICTORY) drawVictory();
  if (gameState === STATE_GAMEOVER) drawGameOver();
}

function drawHUD() {
  ctx.fillStyle = '#ff2222'; ctx.font = 'bold 24px Courier New'; ctx.fillText('1UP', 100, 30);
  ctx.fillStyle = '#ffffff'; ctx.fillText(String(score).padStart(6, '0'), 100, 56);

  ctx.fillStyle = '#ff2222'; ctx.fillText('HIGH SCORE', 520, 30);
  ctx.fillStyle = '#ffffff'; ctx.fillText(String(highScore).padStart(6, '0'), 550, 56);

  ctx.fillStyle = '#00d2ff'; ctx.fillText('BONUS', 980, 30);
  ctx.fillStyle = '#ffe600'; ctx.fillText(String(bonusTimer).padStart(4, '0'), 980, 56);

  // Vite
  ctx.fillStyle = '#ffffff'; ctx.font = '18px Courier New';
  ctx.fillText(`EROE: ${hero.name} | VITE: `, 50, V_HEIGHT - 20);
  for (let i = 0; i < lives; i++) {
    ctx.fillStyle = '#ff2222';
    ctx.fillRect(260 + i * 24, V_HEIGHT - 32, 18, 16);
  }
}

function drawCharacterSelect() {
  ctx.fillStyle = '#ffd700'; ctx.font = 'bold 32px Courier New';
  ctx.fillText('SCEGLI IL TUO EROE DELL\'AC BRISSAGO', 290, 60);
  ctx.fillStyle = '#a0a5b4'; ctx.font = '20px Courier New';
  ctx.fillText('IL COMANDANTE TAIRA ASSEGNERA LA MISSIONE A LUI!', 340, 100);

  const heroes = [
    { name: 'JOAO', sub: 'L\'Eroe dai Ricci', img: sprites.joao, desc: 'EQUILIBRATO\n\n- Velocita: Buona\n- Salto: Calibrato\n- Fede nel Brissago' },
    { name: 'CIUFFO', sub: 'Il Re del Gel', img: sprites.ciuffo, desc: 'SCATTANTE\n\n- Velocita: +15%\n- Salto: Rapido\n- Ciuffo perfetto' },
    { name: 'LEON', sub: 'Guerriero Bandiera', img: sprites.leon, desc: 'GRINTA PURA\n\n- Super Salto: +25%\n- Passione Estrema\n- Bandiera del 1967' }
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

    // Box ritratto
    ctx.fillStyle = '#0a0f19'; ctx.fillRect(cx + 105, 235, 110, 110);
    ctx.drawImage(h.img, cx + 115, 245, 90, 90);

    // Testo
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
  ctx.fillText('[◀ / ▶] Cambia Eroe  |  [TOCCA SALTO o SPAZIO] Conferma e Ricevi Ordine', 220, V_HEIGHT - 35);
}

function drawBriefing() {
  drawBox(120, 180, 1040, 360, 'rgba(15, 20, 35, 0.96)', '#f5c828');
  ctx.drawImage(sprites.taira, 150, 220, 100, 100);

  ctx.fillStyle = '#ffd700'; ctx.font = 'bold 26px Courier New';
  ctx.fillText(`ORDINE DEL COMANDANTE TAIRA A SOLDATO ${hero.name}!`, 280, 230);

  ctx.fillStyle = '#ffffff'; ctx.font = '19px Courier New';
  ctx.fillText(`'${hero.name}! LA MISSIONE E VINCERE LA QUINTA LEGA E RICONQUISTARE LA QUARTA!`, 280, 275);
  ctx.fillText('PER RIUSCIRCI, DEVI SCALARE LE TRAVI E VINCERE LA FIDUCIA DI MISTER RENZO!', 280, 310);
  ctx.fillText('ATTENTO AL CODEBORGO, AGLI ARAMAICI E AL NUMERO 11 DEL PEDEMONTE (ARRABBIATO!).', 280, 345);

  ctx.fillStyle = '#50c8ff';
  ctx.fillText('E SULLA TRAVE PIU ALTA C\'E ALEX! CI HA TRADITI PER I VERZASCHESI!', 280, 385);
  ctx.fillText('SCHIVA LE CIABATTE DI RENZO, SALTA I RIVALI E CONQUISTA LA FIDUCIA DEL MISTER!\'', 280, 420);

  ctx.fillStyle = '#22c55e'; ctx.font = 'bold 22px Courier New';
  ctx.fillText('TOCCA IL PULSANTE ROSSO O PREMI [SPAZIO] PER SALIRE SULLE TRAVI', 240, 500);
}

function drawVictory() {
  drawBox(160, 220, 960, 270, 'rgba(10, 40, 20, 0.96)', '#ffd700');
  ctx.fillStyle = '#ffd700'; ctx.font = 'bold 30px Courier New';
  ctx.fillText(`VITTORIA! ${hero.name} HA CONQUISTATO RENZO!`, 240, 270);

  ctx.fillStyle = '#ff6464'; ctx.font = 'bold 22px Courier New';
  ctx.fillText('MISTER RENZO (AC BRISSAGO):', 200, 320);

  ctx.fillStyle = '#ffffff'; ctx.font = '19px Courier New';
  ctx.fillText(`'CHE RIFLESSI ${hero.name}! HAI BATTUTO CODEBORGO, ARAMAICI, PEDEMONTE`, 200, 355);
  ctx.fillText('E PERSINO QUEL TRADITORE DI ALEX DEI VERZASCHESI!', 200, 385);

  ctx.fillStyle = '#ffd700';
  ctx.fillText('CON TE E IL CAPITANO TAIRA LA QUARTA LEGA SARA NOSTRA!\'', 200, 420);

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
  ctx.fillText(`'${hero.name}! NON POSSIAMO FARCI DERIDERE DAI VERZASCHESI E DA ALEX!`, 240, 375);
  ctx.fillText('RIALZATI, SCHIVA QUELLE CIABATTE E RIPROVA PER L\'AC BRISSAGO!\'', 240, 405);

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
