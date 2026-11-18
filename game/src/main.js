// LOMPAT NERAKA — mesin game.
// Platformer 2D side-scrolling orisinal: Bimo si Bocah Api melintasi Pulau Duri.
// Fisika langkah-tetap 1/60 detik, lompat variabel + coyote time + jump buffer,
// duri, platform bergerak / hilang-muncul, musuh berpola, blok tersembunyi,
// pos pemeriksaan, bendera tujuan. Semua teks berbahasa Indonesia.
import { LEVELS, TILE, buildLevel } from './levels.js';
import { Sfx } from './audio.js';

const VIEW_W = 960;
const VIEW_H = 540;
const STEP = 1 / 60;
const GRAVITY = 2200;
const MOVE_SPEED = 270;
const JUMP_VEL = 790;
const MAX_FALL = 920;
const COYOTE = 0.09;
const BUFFER = 0.12;

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const sfx = new Sfx();

const params = new URLSearchParams(location.search);
const SHOT = params.get('shot'); // start | play | spike | clear | win
const AUTO = params.get('auto') === '1';

const input = { left: false, right: false, jump: false, jumpPressed: false };
let jumpBufferT = 0;

function bindKey(code, prop) {
  addEventListener('keydown', (e) => {
    if (e.code === code) {
      if (!input[prop]) input.jumpPressed = input.jumpPressed || prop === 'jump';
      input[prop] = true;
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'Space'].includes(e.code)) e.preventDefault();
    }
  });
  addEventListener('keyup', (e) => { if (e.code === code) input[prop] = false; });
}
bindKey('ArrowLeft', 'left'); bindKey('KeyA', 'left');
bindKey('ArrowRight', 'right'); bindKey('KeyD', 'right');
bindKey('Space', 'jump'); bindKey('ArrowUp', 'jump'); bindKey('KeyW', 'jump');

addEventListener('keydown', (e) => {
  if (e.code === 'Enter') advance();
  if (e.code === 'KeyP' || e.code === 'Escape') togglePause();
  if (e.code === 'KeyR' && (state === 'dead' || state === 'win' || state === 'clear')) restartAll();
  if (e.code === 'KeyM') { sfx.enabled = !sfx.enabled; }
});

// Tombol sentuh (juga bisa diklik mouse).
function bindTouch(id, prop) {
  const el = document.getElementById(id);
  if (!el) return;
  const on = (e) => { e.preventDefault(); if (prop === 'jump' && !input.jump) input.jumpPressed = true; input[prop] = true; sfx.ensure(); };
  const off = (e) => { e.preventDefault(); input[prop] = false; };
  el.addEventListener('pointerdown', on);
  el.addEventListener('pointerup', off);
  el.addEventListener('pointerleave', off);
  el.addEventListener('pointercancel', off);
}
bindTouch('btn-left', 'left');
bindTouch('btn-right', 'right');
bindTouch('btn-jump', 'jump');

const SKIES = [
  ['#7ec8f7', '#dff3ff'], ['#f7b267', '#ffe8c2'], ['#8e7cc3', '#e8ddff'],
  ['#5b8c5a', '#cfe8c9'], ['#e2725b', '#ffd9c2'], ['#3d2c4d', '#8e6fb8'],
];

const game = {
  levelIndex: 0, level: null, state: 'title',
  deaths: 0, coins: 0, time: 0, levelTime: 0,
  camX: 0, camY: 0, t: 0, introT: 0, deadT: 0, deadCause: '',
  paused: false, respawn: null, checkpointIdx: -1,
  player: null, enemies: [], movers: [], blinkers: [],
  totalCoins: 0,
};
let state = 'title';

function tileAt(tx, ty) {
  const g = game.level.grid;
  // Di bawah peta (ty >= h) TIDAK padat: pemain jatuh dan mati.
  // Samping & atas peta padat (dinding), supaya pemain tak keluar arena.
  if (tx < 0 || tx >= game.level.def.w || ty < 0) return 1;
  if (ty >= game.level.def.h) return 0;
  return g[ty][tx];
}
function solidAt(tx, ty) { const v = tileAt(tx, ty); return v === 1; }

function loadLevel(idx, keepTotals) {
  const def = LEVELS[idx];
  const built = buildLevel(def);
  game.levelIndex = idx;
  game.level = built;
  game.totalCoins = def.coins.length;
  game.movers = def.movers.map((m) => ({
    bx: m.x * TILE, by: m.y * TILE, w: m.w * TILE, h: 14,
    axis: m.axis, range: m.range * TILE, speed: m.speed, phase: 0,
    x: m.x * TILE, y: m.y * TILE, dx: 0, dy: 0,
  }));
  game.blinkers = def.blinkers.map((b) => ({
    x: b.x * TILE, y: b.y * TILE, w: b.w * TILE, h: 14,
    period: b.period, offset: b.offset,
  }));
  game.enemies = [];
  for (const e of built.walkers) game.enemies.push({ kind: 'walker', x: e.x * TILE + 4, y: e.y * TILE + 2, w: 26, h: 28, vx: -55, alive: true, baseY: e.y * TILE });
  for (const e of built.rollers) game.enemies.push({ kind: 'roller', x: e.x * TILE + 2, y: e.y * TILE + 2, w: 28, h: 28, vx: -150, alive: true, baseY: e.y * TILE });
  for (const e of built.flyers) game.enemies.push({ kind: 'flyer', x: e.x * TILE, y: e.y * TILE, w: 28, h: 22, vx: -40, alive: true, baseX: e.x * TILE, baseY: e.y * TILE, ph: Math.random() * 6 });
  game.checkpointIdx = -1;
  game.respawn = { x: def.start[0] * TILE + 5, y: def.start[1] * TILE + 2 };
  spawnPlayer(game.respawn.x, game.respawn.y);
  game.levelTime = 0;
  game.introT = 3.2;
  state = 'play';
  updateStatus();
}

