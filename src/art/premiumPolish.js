// 전 종 공통 고해상도 벡터 마감 레이어.
// 기존 실루엣 위에 재질 하이라이트와 종별 식별 디테일만 더해 게임 판독성을 보존한다.

const TIER_KEYS = {
  1: ['mushroom', 'boar', 'deer', 'zombie', 'slime', 'bat', 'skeleton', 'goblin', 'kobold', 'imp', 'slimeMini'],
  2: ['mandrake', 'orc', 'mummy', 'hedgehog', 'ghost', 'rhino', 'leopard', 'wolf', 'farmer', 'siren2', 'squirrelKeeper'],
  3: ['troll', 'ogre', 'werewolf', 'vampire', 'centaur', 'tiger', 'elephant', 'gargoyle3', 'siren3', 'knight', 'sporeShroom'],
  4: ['giant', 'whale', 'boa', 'gargoyle4', 'lich', 'witch', 'alchemist', 'banshee', 'chimera', 'golem', 'necromancer', 'slimeQueen'],
  5: ['cerberus', 'basilisk', 'dullahan', 'phoenix', 'demon', 'angel', 'captain', 'priest', 'kraken', 'drake', 'vermillionBird'],
  6: ['dragonrider', 'hydra', 'sphinx', 'behemoth', 'leviathan', 'cyclops', 'fenrir', 'minotaur', 'unicorn', 'merlin', 'boneDragon'],
};

const KEY_TIER = Object.fromEntries(
  Object.entries(TIER_KEYS).flatMap(([tier, keys]) => keys.map((key) => [key, Number(tier)])),
);

const HUMANOID = new Set([
  'zombie', 'skeleton', 'goblin', 'kobold', 'imp', 'orc', 'mummy', 'farmer', 'squirrelKeeper',
  'troll', 'ogre', 'werewolf', 'vampire', 'centaur', 'gargoyle3', 'siren3', 'knight', 'giant',
  'gargoyle4', 'lich', 'witch', 'alchemist', 'banshee', 'necromancer', 'dullahan', 'demon', 'angel',
  'captain', 'priest', 'dragonrider', 'sphinx', 'cyclops', 'minotaur', 'merlin',
]);
const FLYER = new Set(['bat', 'imp', 'gargoyle3', 'siren3', 'gargoyle4', 'phoenix', 'angel', 'drake', 'vermillionBird', 'dragonrider', 'boneDragon']);
const AQUATIC = new Set(['siren2', 'whale', 'boa', 'kraken', 'leviathan']);
const AMORPHOUS = new Set(['mushroom', 'slime', 'mandrake', 'ghost', 'sporeShroom', 'banshee', 'slimeQueen', 'slimeMini']);
const CONSTRUCT = new Set(['skeleton', 'mummy', 'lich', 'golem', 'necromancer', 'boneDragon']);

const line = (d, color = '#FFFFFF', width = 7, opacity = 0.58, extra = '') =>
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" opacity="${opacity}" ${extra}/>`;
const dot = (cx, cy, r, color = '#FFFFFF', opacity = 0.72) =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" stroke="none" opacity="${opacity}"/>`;
const fill = (d, color, opacity = 0.5) =>
  `<path d="${d}" fill="${color}" stroke="none" opacity="${opacity}"/>`;

function mixHex(hex, target, ratio) {
  const source = hex.slice(1).match(/.{2}/g).map((v) => parseInt(v, 16));
  const mixed = source.map((value) => Math.round(value + (target - value) * ratio));
  return `#${mixed.map((value) => value.toString(16).padStart(2, '0')).join('')}`;
}

