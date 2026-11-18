// LOMPAT NERAKA — data level.
// Semua level didefinisikan sebagai data (koordinat tile), bukan gambar:
//   ground  : petak padat {x, y, w, h}        (y = baris atas)
//   plats   : platform satu arah {x, y, w}    (bisa dilompati dari bawah)
//   spikes  : duri {x, y, w}                  (menyentuh = mati)
//   coins   : koin {x, y}
//   hidden  : blok tersembunyi {x, y}          (muncul saat dipukul dari bawah)
//   walkers : musuh jalan {x, y}              (bolak-balik di tanah)
//   rollers : musuh bola cepat {x, y}
//   flyers  : musuh terbang {x, y}            (melayang naik-turun)
//   movers  : platform bergerak {x, y, w, axis, range, speed}
//   blinkers: platform hilang-muncul {x, y, w, period, offset}
//   lava    : lava {x, y, w}                  (menyentuh = mati)
//   start   : posisi awal pemain [x, y]
//   flag    : bendera tujuan [x, y]
//   checkpoints: pos pemeriksaan [x, y]
// Tile = 32 px. Lompatan pemain: tinggi ~4 tile, jauh ~5 tile.
export const TILE = 32;

export const LEVELS = [
  {
    name: 'Pemanasan',
    hint: 'Lari dengan ← → atau A D. Lompat dengan SPASI / W / ↑. Hindari duri, ambil koin, sentuh bendera!',
    w: 62, h: 16,
    start: [2, 13],
    flag: [58, 13],
    checkpoints: [[40, 13]],
    ground: [{ x: 0, y: 14, w: 34, h: 2 }, { x: 36, y: 14, w: 26, h: 2 }],
    plats: [{ x: 47, y: 11, w: 4 }],
    spikes: [{ x: 26, y: 13, w: 2 }, { x: 44, y: 13, w: 2 }],
    coins: [
      { x: 8, y: 12 }, { x: 10, y: 12 }, { x: 12, y: 12 },
      { x: 33, y: 12 }, { x: 34, y: 11 }, { x: 35, y: 11 }, { x: 36, y: 12 },
      { x: 48, y: 10 }, { x: 49, y: 10 }, { x: 50, y: 10 },
    ],
    hidden: [], walkers: [], rollers: [], flyers: [],
    movers: [], blinkers: [], lava: [],
  },
  {
    name: 'Jurang Pertama',
    hint: 'Jurang 3 petak bisa dilompati langsung. Platform bergerak membantumu menyeberang — naik saat ia dekat!',
    w: 80, h: 16,
    start: [2, 13],
    flag: [76, 13],
    checkpoints: [[50, 13]],
    ground: [
      { x: 0, y: 14, w: 20, h: 2 }, { x: 23, y: 14, w: 15, h: 2 },
      { x: 41, y: 14, w: 14, h: 2 }, { x: 58, y: 14, w: 22, h: 2 },
    ],
    plats: [{ x: 8, y: 11, w: 3 }, { x: 64, y: 11, w: 3 }],
    spikes: [{ x: 30, y: 13, w: 2 }, { x: 66, y: 13, w: 2 }],
    coins: [
      { x: 20, y: 12 }, { x: 21, y: 11 }, { x: 22, y: 12 },
      { x: 38, y: 12 }, { x: 39, y: 11 }, { x: 40, y: 12 },
      { x: 55, y: 12 }, { x: 56, y: 11 }, { x: 57, y: 12 },
      { x: 9, y: 10 }, { x: 65, y: 10 },
    ],
    hidden: [],
    walkers: [{ x: 48, y: 13 }],
    rollers: [], flyers: [],
    movers: [{ x: 36, y: 12, w: 3, axis: 'x', range: 2, speed: 1.1 }],
    blinkers: [], lava: [],
  },
  {
    name: 'Duri Berbaris',
    hint: 'Duri makin lebar — lompat tepat di ujungnya. Platform yang berkedip hilang sesaat: hitung ritmenya, jangan terburu-buru!',
    w: 90, h: 16,
    start: [2, 13],
    flag: [86, 13],
    checkpoints: [[45, 13]],
    ground: [
      { x: 0, y: 14, w: 30, h: 2 }, { x: 33, y: 14, w: 28, h: 2 },
      { x: 64, y: 14, w: 26, h: 2 },
    ],
    plats: [{ x: 14, y: 11, w: 3 }, { x: 70, y: 11, w: 3 }],
    spikes: [
      { x: 10, y: 13, w: 3 }, { x: 20, y: 13, w: 2 },
      { x: 40, y: 13, w: 4 }, { x: 74, y: 13, w: 3 },
    ],
    coins: [
      { x: 11, y: 11 }, { x: 21, y: 11 }, { x: 41, y: 11 }, { x: 42, y: 11 },
      { x: 30, y: 10 }, { x: 32, y: 10 }, { x: 15, y: 10 }, { x: 71, y: 10 },
    ],
    hidden: [],
    walkers: [{ x: 52, y: 13 }],
    rollers: [], flyers: [{ x: 58, y: 10 }],
    movers: [],
    blinkers: [
      { x: 30, y: 12, w: 2, period: 2.4, offset: 0 },
      { x: 32, y: 12, w: 2, period: 2.4, offset: 1.2 },
    ],
    lava: [{ x: 30, y: 15, w: 3 }],
  },
  {
    name: 'Penjaga Duri',
    hint: 'Injak musuh dari atas untuk mengalahkannya! Ada blok tersembunyi di atas jurang — lompat dan sundul dari bawah.',
    w: 90, h: 16,
    start: [2, 13],
    flag: [86, 13],
    checkpoints: [[34, 13], [66, 13]],
    ground: [
      { x: 0, y: 14, w: 26, h: 2 }, { x: 29, y: 14, w: 30, h: 2 },
      { x: 62, y: 14, w: 28, h: 2 },
    ],
    plats: [{ x: 6, y: 11, w: 3 }, { x: 80, y: 11, w: 3 }],
    spikes: [{ x: 44, y: 13, w: 3 }, { x: 72, y: 13, w: 2 }],
    coins: [
      { x: 7, y: 10 }, { x: 26, y: 10 }, { x: 27, y: 10 }, { x: 28, y: 10 },
      { x: 45, y: 11 }, { x: 81, y: 10 }, { x: 60, y: 12 },
    ],
    hidden: [{ x: 26, y: 11 }, { x: 27, y: 11 }, { x: 28, y: 11 }],
    walkers: [{ x: 12, y: 13 }, { x: 16, y: 13 }, { x: 36, y: 13 }, { x: 48, y: 13 }],
    rollers: [{ x: 70, y: 13 }],
    flyers: [],
    movers: [], blinkers: [], lava: [],
  },
  {
    name: 'Menara Api',
    hint: 'Naik, jangan turun! Platform bergerak naik-turun — tunggu momennya. Jatuh = mulai lagi dari pos terakhir.',
    w: 48, h: 24,
    start: [2, 21],
    flag: [40, 5],
    checkpoints: [[22, 15]],
    ground: [
      { x: 0, y: 22, w: 10, h: 2 },
      { x: 22, y: 16, w: 5, h: 1 },
      { x: 36, y: 6, w: 10, h: 2 },
    ],
    plats: [
      { x: 12, y: 20, w: 3 }, { x: 18, y: 18, w: 3 }, { x: 26, y: 16, w: 3 },
      { x: 30, y: 14, w: 3 }, { x: 24, y: 12, w: 3 }, { x: 30, y: 10, w: 5 },
      { x: 34, y: 9, w: 3 },
    ],
    spikes: [],
    coins: [
      { x: 13, y: 19 }, { x: 19, y: 17 }, { x: 27, y: 15 },
      { x: 31, y: 13 }, { x: 25, y: 11 }, { x: 37, y: 7 }, { x: 41, y: 4 },
    ],
    hidden: [{ x: 20, y: 14 }],
    walkers: [],
    rollers: [], flyers: [{ x: 14, y: 8 }, { x: 28, y: 8 }],
    movers: [
      { x: 8, y: 18, w: 3, axis: 'y', range: 2, speed: 1.0 },
      { x: 33, y: 12, w: 3, axis: 'y', range: 1, speed: 1.3 },
    ],
    blinkers: [], lava: [],
  },
  {
    name: 'Neraka Terakhir',
    hint: 'Semua yang kau pelajari, sekaligus. Pelan-pelan. Amati polanya. Setiap kematian mengajarkan sesuatu.',
    w: 120, h: 16,
    start: [2, 13],
    flag: [116, 13],
    checkpoints: [[30, 13], [57, 13], [84, 13]],
    ground: [
      { x: 0, y: 14, w: 24, h: 2 }, { x: 27, y: 14, w: 24, h: 2 },
      { x: 54, y: 14, w: 24, h: 2 }, { x: 81, y: 14, w: 20, h: 2 },
      { x: 104, y: 14, w: 16, h: 2 },
    ],
    plats: [
      { x: 10, y: 11, w: 3 }, { x: 34, y: 11, w: 3 },
      { x: 62, y: 11, w: 3 }, { x: 90, y: 11, w: 3 },
    ],
    spikes: [
      { x: 14, y: 13, w: 3 }, { x: 40, y: 13, w: 2 },
      { x: 66, y: 13, w: 4 }, { x: 94, y: 13, w: 3 }, { x: 110, y: 13, w: 2 },
    ],
    coins: [
      { x: 11, y: 10 }, { x: 24, y: 12 }, { x: 25, y: 11 }, { x: 26, y: 12 },
      { x: 35, y: 10 }, { x: 51, y: 12 }, { x: 52, y: 11 }, { x: 53, y: 12 },
      { x: 63, y: 10 }, { x: 78, y: 10 }, { x: 79, y: 10 },
      { x: 91, y: 10 }, { x: 101, y: 10 }, { x: 102, y: 10 }, { x: 103, y: 10 },
    ],
    hidden: [{ x: 101, y: 11 }, { x: 102, y: 11 }, { x: 103, y: 11 }],
    walkers: [{ x: 20, y: 13 }, { x: 46, y: 13 }, { x: 72, y: 13 }, { x: 106, y: 13 }],
    rollers: [{ x: 60, y: 13 }],
    flyers: [{ x: 36, y: 10 }, { x: 88, y: 10 }],
    movers: [{ x: 51, y: 12, w: 3, axis: 'x', range: 2, speed: 1.2 }],
    blinkers: [
      { x: 78, y: 12, w: 2, period: 2.2, offset: 0 },
      { x: 80, y: 12, w: 2, period: 2.2, offset: 1.1 },
    ],
    lava: [{ x: 78, y: 15, w: 3 }],
  },
];