function spawnPlayer(x, y) {
  game.player = {
    x, y, w: 22, h: 28, vx: 0, vy: 0,
    grounded: false, coyote: 0, face: 1, onMover: null,
    dead: false, squash: 0,
  };
}

function resetLevel() { loadLevel(game.levelIndex, true); }

function restartAll() {
  game.deaths = 0; game.coins = 0; game.time = 0;
  loadLevel(0, true);
}

function advance() {
  sfx.ensure(); sfx.click();
  if (state === 'title') { game.deaths = 0; game.coins = 0; game.time = 0; loadLevel(0, true); }
  else if (state === 'clear') {
    if (game.levelIndex + 1 >= LEVELS.length) { state = 'win'; updateStatus(); }
    else loadLevel(game.levelIndex + 1, true);
  } else if (state === 'win') { restartAll(); }
}
function togglePause() {
  if (state !== 'play') return;
  game.paused = !game.paused;
  updateStatus();
}

function die(cause) {
  if (state !== 'play' || game.player.dead) return;
  game.player.dead = true;
  game.deaths++;
  game.deadCause = cause;
  game.lastDeath = { cause, x: Math.round(game.player.x), y: Math.round(game.player.y), level: game.levelIndex + 1 };
  game.deadT = 1.0;
  state = 'dead';
  sfx.death();
  updateStatus();
}

function respawn() {
  spawnPlayer(game.respawn.x, game.respawn.y);
  // Musuh kembali ke posisi awal; koin yang sudah diambil tetap diambil.
  const def = game.level.def;
  game.enemies = [];
  for (const e of def.walkers) game.enemies.push({ kind: 'walker', x: e.x * TILE + 4, y: e.y * TILE + 2, w: 26, h: 28, vx: -55, alive: true, baseY: e.y * TILE });
  for (const e of def.rollers) game.enemies.push({ kind: 'roller', x: e.x * TILE + 2, y: e.y * TILE + 2, w: 28, h: 28, vx: -150, alive: true, baseY: e.y * TILE });
  for (const e of def.flyers) game.enemies.push({ kind: 'flyer', x: e.x * TILE, y: e.y * TILE, w: 28, h: 22, vx: -40, alive: true, baseX: e.x * TILE, baseY: e.y * TILE, ph: 0 });
  state = 'play';
  updateStatus();
}

function updateStatus() {
  const names = { title: 'Layar judul', play: 'Bermain', dead: 'Mati', clear: 'Level selesai', win: 'Tamat' };
  statusEl.textContent = `Lompat Neraka — ${names[state] || state}. Level ${game.levelIndex + 1} dari ${LEVELS.length}. Kematian ${game.deaths}. Koin ${game.coins}.`;
}

// ---------- fisika ----------
function overlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function moveAndCollide(p, dt) {
  // Sumbu X
  p.x += p.vx * dt;
  let tx0 = Math.floor(p.x / TILE), tx1 = Math.floor((p.x + p.w - 0.01) / TILE);
  let ty0 = Math.floor(p.y / TILE), ty1 = Math.floor((p.y + p.h - 0.01) / TILE);
  for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
    if (!solidAt(tx, ty)) continue;
    if (p.vx > 0) p.x = tx * TILE - p.w - 0.01;
    else if (p.vx < 0) p.x = (tx + 1) * TILE + 0.01;
    p.vx = 0;
  }
  // Sumbu Y
  const prevBottom = p.y + p.h;
  p.y += p.vy * dt;
  p.grounded = false;
  p.onMover = null;
  tx0 = Math.floor(p.x / TILE); tx1 = Math.floor((p.x + p.w - 0.01) / TILE);
  ty0 = Math.floor(p.y / TILE); ty1 = Math.floor((p.y + p.h - 0.01) / TILE);
  for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
    const v = tileAt(tx, ty);
    if (v === 1) {
      if (p.vy > 0) { p.y = ty * TILE - p.h - 0.01; p.vy = 0; p.grounded = true; }
      else if (p.vy < 0) { p.y = (ty + 1) * TILE + 0.01; p.vy = 0; checkHiddenBump(tx, ty); }
    } else if (v === 2 && p.vy >= 0 && prevBottom <= ty * TILE + 16) {
      p.y = ty * TILE - p.h - 0.01; p.vy = 0; p.grounded = true;
    }
  }
  // Platform bergerak & berkedip (hanya dipijak dari atas saat jatuh)
  const plats = [...game.movers, ...game.blinkers.filter((b) => blinkerVisible(b))];
  for (const m of plats) {
    if (p.vy >= 0 && prevBottom <= m.y + 16 && p.x + p.w > m.x + 2 && p.x < m.x + m.w - 2 &&
        p.y + p.h >= m.y && p.y + p.h <= m.y + m.h + 14) {
      p.y = m.y - p.h - 0.01; p.vy = 0; p.grounded = true; p.onMover = m;
    }
  }
}