// 원본의 단색 파츠를 같은 색상군의 벡터 그라디언트로 치환한다.
// 어두운 외곽선과 순백색 하이라이트는 그대로 두어 작은 크기 판독성을 보존한다.
export function premiumizeMarkup(key, markup) {
  const colors = [...new Set(
    [...markup.matchAll(/fill="(#[0-9A-Fa-f]{6})"/g)]
      .map((match) => match[1].toUpperCase())
      .filter((color) => color !== '#25314A' && color !== '#FFFFFF'),
  )];
  const indexByColor = new Map(colors.map((color, index) => [color, index]));
  const defs = colors.map((color, index) => {
    const light = mixHex(color, 255, 0.2);
    const dark = mixHex(color, 0, 0.14);
    return `<linearGradient id="paint-${key}-${index}" x1="0.12" y1="0.05" x2="0.88" y2="0.95">`
      + `<stop offset="0" stop-color="${light}"/>`
      + `<stop offset="0.52" stop-color="${color}"/>`
      + `<stop offset="1" stop-color="${dark}"/>`
      + '</linearGradient>';
  }).join('');
  const body = markup.replace(/fill="(#[0-9A-Fa-f]{6})"/g, (match, rawColor) => {
    const color = rawColor.toUpperCase();
    const index = indexByColor.get(color);
    return index == null ? match : `fill="url(#paint-${key}-${index})"`;
  });
  return { defs: defs ? `<defs>${defs}</defs>` : '', body };
}

const FAMILY_HIGHLIGHT = {
  humanoid: line('M218 153 q36 -17 70 -1', '#FFFFFF', 8, 0.42) + line('M202 272 q22 -16 46 -17', '#FFFFFF', 6, 0.24),
  flyer: line('M142 206 q36 -40 76 -38 M294 168 q42 4 75 39', '#FFFFFF', 7, 0.34),
  aquatic: line('M164 254 q48 -30 104 -16', '#FFFFFF', 8, 0.4) + dot(178, 224, 7, '#DFFFF8', 0.65),
  amorphous: line('M174 170 q42 -37 88 -31', '#FFFFFF', 9, 0.48) + dot(163, 205, 7, '#FFFFFF', 0.68),
  construct: line('M210 176 q40 -19 76 -2', '#FFFFFF', 7, 0.32) + line('M204 290 h48', '#FFFFFF', 6, 0.2),
  beast: line('M174 257 q58 -28 118 -13', '#FFFFFF', 8, 0.36) + dot(191, 238, 6, '#FFFFFF', 0.52),
};