// Bangun grid padat dari data level: 0 kosong, 1 padat, 2 platform satu arah,
// 3 duri, 4 lava. Koin/musuh/pos dikembalikan sebagai daftar.
export function buildLevel(def) {
  const grid = [];
  for (let y = 0; y < def.h; y++) grid.push(new Uint8Array(def.w));
  const put = (x, y, v) => { if (x >= 0 && y >= 0 && x < def.w && y < def.h) grid[y][x] = v; };
  for (const g of def.ground) for (let y = g.y; y < g.y + g.h; y++) for (let x = g.x; x < g.x + g.w; x++) put(x, y, 1);
  for (const p of def.plats) for (let x = p.x; x < p.x + p.w; x++) put(x, p.y, 2);
  for (const s of def.spikes) for (let x = s.x; x < s.x + s.w; x++) put(x, s.y, 3);
  for (const l of def.lava) for (let x = l.x; x < l.x + l.w; x++) put(x, l.y, 4);
  return {
    def, grid,
    coins: def.coins.map((c) => ({ x: c.x, y: c.y, taken: false })),
    hidden: def.hidden.map((c) => ({ x: c.x, y: c.y, revealed: false })),
    walkers: def.walkers.map((e) => ({ x: e.x, y: e.y })),
    rollers: def.rollers.map((e) => ({ x: e.x, y: e.y })),
    flyers: def.flyers.map((e) => ({ x: e.x, y: e.y })),
  };
}