function blinkerVisible(b) {
  const ph = (game.t + b.offset) % b.period;
  return ph < b.period * 0.62;
}

function checkHiddenBump(tx, ty) {
  // Kepala menyundul petak di atas: kalau ada blok tersembunyi di sana, munculkan.
  const above = ty; // tile yang disundul adalah tile padat hasil tabrakan; blok tersembunyi ada di grid? tidak — cek daftar
  for (const h of game.level.hidden) {
    if (!h.revealed && h.x === tx && h.y === above) {
      h.revealed = true;
      game.level.grid[h.y][h.x] = 1;
      game.coins++;
      sfx.reveal(); sfx.coin();
    }
  }
}

function checkHeadBumpHidden(p) {
  // Saat melompat, kepala menyentuh sel di atasnya: periksa blok tersembunyi.
  const headY = Math.floor((p.y - 1) / TILE);
  const cx0 = Math.floor((p.x + 2) / TILE), cx1 = Math.floor((p.x + p.w - 2) / TILE);
  for (let cx = cx0; cx <= cx1; cx++) {
    for (const h of game.level.hidden) {
      if (!h.revealed && h.x === cx && h.y === headY) {
        h.revealed = true;
        game.level.grid[h.y][h.x] = 1;
        game.coins++;
        p.vy = 0; p.y = (h.y + 1) * TILE + 0.01;
        sfx.reveal(); sfx.coin();
      }
    }
  }
}

function step(dt) {
  game.t += dt;
  if (state === 'play' && !game.paused) {
    game.time += dt;
    game.levelTime += dt;
    if (game.introT > 0) game.introT -= dt;
  }
  if (state !== 'play' || game.paused) return;
  const p = game.player;
  if (p.dead) return;

  // Platform bergerak
  for (const m of game.movers) {
    const s = Math.sin(game.t * m.speed);
    const nx = m.axis === 'x' ? m.bx + s * m.range : m.bx;
    const ny = m.axis === 'y' ? m.by + s * m.range : m.by;
    m.dx = nx - m.x; m.dy = ny - m.y;
    m.x = nx; m.y = ny;
  }

  if (AUTO) autopilot();

  // Input horizontal
  const accel = p.grounded ? 2600 : 1800;
  if (input.left) { p.vx = Math.max(p.vx - accel * dt, -MOVE_SPEED); p.face = -1; }
  else if (input.right) { p.vx = Math.min(p.vx + accel * dt, MOVE_SPEED); p.face = 1; }
  else {
    const f = p.grounded ? 2200 : 300;
    if (p.vx > 0) p.vx = Math.max(0, p.vx - f * dt);
    else if (p.vx < 0) p.vx = Math.min(0, p.vx + f * dt);
  }

  // Lompat: buffer + coyote + potong lompat saat tombol dilepas
  if (input.jumpPressed) { jumpBufferT = BUFFER; input.jumpPressed = false; }
  else if (jumpBufferT > 0) jumpBufferT -= dt;
  if (p.grounded) p.coyote = COYOTE; else if (p.coyote > 0) p.coyote -= dt;
  if (jumpBufferT > 0 && p.coyote > 0) {
    p.vy = -JUMP_VEL;
    p.coyote = 0; jumpBufferT = 0;
    sfx.jump();
  }
  if (!input.jump && p.vy < 0) p.vy += GRAVITY * dt * 1.6; // lepas tombol = lompat pendek
  p.vy = Math.min(p.vy + GRAVITY * dt, MAX_FALL);
  if (!input.jump && p.vy < -200) p.vy *= (1 - 2.2 * dt); // potong halus

  const wasGrounded = p.grounded;
  moveAndCollide(p, dt);
  checkHeadBumpHidden(p);
  if (p.onMover) { p.x += p.onMover.dx || 0; p.y += p.onMover.dy || 0; }
  if (p.grounded && !wasGrounded) p.squash = 0.12;
  if (p.squash > 0) p.squash -= dt;

  // Jatuh ke jurang
  if (p.y > game.level.def.h * TILE + 40) { die('Jatuh ke jurang!'); return; }

  // Duri & lava (hitbox agak pemaaf: dipersempit)
  const hb = { x: p.x + 4, y: p.y + 6, w: p.w - 8, h: p.h - 6 };
  const tx0 = Math.floor(hb.x / TILE), tx1 = Math.floor((hb.x + hb.w) / TILE);
  const ty0 = Math.floor(hb.y / TILE), ty1 = Math.floor((hb.y + hb.h) / TILE);
  for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
    const v = tileAt(tx, ty);
    if (v === 3) {
      // Duri hanya mematikan bila kaki benar-benar menyentuh ujungnya
      const spikeTop = ty * TILE + 12;
      if (hb.y + hb.h > spikeTop) { die('Kena duri!'); return; }
    }
    if (v === 4) { die('Kena lava!'); return; }
  }

  // Koin
  for (const c of game.level.coins) {
    if (!c.taken && overlap(p, { x: c.x * TILE + 6, y: c.y * TILE + 6, w: 20, h: 20 })) {
      c.taken = true; game.coins++; sfx.coin();
    }
  }

  // Pos pemeriksaan
  game.level.def.checkpoints.forEach(([cx, cy], i) => {
    if (i !== game.checkpointIdx && overlap(p, { x: cx * TILE - 8, y: cy * TILE - 96, w: 48, h: 128 })) {
      game.checkpointIdx = i;
      game.respawn = { x: cx * TILE + 5, y: cy * TILE + 2 };
      sfx.checkpoint();
    }
  });

  // Bendera tujuan — zona sentuh setinggi penuh, supaya tidak bisa
  // "terlompat" dan pemain terjebak di ujung peta.
  const [fx, fy] = game.level.def.flag;
  if (overlap(p, { x: fx * TILE - 16, y: 0, w: 64, h: (fy + 1) * TILE })) {
    state = 'clear';
    sfx.win();
    updateStatus();
    return;
  }

  // Musuh
  for (const e of game.enemies) {
    if (!e.alive) continue;
    if (e.kind === 'walker' || e.kind === 'roller') {
      e.x += e.vx * dt;
      const dir = e.vx > 0 ? 1 : -1;
      const aheadX = Math.floor((e.x + (dir > 0 ? e.w + 2 : -2)) / TILE);
      const feetY = Math.floor((e.y + e.h + 2) / TILE);
      const midY = Math.floor((e.y + e.h / 2) / TILE);
      const wall = solidAt(aheadX, midY);
      const groundAhead = solidAt(aheadX, feetY) || tileAt(aheadX, feetY) === 2;
      if (wall || !groundAhead) e.vx = -e.vx;
    } else if (e.kind === 'flyer') {
      // Kelelawar berpatroli di sekitar titik munculnya (±3 tile) — polanya
      // bisa dipelajari, bukan berkeliaran semaunya ke seluruh level.
      e.x += e.vx * dt;
      e.y = e.baseY + Math.sin(game.t * 2 + e.ph) * 40;
      if (e.x < e.baseX - 96 || e.x > e.baseX + 96) e.vx = -e.vx;
      const midY = Math.floor((e.y + e.h / 2) / TILE);
      if (solidAt(Math.floor((e.x + (e.vx > 0 ? e.w + 2 : -2)) / TILE), midY)) e.vx = -e.vx;
    }
    if (overlap(p, e)) {
      const stomping = p.vy > 60 && (p.y + p.h) - e.y < 16;
      if (stomping) {
        e.alive = false;
        p.vy = -520;
        game.coins++;
        sfx.stomp();
      } else {
        die(e.kind === 'roller' ? 'Ditabrak bola berduri!' : e.kind === 'flyer' ? 'Disambar kelelawar!' : 'Ditabrak penjaga duri!');
        return;
      }
    }
  }

  // Kamera
  const maxCamX = Math.max(0, game.level.def.w * TILE - VIEW_W);
  const maxCamY = Math.max(0, game.level.def.h * TILE - VIEW_H);
  game.camX += ((Math.min(Math.max(p.x + p.w / 2 - VIEW_W * 0.42, 0), maxCamX)) - game.camX) * 0.12;
  game.camY += ((Math.min(Math.max(p.y + p.h / 2 - VIEW_H * 0.55, 0), maxCamY)) - game.camY) * 0.12;
}