const SIGNATURE = {
  mushroom: line('M137 196 q46 -52 101 -55', '#FFFFFF', 9, 0.62) + dot(171, 169, 8),
  boar: line('M170 280 q58 -26 119 -9', '#E4B184', 8, 0.55) + line('M205 246 l12 -14 m18 12 12 -16 m18 18 12 -14', '#3F3028', 6, 0.5),
  deer: dot(199, 270, 8, '#FFF3DC') + dot(244, 292, 7, '#FFF3DC') + dot(288, 270, 6, '#FFF3DC'),
  zombie: line('M215 264 l18 12 m-9 -21 v19 M281 145 l18 12 m-9 -21 v19', '#4F6B45', 6, 0.75),
  slime: dot(181, 209, 12, '#DFFFF8', 0.72) + dot(335, 236, 7, '#DFFFF8', 0.62) + line('M175 169 q39 -31 79 -25', '#FFFFFF', 10, 0.62),
  bat: line('M120 233 l92 35 m180 -35 -92 35', '#D7C5EE', 7, 0.45),
  skeleton: line('M229 283 h55 M229 306 h55 M256 266 v60', '#FFFFFF', 6, 0.34),
  goblin: line('M126 226 l58 18 m202 -18 -58 18', '#DDF0B7', 6, 0.55) + dot(210, 189, 5),
  kobold: line('M354 166 v82', '#FFFFFF', 6, 0.32) + line('M228 179 q28 -18 55 -6', '#F5C39D', 7, 0.42),
  imp: line('M143 218 l65 34 m161 -34 -65 34', '#FFCAD2', 6, 0.42) + dot(257, 176, 5, '#FFD8DE'),
  mandrake: line('M207 235 q45 -24 91 -4', '#F4DEAF', 8, 0.4) + line('M208 117 l-22 -18 m70 10 v-28 m52 36 24 -20', '#D8F0A4', 6, 0.55),
  orc: line('M199 265 q58 -25 112 -6', '#C7E5A8', 8, 0.42) + line('M222 330 h68', '#3F5730', 6, 0.45),
  mummy: line('M206 176 q49 -13 98 1 M204 287 q53 15 104 0 M205 318 q52 14 102 0', '#FFFFFF', 6, 0.35),
  hedgehog: line('M157 270 l20 -30 m10 21 19 -36 m15 29 18 -38 m18 42 18 -35', '#D6B792', 6, 0.45),
  ghost: line('M166 209 q23 -31 57 -34', '#FFFFFF', 8, 0.7) + dot(183, 196, 7, '#FFFFFF', 0.72),
  rhino: line('M184 267 q55 -20 111 -5', '#D3DCE2', 8, 0.44) + line('M398 204 l8 33', '#FFFFFF', 6, 0.5),
  leopard: dot(195, 268, 7, '#3D2D20', 0.72) + dot(240, 290, 6, '#3D2D20', 0.72) + dot(286, 268, 7, '#3D2D20', 0.72),
  wolf: line('M178 278 q56 -25 111 -7', '#C4CCD6', 8, 0.4) + line('M194 241 l19 -18 m15 12 20 -20 m16 22 18 -18', '#515B66', 6, 0.54),
  farmer: line('M157 180 q97 -37 192 1', '#FFF4C9', 8, 0.55) + line('M218 300 v49 m76 -49 v49', '#D4E3F2', 6, 0.42),
  siren2: line('M213 291 q42 -18 84 -4', '#B9FFF2', 8, 0.45) + line('M349 209 q25 -8 39 9', '#FFFFFF', 6, 0.55),
  squirrelKeeper: line('M337 318 q37 -2 52 -30', '#FFC9A6', 8, 0.44) + line('M205 278 q41 -20 82 -5', '#A9C99E', 7, 0.36),
  troll: line('M194 266 q61 -28 122 -6', '#C0DCAD', 9, 0.38) + fill('M202 230 q26 -25 48 -5 q22 -17 48 3 q-42 18 -96 2Z', '#6A934F', 0.5),
  ogre: line('M190 269 q62 -27 124 -6', '#D4DFBC', 9, 0.38) + dot(410, 163, 8, '#D9B783', 0.6),
  werewolf: line('M188 262 q59 -25 115 -5', '#C9BDD4', 8, 0.38) + line('M360 350 l16 18 m0 -30 18 17 m-206 46 -15 16', '#FFFFFF', 6, 0.42),
  vampire: line('M217 154 q40 -21 78 0', '#FFFFFF', 7, 0.35) + line('M201 269 l55 32 55 -32', '#7B6E88', 6, 0.46),
  centaur: line('M165 303 q52 -24 104 -8', '#F4D5A8', 8, 0.42) + line('M282 210 q29 -13 51 2', '#F5DFC4', 6, 0.5),
  tiger: line('M191 260 v35 m43 -43 v41 m44 -38 v37 m41 -31 v32', '#3D2B20', 7, 0.64),
  elephant: line('M181 270 q54 -21 108 -6', '#D6DEE5', 8, 0.42) + line('M367 239 q30 -14 54 2', '#FFFFFF', 7, 0.32),
  gargoyle3: line('M174 223 l36 52 m128 -52 -36 52', '#D6DCE2', 7, 0.36) + line('M204 303 q49 20 98 0', '#69737E', 6, 0.55),
  siren3: line('M139 212 l73 43 m161 -43 -73 43', '#D1F7FF', 7, 0.43) + dot(256, 165, 7, '#FFFFFF', 0.65),
  knight: line('M219 174 q37 -17 73 -2', '#FFFFFF', 8, 0.45) + line('M208 274 h95 M256 252 v101', '#FFFFFF', 6, 0.22),
  sporeShroom: line('M128 206 q61 -65 130 -68', '#DCC7EE', 9, 0.55) + dot(175, 184, 7, '#F2E4FF'),
  giant: line('M198 260 q58 -26 115 -7', '#E4C3A2', 9, 0.38) + line('M99 342 q14 -16 30 -5 m254 5 q14 -16 30 -5', '#F2D6B7', 7, 0.4),
  whale: line('M159 245 q68 -34 142 -20', '#CDEEFF', 10, 0.48) + dot(181, 218, 8, '#FFFFFF', 0.65),
  boa: line('M163 285 q51 -28 103 -11 m20 73 q40 -12 68 7', '#D9EDB6', 8, 0.42) + dot(190, 260, 6),
  gargoyle4: line('M129 205 l80 58 m174 -58 -80 58', '#DDE2E6', 8, 0.38) + line('M213 300 q45 17 90 0', '#68717A', 6, 0.52),
  lich: line('M218 159 q38 -21 74 -2', '#D9F7FF', 7, 0.4) + dot(256, 127, 7, '#7FE0D4', 0.85),
  witch: line('M190 163 q56 -28 109 -7', '#CBB7E7', 8, 0.46) + dot(350, 275, 8, '#B7F2DA', 0.72),
  alchemist: line('M209 176 q46 -22 92 -1', '#FFFFFF', 7, 0.42) + dot(215, 334, 7, '#B9FFF2') + dot(248, 336, 7, '#FFC1CE') + dot(280, 334, 7, '#FFF1A8'),
  banshee: line('M168 207 q28 -40 67 -42', '#FFFFFF', 9, 0.62) + line('M176 302 q74 20 148 0', '#D8E8F4', 7, 0.4),
  chimera: line('M178 282 q51 -25 100 -7', '#F5C984', 8, 0.38) + dot(320, 216, 5, '#FFFFFF') + dot(387, 244, 5, '#FFFFFF'),
  golem: line('M181 246 l39 -17 m10 33 46 -20 m16 30 38 -16', '#D8C7A8', 8, 0.36) + line('M208 321 h94', '#5E5042', 6, 0.4),
  necromancer: line('M207 163 q43 -21 82 -4', '#AEEBE0', 7, 0.36) + dot(369, 174, 8, '#7FE0D4', 0.8),
  slimeQueen: line('M171 177 q43 -38 89 -31', '#FFFFFF', 10, 0.57) + dot(179, 214, 10, '#DFFFF8') + dot(334, 232, 7, '#DFFFF8'),
  cerberus: line('M177 270 q57 -25 112 -7', '#BFB5CD', 8, 0.35) + dot(311, 218, 4, '#FFFFFF') + dot(379, 244, 4, '#FFFFFF') + dot(342, 315, 4, '#FFFFFF'),
  basilisk: line('M235 284 q52 -20 101 -2', '#B4E8BE', 8, 0.42) + line('M348 207 q39 -19 75 -3', '#FF9BAE', 7, 0.4),
  dullahan: line('M193 253 q62 -25 122 -3', '#AFA9BC', 8, 0.36) + line('M373 197 l14 -35', '#FFFFFF', 6, 0.45),
  phoenix: line('M128 201 l82 54 m174 -54 -82 54', '#FFF4B8', 9, 0.52) + line('M251 137 q12 -22 17 -43', '#FFF1A8', 7, 0.62),
  demon: line('M132 204 l76 48 m172 -48 -76 48', '#FF9BAD', 8, 0.35) + line('M222 255 q36 -16 70 -2', '#F17B8E', 7, 0.36),
  angel: line('M121 201 l88 51 m182 -51 -88 51', '#CFE7F7', 8, 0.46) + line('M226 126 q30 -10 60 0', '#FFFFFF', 6, 0.72),
  captain: line('M210 176 q43 -18 82 -1', '#FFFFFF', 8, 0.44) + line('M352 180 v103', '#FFE9A4', 7, 0.38),
  priest: line('M207 169 q42 -20 84 -2', '#FFFFFF', 8, 0.46) + dot(364, 219, 8, '#FFF0A8', 0.72),
  kraken: line('M190 182 q45 -31 89 -22', '#D4C6F0', 9, 0.45) + dot(181, 217, 8, '#FFFFFF', 0.58),
  drake: line('M137 205 l80 55 m174 -55 -80 55', '#D8B7ED', 8, 0.4) + line('M182 314 q56 -22 109 -6', '#C995DC', 7, 0.36),
  vermillionBird: line('M128 201 l82 55 m174 -55 -82 55', '#FFD4B0', 9, 0.48) + dot(253, 142, 6, '#FFF1A8'),
  dragonrider: line('M126 209 l82 54 m176 -54 -82 54', '#E0C1F2', 8, 0.4) + line('M303 211 l44 -79', '#FFFFFF', 6, 0.45),
  hydra: line('M155 191 q20 -17 39 -3 M248 170 q20 -18 40 -2 M335 190 q19 -16 38 -2', '#C7FFF1', 7, 0.42),
  sphinx: line('M139 204 l70 47 m164 -47 -70 47', '#FFE6A8', 8, 0.44) + line('M232 190 q44 -23 87 -4', '#FFFFFF', 7, 0.4),
  behemoth: line('M183 287 q57 -22 111 -6', '#C5A676', 9, 0.38) + line('M176 248 l19 -22 m14 18 18 -26 m18 27 18 -24', '#D4B88A', 7, 0.4),
  leviathan: line('M161 243 q50 -36 105 -26 m21 -14 q31 -11 57 -3', '#BDE6F6', 9, 0.42) + dot(183, 220, 7),
  cyclops: line('M204 262 q52 -24 103 -6', '#D9B58E', 9, 0.38) + dot(258, 184, 6, '#FFFFFF', 0.82),
  fenrir: line('M174 258 q60 -28 120 -11', '#C7D0DB', 9, 0.4) + line('M146 296 l-23 17 m202 -28 25 17', '#D9A94E', 6, 0.46),
  minotaur: line('M199 164 q57 -29 112 -4', '#E2BE99', 8, 0.42) + line('M184 279 q63 -25 123 -7', '#C69670', 7, 0.34),
  unicorn: line('M173 270 q56 -25 112 -8', '#FFFFFF', 9, 0.56) + line('M382 117 l13 -31', '#FFF3A8', 6, 0.64),
  merlin: line('M206 162 q48 -24 95 -5', '#C9D7FF', 8, 0.44) + dot(362, 194, 6, '#FFF3A8', 0.8),
  boneDragon: line('M126 208 l85 54 m175 -54 -85 54', '#FFFFFF', 7, 0.32) + line('M189 310 q54 -17 108 -5', '#D8D2C0', 6, 0.4),
  slimeMini: line('M192 251 q34 -29 69 -22', '#FFFFFF', 8, 0.54) + dot(202, 277, 7, '#DFFFF8'),
};

function familyFor(key) {
  if (CONSTRUCT.has(key)) return 'construct';
  if (AMORPHOUS.has(key)) return 'amorphous';
  if (AQUATIC.has(key)) return 'aquatic';
  if (FLYER.has(key)) return 'flyer';
  if (HUMANOID.has(key)) return 'humanoid';
  return 'beast';
}

export const PREMIUM_KEYS = Object.keys(KEY_TIER);

export function premiumMarkup(key) {
  const family = familyFor(key);
  return `<g class="premium-detail premium-${family}" pointer-events="none">`
    + FAMILY_HIGHLIGHT[family]
    + (SIGNATURE[key] || '')
    + '</g>';
}

export function premiumTier(key) {
  return KEY_TIER[key] || 1;
}
