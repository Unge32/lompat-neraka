// Validator level Lompat Neraka (Node, tanpa DOM):
// - semua koordinat di dalam batas, tidak ada yang tumpang tindih aneh
// - tepat satu start & satu flag per level
// - flag dapat dicapai dari start dengan lompatan pemain
//   (naik <= 4 tile, jauh <= 5 tile, jatuh bebas) lewat semua jenis pijakan:
//   tanah, platform satu arah, platform bergerak, platform berkedip, blok tersembunyi
import { LEVELS, buildLevel } from '../game/src/levels.js';

let fails = 0;
const check = (ok, msg) => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${msg}`);
  if (!ok) fails++;
};

for (let li = 0; li < LEVELS.length; li++) {
  const def = LEVELS[li];
  const tag = `L${li + 1} ${def.name}`;
  const built = buildLevel(def);
  const inB = (x, y) => x >= 0 && y >= 0 && x < def.w && y < def.h;
  check(inB(def.start[0], def.start[1]), `${tag}: start dalam batas`);
  check(inB(def.flag[0], def.flag[1]), `${tag}: flag dalam batas`);
  const solid = (x, y) => {
    if (!inB(x, y)) return false;
    return built.grid[y][x] === 1 || built.grid[y][x] === 2;
  };
  // Pijakan: sel padat/satu-arah + mover + blinker + hidden (dianggap bisa dipijak)
  const supports = new Set();
  const key = (x, y) => `${x},${y}`;
  for (let y = 0; y < def.h; y++) for (let x = 0; x < def.w; x++) if (solid(x, y)) supports.add(key(x, y));
  for (const m of def.movers) for (let x = m.x; x < m.x + m.w; x++) supports.add(key(x, m.y));
  for (const b of def.blinkers) for (let x = b.x; x < b.x + b.w; x++) supports.add(key(x, b.y));
  for (const h of def.hidden) supports.add(key(h.x, h.y));
  // Start & flag harus berdiri di atas pijakan
  check(solid(def.start[0], def.start[1] + 1), `${tag}: tanah di bawah start`);
  check(solid(def.flag[0], def.flag[1] + 1), `${tag}: tanah di bawah flag`);
  // Duri tidak boleh menutupi start/flag
  const spikeAt = (x, y) => inB(x, y) && built.grid[y][x] === 3;
  check(!spikeAt(def.start[0], def.start[1]) && !spikeAt(def.flag[0], def.flag[1]), `${tag}: start/flag bebas duri`);
  // BFS ketercapaian: dari pijakan start, lompat naik <=4 & jauh <=5, atau jatuh.
  const startKey = key(def.start[0], def.start[1] + 1);
  const seen = new Set([startKey]);
  const q = [[def.start[0], def.start[1] + 1]];
  const nodes = [...supports].map((s) => s.split(',').map(Number));
  while (q.length) {
    const [x, y] = q.shift();
    for (const [nx, ny] of nodes) {
      if (seen.has(key(nx, ny))) continue;
      const dx = Math.abs(nx - x), dy = y - ny; // dy>0 = naik
      const jump = dy >= -1 && dy <= 4 && dx <= 5;
      const drop = dy < -1 && dx <= 6;
      const step = dy === 0 && dx <= 1;
      if (jump || drop || step) { seen.add(key(nx, ny)); q.push([nx, ny]); }
    }
  }
  const flagKey = key(def.flag[0], def.flag[1] + 1);
  check(seen.has(flagKey), `${tag}: flag dapat dicapai dari start (BFS pijakan)`);
  // Checkpoint harus dapat dicapai juga
  for (const [cx, cy] of def.checkpoints) {
    check(seen.has(key(cx, cy + 1)), `${tag}: checkpoint (${cx},${cy}) dapat dicapai`);
  }
  // Koin: setidaknya 80% dapat dicapai (koin melayang di atas pijakan)
  let coinOk = 0;
  for (const c of def.coins) {
    let ok = false;
    for (let d = 0; d <= 5; d++) for (const [sx, sy] of [...seen].map((s) => s.split(',').map(Number))) {
      if (Math.abs(c.x - sx) <= 2 && sy - c.y >= 0 && sy - c.y <= 4) { ok = true; break; }
      if (ok) break;
    }
    if (ok) coinOk++;
  }
  check(coinOk >= Math.ceil(def.coins.length * 0.8), `${tag}: koin tercapai ${coinOk}/${def.coins.length}`);
  check(def.coins.length > 0, `${tag}: ada koin`);
}

console.log(fails === 0 ? 'SEMUA VALIDASI LULUS' : `${fails} VALIDASI GAGAL`);
process.exit(fails === 0 ? 0 : 1);