// Autopilot sederhana — hanya untuk playtest otomatis (?auto=1):
// lari ke kanan, lompat bila ada dinding/duri/jurang/musuh di depan.
function autopilot() {
  const p = game.player;
  input.right = true; input.left = false;
  if (!p.grounded) return;
  const dir = 1;
  // Baris tempat kaki berpijak (bukan baris tanah di bawah kaki).
  const feetRow = Math.floor((p.y + p.h - 4) / TILE);
  const supportRow = feetRow + 1;
  const aheadTX = Math.floor((p.x + p.w + 40) / TILE);
  // Dinding: petak padat setinggi badan di depan (baris kaki), bukan tanah di bawah.
  const wall = solidAt(aheadTX, feetRow);
  const spike = tileAt(aheadTX, feetRow) === 3 || tileAt(Math.floor((p.x + p.w + 10) / TILE), feetRow) === 3;
  // Jurang: tanah di depan 1-2 petak sudah habis -> lompat sekarang.
  // (Dulu: butuh 3 petak kosong sekaligus — jurang 2 petak tak pernah terdeteksi.)
  let gap = false;
  for (let d = 0; d < 2; d++) {
    const gx = Math.floor((p.x + p.w + 6 + d * TILE) / TILE);
    let supported = solidAt(gx, supportRow) || tileAt(gx, supportRow) === 2;
    if (!supported) {
      for (const m of game.movers) {
        if (p.x + p.w + 6 + d * TILE >= m.x && p.x + p.w + 6 + d * TILE <= m.x + m.w && Math.abs(m.y - (p.y + p.h)) < 60) { supported = true; break; }
      }
    }
    if (!supported) {
      for (const b of game.blinkers) {
        if (blinkerVisible(b) && p.x + p.w + 6 + d * TILE >= b.x && p.x + p.w + 6 + d * TILE <= b.x + b.w && Math.abs(b.y - (p.y + p.h)) < 60) { supported = true; break; }
      }
    }
    if (!supported) { gap = true; break; }
  }
  // Platform bergerak/blinker di depan pada ketinggian lompatan
  let platAhead = false;
  for (const m of game.movers) {
    if (m.x > p.x && m.x - p.x < 90 && Math.abs(m.y - p.y) < 70) platAhead = true;
  }
  const foeNear = game.enemies.some((e) => e.alive && e.x > p.x && e.x - p.x < 64 && Math.abs(e.y - p.y) < 48);
  if (wall || spike || gap || foeNear || platAhead) {
    input.jump = true;
    input.jumpPressed = true;
    setTimeout(() => { input.jump = false; }, 350);
  }
}

// ---------- gambar ----------
function draw() {
  const def = game.level ? game.level.def : LEVELS[0];
  const sky = SKIES[game.levelIndex % SKIES.length];
  const grad = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  grad.addColorStop(0, sky[0]); grad.addColorStop(1, sky[1]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  if (state === 'title') { drawTitle(); return; }
  if (!game.level) return;

  const camX = Math.round(game.camX), camY = Math.round(game.camY);
  // Bukit latar (paralaks)
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  for (let i = 0; i < 8; i++) {
    const bx = ((i * 420 - camX * 0.3) % (VIEW_W + 420) + VIEW_W + 420) % (VIEW_W + 420) - 210;
    ctx.beginPath();
    ctx.ellipse(bx, VIEW_H - camY * 0.2 + 60, 220, 130, 0, Math.PI, 0);
    ctx.fill();
  }
  // Awan
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (let i = 0; i < 6; i++) {
    const ax = ((i * 360 - camX * 0.15 + game.t * 6) % (VIEW_W + 200) + VIEW_W + 200) % (VIEW_W + 200) - 100;
    const ay = 40 + (i % 3) * 46 - camY * 0.1;
    ctx.beginPath();
    ctx.ellipse(ax, ay, 44, 16, 0, 0, Math.PI * 2);
    ctx.ellipse(ax + 26, ay + 4, 30, 12, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.save();
  ctx.translate(-camX, -camY);
  drawTiles(camX, camY);
  drawCoins();
  drawHidden();
  drawMovers();
  drawCheckpointsAndFlag();
  drawEnemies();
  drawPlayer();
  ctx.restore();

  drawHUD();
  if (game.introT > 0 && state === 'play') drawHint();
  if (state === 'dead') drawDead();
  if (state === 'clear') drawClear();
  if (state === 'win') drawWin();
  if (game.paused) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 40px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('JEDA — tekan P untuk lanjut', VIEW_W / 2, VIEW_H / 2);
  }
}

function drawTiles(camX, camY) {
  const g = game.level.grid;
  const x0 = Math.max(0, Math.floor(camX / TILE) - 1);
  const x1 = Math.min(game.level.def.w - 1, Math.ceil((camX + VIEW_W) / TILE) + 1);
  const y0 = Math.max(0, Math.floor(camY / TILE) - 1);
  const y1 = Math.min(game.level.def.h - 1, Math.ceil((camY + VIEW_H) / TILE) + 1);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    const v = g[ty][tx];
    const px = tx * TILE, py = ty * TILE;
    if (v === 1) {
      ctx.fillStyle = '#5d3a1a';
      ctx.fillRect(px, py, TILE, TILE);
      ctx.fillStyle = '#7ec850';
      ctx.fillRect(px, py, TILE, 9);
      ctx.fillStyle = '#4a2c12';
      ctx.fillRect(px + 6, py + 16, 5, 5);
      ctx.fillRect(px + 20, py + 22, 5, 5);
    } else if (v === 2) {
      ctx.fillStyle = '#a4713a';
      ctx.fillRect(px, py + 6, TILE, 12);
      ctx.fillStyle = '#c98f4e';
      ctx.fillRect(px, py + 6, TILE, 4);
    } else if (v === 3) {
      ctx.fillStyle = '#3a3f4a';
      for (let i = 0; i < 4; i++) {
        const sx = px + i * 8;
        ctx.beginPath();
        ctx.moveTo(sx, py + TILE); ctx.lineTo(sx + 4, py + 10); ctx.lineTo(sx + 8, py + TILE);
        ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = '#e8ecf4';
      ctx.fillRect(px, py + TILE - 4, TILE, 4);
    } else if (v === 4) {
      ctx.fillStyle = '#ff5a1f';
      ctx.fillRect(px, py + 8, TILE, TILE - 8);
      ctx.fillStyle = '#ffb347';
      ctx.beginPath();
      ctx.arc(px + 8 + Math.sin(game.t * 3 + tx) * 3, py + 14, 5, 0, Math.PI * 2);
      ctx.arc(px + 22, py + 20, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawCoins() {
  for (const c of game.level.coins) {
    if (c.taken) continue;
    const cx = c.x * TILE + 16, cy = c.y * TILE + 16;
    const sq = Math.abs(Math.sin(game.t * 4 + c.x));
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath();
    ctx.ellipse(cx, cy, 4 + 8 * sq, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#b8860b';
    ctx.beginPath();
    ctx.ellipse(cx, cy, 2 + 4 * sq, 6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawHidden() {
  for (const h of game.level.hidden) {
    if (!h.revealed) continue;
    ctx.fillStyle = '#d8a03c';
    ctx.fillRect(h.x * TILE, h.y * TILE, TILE, TILE);
    ctx.fillStyle = '#8a5f14';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('?', h.x * TILE + 16, h.y * TILE + 24);
  }
}

function drawMovers() {
  for (const m of game.movers) {
    ctx.fillStyle = '#7a4a21';
    ctx.fillRect(m.x, m.y, m.w, m.h);
    ctx.fillStyle = '#c98f4e';
    ctx.fillRect(m.x, m.y, m.w, 4);
    ctx.fillStyle = '#ffd23f';
    ctx.fillRect(m.x + 4, m.y + 5, 4, 4);
    ctx.fillRect(m.x + m.w - 8, m.y + 5, 4, 4);
  }
  for (const b of game.blinkers) {
    const vis = blinkerVisible(b);
    const ph = (game.t + b.offset) % b.period;
    const fading = ph > b.period * 0.45;
    ctx.globalAlpha = vis ? (fading ? 0.45 + 0.3 * Math.sin(game.t * 20) : 1) : 0.12;
    ctx.fillStyle = '#9b59d0';
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = '#d0a2f0';
    ctx.fillRect(b.x, b.y, b.w, 4);
    ctx.globalAlpha = 1;
  }
}

function drawCheckpointsAndFlag() {
  game.level.def.checkpoints.forEach(([cx, cy], ci) => {
    const active = ci <= game.checkpointIdx;
    const px = cx * TILE + 15, py = cy * TILE + 2;
    ctx.fillStyle = '#888';
    ctx.fillRect(px, py - 44, 3, 46);
    ctx.fillStyle = active ? '#2ecc71' : '#bbb';
    ctx.beginPath();
    ctx.moveTo(px + 3, py - 44); ctx.lineTo(px + 22, py - 36); ctx.lineTo(px + 3, py - 28);
    ctx.closePath(); ctx.fill();
  });
  const [fx, fy] = game.level.def.flag;
  const px = fx * TILE + 15, py = fy * TILE + 2;
  ctx.fillStyle = '#666';
  ctx.fillRect(px, py - 64, 4, 66);
  ctx.fillStyle = '#e74c3c';
  const wave = Math.sin(game.t * 6) * 4;
  ctx.beginPath();
  ctx.moveTo(px + 4, py - 64);
  ctx.lineTo(px + 34, py - 56 + wave);
  ctx.lineTo(px + 4, py - 46);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ffd23f';
  ctx.beginPath();
  ctx.arc(px + 2, py - 66, 5, 0, Math.PI * 2);
  ctx.fill();
}

function drawEnemies() {
  for (const e of game.enemies) {
    if (!e.alive) continue;
    if (e.kind === 'walker') {
      ctx.fillStyle = '#8e44ad';
      ctx.beginPath();
      ctx.arc(e.x + e.w / 2, e.y + e.h / 2, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#5b2a6e';
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + game.t * 2;
        ctx.beginPath();
        ctx.moveTo(e.x + e.w / 2 + Math.cos(a) * 12, e.y + e.h / 2 + Math.sin(a) * 12);
        ctx.lineTo(e.x + e.w / 2 + Math.cos(a) * 18, e.y + e.h / 2 + Math.sin(a) * 18);
        ctx.lineTo(e.x + e.w / 2 + Math.cos(a + 0.5) * 12, e.y + e.h / 2 + Math.sin(a + 0.5) * 12);
        ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(e.x + e.w / 2 - 4, e.y + 10, 3, 0, Math.PI * 2);
      ctx.arc(e.x + e.w / 2 + 5, e.y + 10, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#222';
      ctx.beginPath();
      ctx.arc(e.x + e.w / 2 - 4 + (e.vx > 0 ? 1 : -1), e.y + 10, 1.5, 0, Math.PI * 2);
      ctx.arc(e.x + e.w / 2 + 5 + (e.vx > 0 ? 1 : -1), e.y + 10, 1.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.kind === 'roller') {
      const rot = game.t * 6;
      ctx.save();
      ctx.translate(e.x + e.w / 2, e.y + e.h / 2);
      ctx.rotate(rot);
      ctx.fillStyle = '#5d6d7e';
      ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2c3e50';
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 11, Math.sin(a) * 11);
        ctx.lineTo(Math.cos(a) * 17, Math.sin(a) * 17);
        ctx.lineTo(Math.cos(a + 0.4) * 11, Math.sin(a + 0.4) * 11);
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    } else {
      const flap = Math.sin(game.t * 12 + e.ph) * 8;
      ctx.fillStyle = '#2c2c34';
      ctx.beginPath();
      ctx.moveTo(e.x + 4, e.y + 12);
      ctx.quadraticCurveTo(e.x - 10, e.y + 2 - flap, e.x - 12, e.y + 14);
      ctx.quadraticCurveTo(e.x - 2, e.y + 16, e.x + 4, e.y + 12);
      ctx.moveTo(e.x + e.w - 4, e.y + 12);
      ctx.quadraticCurveTo(e.x + e.w + 10, e.y + 2 - flap, e.x + e.w + 12, e.y + 14);
      ctx.quadraticCurveTo(e.x + e.w + 2, e.y + 16, e.x + e.w - 4, e.y + 12);
      ctx.fill();
      ctx.fillStyle = '#3d3d48';
      ctx.beginPath();
      ctx.ellipse(e.x + e.w / 2, e.y + e.h / 2, 11, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff5252';
      ctx.beginPath();
      ctx.arc(e.x + e.w / 2 - 4, e.y + 9, 2, 0, Math.PI * 2);
      ctx.arc(e.x + e.w / 2 + 4, e.y + 9, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawPlayer() {
  const p = game.player;
  if (!p || p.dead) return;
  const cx = p.x + p.w / 2, feet = p.y + p.h;
  const squash = p.squash > 0 ? 1 - p.squash * 1.5 : 1;
  ctx.save();
  ctx.translate(cx, feet);
  ctx.scale(p.face * (2 - squash) * 0.5 + 0.5, squash);
  // Badan api
  ctx.fillStyle = '#ff7b24';
  ctx.beginPath();
  ctx.ellipse(0, -14, 11, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  // Api di kepala
  ctx.fillStyle = '#ffc93c';
  ctx.beginPath();
  ctx.moveTo(-7, -24);
  ctx.quadraticCurveTo(-10, -34 - Math.sin(game.t * 8) * 2, -2, -30);
  ctx.quadraticCurveTo(2, -40 - Math.sin(game.t * 9) * 3, 6, -30);
  ctx.quadraticCurveTo(10, -34, 7, -24);
  ctx.closePath(); ctx.fill();
  // Mata
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(2, -16, 3.4, 0, Math.PI * 2);
  ctx.arc(8, -16, 3.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#222';
  ctx.beginPath();
  ctx.arc(3, -16, 1.6, 0, Math.PI * 2);
  ctx.arc(9, -16, 1.6, 0, Math.PI * 2);
  ctx.fill();
  // Kaki
  const run = p.grounded && Math.abs(p.vx) > 20 ? Math.sin(game.t * 18) * 4 : 0;
  ctx.fillStyle = '#7a3b06';
  ctx.fillRect(-7 + run, -4, 6, 4);
  ctx.fillRect(2 - run, -4, 6, 4);
  ctx.restore();
}

function fmtTime(s) {
  const m = Math.floor(s / 60), ss = Math.floor(s % 60);
  return `${m}:${String(ss).padStart(2, '0')}`;
}

function drawHUD() {
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(0, 0, VIEW_W, 34);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'left';
  const def = game.level.def;
  ctx.fillText(`LEVEL ${game.levelIndex + 1}/${LEVELS.length} — ${def.name}`, 12, 22);
  ctx.textAlign = 'center';
  ctx.fillText(`Koin ${game.coins} / ${game.totalCoins}`, VIEW_W / 2, 22);
  ctx.textAlign = 'right';
  ctx.fillText(`Mati: ${game.deaths}   Waktu: ${fmtTime(game.time)}`, VIEW_W - 12, 22);
  if (game.checkpointIdx >= 0) {
    ctx.fillStyle = '#2ecc71';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('✓ Pos tersimpan', 12, 52);
  }
  if (game.paused) return;
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('P = jeda · M = suara · R = ulang', VIEW_W - 12, 52);
}

function drawHint() {
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  const w = Math.min(VIEW_W - 80, 720);
  ctx.fillRect((VIEW_W - w) / 2, 44, w, 44);
  ctx.fillStyle = '#ffe27a';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'center';
  wrapText(game.level.def.hint, VIEW_W / 2, 62, w - 24, 18);
}

function wrapText(text, x, y, maxW, lh) {
  const words = text.split(' ');
  let line = '', yy = y;
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line, x, yy); line = w; yy += lh; }
    else line = test;
  }
  ctx.fillText(line, x, yy);
}

function drawTitle() {
  ctx.fillStyle = '#2b1a4d';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = '#ff7b24';
  ctx.beginPath();
  ctx.arc(VIEW_W / 2, 150, 70, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffc93c';
  ctx.beginPath();
  ctx.moveTo(VIEW_W / 2 - 40, 110);
  ctx.quadraticCurveTo(VIEW_W / 2 - 20, 40, VIEW_W / 2, 80);
  ctx.quadraticCurveTo(VIEW_W / 2 + 20, 30, VIEW_W / 2 + 40, 110);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 64px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('LOMPAT NERAKA', VIEW_W / 2, 260);
  ctx.fillStyle = '#ffe27a';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('Sulit. Bikin emosi. Tapi SELALU bisa ditamatkan — pakai akal!', VIEW_W / 2, 296);
  ctx.fillStyle = '#fff';
  ctx.font = '18px sans-serif';
  ctx.fillText('Bimo si Bocah Api harus melewati 6 level Pulau Duri.', VIEW_W / 2, 330);
  ctx.fillText('← → / A D bergerak · SPASI / W / ↑ lompat (tahan = lebih tinggi)', VIEW_W / 2, 358);
  ctx.fillText('Injak musuh dari atas · Sentuh bendera untuk menang · Pos pemeriksaan menyimpan progres', VIEW_W / 2, 384);
  ctx.fillStyle = '#2ecc71';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText(state === 'title' ? '— TEKAN ENTER ATAU KLIK UNTUK MULAI —' : '', VIEW_W / 2, 440);
  ctx.fillStyle = '#bbb';
  ctx.font = '14px sans-serif';
  ctx.fillText('Bisa dimainkan di HP: tombol ◀ ▶ dan LOMPAT di layar.', VIEW_W / 2, 480);
  ctx.fillText('Game orisinal 100% — dibuat dari nol.', VIEW_W / 2, 504);
}

function drawDead() {
  ctx.fillStyle = 'rgba(120,0,0,0.45)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 44px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ADUH!', VIEW_W / 2, VIEW_H / 2 - 30);
  ctx.font = '20px sans-serif';
  ctx.fillText(game.deadCause, VIEW_W / 2, VIEW_H / 2 + 8);
  ctx.fillStyle = '#ffe27a';
  ctx.font = '16px sans-serif';
  ctx.fillText('Tenang. Amati polanya. Coba lagi — kamu respawn di pos terakhir.', VIEW_W / 2, VIEW_H / 2 + 40);
}

function drawClear() {
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = '#2ecc71';
  ctx.font = 'bold 44px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('LEVEL SELESAI!', VIEW_W / 2, VIEW_H / 2 - 40);
  ctx.fillStyle = '#fff';
  ctx.font = '20px sans-serif';
  ctx.fillText(`Level ${game.levelIndex + 1} — ${game.level.def.name} · Waktu level: ${fmtTime(game.levelTime)}`, VIEW_W / 2, VIEW_H / 2);
  ctx.fillText(`Kematian sejauh ini: ${game.deaths} · Koin: ${game.coins}`, VIEW_W / 2, VIEW_H / 2 + 30);
  ctx.fillStyle = '#ffe27a';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText(game.levelIndex + 1 >= LEVELS.length ? 'TEKAN ENTER — LIHAT HASIL AKHIR' : 'TEKAN ENTER — LANJUT LEVEL BERIKUTNYA', VIEW_W / 2, VIEW_H / 2 + 72);
}

function drawWin() {
  ctx.fillStyle = '#1d5c2e';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = '#ffd23f';
  ctx.font = 'bold 52px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('KAMU MENANG!', VIEW_W / 2, 170);
  ctx.fillStyle = '#fff';
  ctx.font = '22px sans-serif';
  ctx.fillText('Bimo menaklukkan Pulau Duri. Semua 6 level tamat!', VIEW_W / 2, 220);
  ctx.fillText(`Total kematian: ${game.deaths}`, VIEW_W / 2, 262);
  ctx.fillText(`Total waktu: ${fmtTime(game.time)}`, VIEW_W / 2, 294);
  ctx.fillText(`Koin: ${game.coins}`, VIEW_W / 2, 326);
  ctx.fillStyle = '#ffe27a';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText(game.deaths === 0 ? 'TANPA MATI SEKALIPUN. Legenda!' : game.deaths < 10 ? 'Sedikit mati — kamu memang jago.' : 'Banyak mati, tapi tidak menyerah. Itu intinya.', VIEW_W / 2, 372);
  ctx.fillStyle = '#fff';
  ctx.font = '20px sans-serif';
  ctx.fillText('TEKAN ENTER UNTUK MAIN LAGI', VIEW_W / 2, 430);
}

// ---------- loop ----------
let last = performance.now();
let acc = 0;
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  acc += dt;
  let n = 0;
  while (acc >= STEP && n < 5) {
    step(STEP);
    acc -= STEP;
    n++;
    if (state === 'dead') {
      game.deadT -= STEP;
      if (game.deadT <= 0) respawn();
    }
  }
  draw();
  requestAnimationFrame(frame);
}

canvas.addEventListener('pointerdown', () => { sfx.ensure(); advance(); });
document.getElementById('btn-start').addEventListener('click', () => advance());

// Mode tangkapan layar: atur keadaan awal secara deterministik.
function applyShot() {
  if (SHOT === 'start') { state = 'title'; return; }
  if (SHOT === 'play') {
    loadLevel(1, true);
    game.player.x = 8 * TILE; game.player.y = 13 * TILE;
    game.camX = 0; game.introT = 0;
    return;
  }
  if (SHOT === 'spike') {
    loadLevel(2, true);
    game.player.x = 38 * TILE; game.player.y = 13 * TILE;
    game.camX = 30 * TILE; game.introT = 0;
    return;
  }
  if (SHOT === 'clear') {
    loadLevel(0, true);
    state = 'clear';
    return;
  }
  if (SHOT === 'win') {
    loadLevel(0, true);
    game.deaths = 7; game.coins = 42; game.time = 754;
    state = 'win';
    return;
  }
}
applyShot();
const LEVEL_PARAM = params.get('level');
if (LEVEL_PARAM !== null && !SHOT) {
  const li = Math.max(0, Math.min(LEVELS.length - 1, parseInt(LEVEL_PARAM, 10) || 0));
  loadLevel(li, true);
}
if (AUTO) { if (state === 'title') advance(); }

window.__game = {
  get state() { return state; },
  get levelIndex() { return game.levelIndex; },
  get deaths() { return game.deaths; },
  get coins() { return game.coins; },
  get time() { return game.time; },
  playerPos() { return game.player ? { x: game.player.x, y: game.player.y } : null; },
  debug() {
    const p = game.player;
    return p ? { x: Math.round(p.x), y: Math.round(p.y), vx: Math.round(p.vx), vy: Math.round(p.vy), grounded: p.grounded } : null;
  },
  lastDeath() { return game.lastDeath || null; },
  levels: LEVELS.length,
};

updateStatus();
requestAnimationFrame(frame);
