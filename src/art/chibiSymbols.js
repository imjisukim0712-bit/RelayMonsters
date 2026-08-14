// Relay Monsters chibi vector system.
// The concept board is the implementation target: oversized readable silhouettes,
// navy ink, rounded limbs, expressive faces, and material-specific highlights.

const OUT = '#25314A';
const NS = 'stroke="none"';

const P = (d, fill, extra = '') => `<path d="${d}" fill="${fill}" ${extra}/>`;
const C = (cx, cy, r, fill, extra = '') => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" ${extra}/>`;
const E = (cx, cy, rx, ry, fill, extra = '') => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" ${extra}/>`;
const R = (x, y, w, h, rx, fill, extra = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" ${extra}/>`;
const line = (d, color = OUT, width = 12, extra = '') => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;
const band = (d, width, color) => line(d, OUT, width + 16) + line(d, color, width);
const eye = (x, y, s = 1, mood = 'happy') => {
  if (mood === 'cyclops') return C(x, y, 28 * s, '#F9F4D8', `stroke="${OUT}" stroke-width="10"`) + C(x + 3, y + 2, 12 * s, '#25314A', NS) + C(x - 2, y - 4, 4 * s, '#FFFFFF', NS);
  const tilt = mood === 'angry' ? ` transform="rotate(${x < 256 ? 12 : -12} ${x} ${y})"` : '';
  return E(x, y, 23 * s, 27 * s, '#FFFFFF', `stroke="${OUT}" stroke-width="10"${tilt}`)
    + C(x + 3 * s, y + 3 * s, 10 * s, '#25314A', NS)
    + C(x - 2 * s, y - 5 * s, 4 * s, '#FFFFFF', NS);
};
const mouth = (x, y, mood = 'happy') => mood === 'angry'
  ? line(`M${x - 22} ${y + 8} q22 -16 44 0`, OUT, 9)
  : P(`M${x - 26} ${y - 4} q26 38 52 0 q-4 48 -26 48 q-22 0 -26 -48Z`, '#7B2948') + P(`M${x - 13} ${y + 24} q13 10 26 0`, '#FF8FA3', NS);
const blush = (x, y) => E(x, y, 18, 9, '#F58FA4', `${NS} opacity=".72"`);
const shine = (d) => line(d, '#FFFFFF', 11, 'opacity=".78"');
const spots = (points, color = '#FFF1B8') => points.map(([x, y, r]) => C(x, y, r, color, NS)).join('');

function mushroom({ cap = '#E84B45', body = '#F6E9C8', spotsColor = '#FFF2B8', spores = false } = {}) {
  return [
    band('M207 338 q-46 12 -62 56 q-8 20 -28 6 q-17 -13 2 -30 q13 -10 29 -1', 18, body),
    band('M305 338 q46 12 62 56 q8 20 28 6 q17 -13 -2 -30 q-13 -10 -29 -1', 18, body),
    band('M222 371 q-20 35 -46 58', 24, body), band('M290 371 q20 35 46 58', 24, body),
    E(256, 304, 76, 92, body),
    P('M100 245 Q120 101 256 92 Q392 101 412 245 Q360 278 256 278 Q152 278 100 245Z', cap),
    line('M112 236 Q256 286 400 236', OUT, 12),
    spots([[166, 179, 23], [256, 132, 20], [344, 180, 24]], spotsColor),
    eye(225, 304, .8), eye(287, 304, .8),
    line('M238 337 q18 18 36 0', OUT, 9),
    shine('M132 204 Q164 128 218 116'),
    spores ? spots([[132, 106, 8], [374, 92, 10], [402, 132, 7]], '#D8B8FF') : '',
  ].join('');
}

function boar() {
  return [
    band('M139 276 q-36 -4 -45 -36 q-6 -24 14 -28 q20 -3 24 19', 18, '#8E552F'),
    band('M172 340 l-3 75', 28, '#86502F'), band('M242 342 l-2 75', 28, '#86502F'),
    band('M304 337 l7 78', 28, '#A96A35'), band('M366 326 l13 78', 28, '#A96A35'),
    R(120, 205, 255, 158, 67, '#9C5B2D'),
    P('M152 213 l18 -47 l24 40 l22 -52 l27 48 l25 -45 l20 53Z', '#5E3A2A'),
    E(360, 260, 77, 73, '#B46D37'),
    P('M328 202 l-18 -53 l55 35Z', '#9C5B2D'), P('M390 200 l30 -45 l15 63Z', '#9C5B2D'),
    E(416, 282, 47, 36, '#C68650'), C(399, 281, 7, '#25314A', NS), C(428, 285, 7, '#25314A', NS),
    eye(362, 243, .72, 'angry'),
    P('M398 296 q17 51 53 15 q-7 54 -47 44Z', '#FFF0C8'), P('M427 294 q20 34 45 5 q-3 44 -37 43Z', '#FFF0C8'),
    shine('M165 232 q56 -30 112 -10'),
  ].join('');
}

function deer() {
  return [
    band('M142 271 q-39 -27 -49 7', 14, '#E8A957'),
    [174, 230, 306, 355].map((x, i) => band(`M${x} 337 l${i % 2 ? 4 : -4} 78`, 22, '#D7974E')).join(''),
    E(250, 285, 132, 73, '#E4A24E'),
    band('M345 275 q38 -24 28 -84', 30, '#E0A052'),
    E(384, 169, 55, 48, '#E6A957'),
    P('M350 144 l-28 -37 l46 15Z', '#C78342'), P('M410 142 l34 -34 l-8 50Z', '#C78342'),
    band('M374 131 q-35 -40 -26 -76 M350 85 l-27 -20 M351 99 l31 -30', 9, '#8A5A39'),
    band('M397 127 q32 -38 22 -76 M418 80 l24 -22 M417 94 l-29 -25', 9, '#8A5A39'),
    eye(397, 165, .72),
    E(424, 188, 31, 23, '#D28B48'), C(437, 187, 6, '#25314A', NS),
    spots([[180, 262, 10], [221, 242, 9], [264, 270, 11], [303, 246, 8]], '#FFF0BE'),
    shine('M161 246 q55 -30 110 -19'),
  ].join('');
}

function zombie() {
  return [
    band('M207 354 l-15 68', 28, '#5E7A73'), band('M305 354 l15 68', 28, '#5E7A73'),
    E(184, 426, 42, 19, '#2E4054'), E(328, 426, 42, 19, '#2E4054'),
    R(177, 233, 158, 147, 37, '#5B806B'),
    P('M194 242 h124 l-17 130 h-90Z', '#3F5A4B'), line('M256 242 v128', '#D8C5A0', 8),
    band('M181 270 q-50 14 -78 -5', 24, '#6C936F'), band('M331 270 q50 14 78 -5', 24, '#6C936F'),
    C(93, 264, 22, '#6C936F'), C(419, 264, 22, '#6C936F'),
    R(176, 99, 160, 147, 46, '#759B74'),
    P('M192 107 q30 -35 63 -3 q30 -34 66 5 v27 H192Z', '#E38B9B'), line('M210 112 q15 18 30 0 q14 18 29 0 q15 18 31 0', '#9D5269', 7),
    eye(220, 164, .75), eye(291, 164, .75, 'angry'),
    line('M236 207 q20 12 40 -2', OUT, 9), line('M202 137 l25 17 M303 133 l-23 18', OUT, 7),
    line('M191 195 l20 5 M201 185 l-3 20 M307 199 l20 -4', '#465E50', 6),
  ].join('');
}

function slime({ color = '#69D8C8', dark = '#43B7A9', crown = false, mini = false } = {}) {
  const top = mini ? 184 : 91;
  const bottom = mini ? 416 : 425;
  const left = mini ? 139 : 82;
  const right = mini ? 373 : 430;
  const eY = mini ? 294 : 276;
  return [
    P(`M256 ${top} C158 ${top} ${left} 215 ${left} 330 C${left} ${bottom - 16} 126 ${bottom} 176 ${bottom} C210 ${bottom} 228 ${bottom - 17} 256 ${bottom - 17} C284 ${bottom - 17} 302 ${bottom} 336 ${bottom} C386 ${bottom} ${right} ${bottom - 16} ${right} 330 C${right} 215 354 ${top} 256 ${top}Z`, color),
    P(`M${left + 33} 316 q34 28 63 0 q34 38 67 0 q30 38 64 0 q30 32 64 2 v62 q-38 45 -96 27 q-54 23 -100 -8 q-61 15 -95 -26Z`, dark, `${NS} opacity=".7"`),
    eye(207, eY, mini ? .72 : .92), eye(305, eY, mini ? .72 : .92),
    mouth(256, eY + 61), blush(151, eY + 40), blush(361, eY + 40),
    shine(`M${left + 58} ${top + 92} q35 -70 105 -72`),
    C(left + 95, top + 75, 15, '#DFFFF9', `${NS} opacity=".82"`), C(right - 64, top + 124, 10, '#DFFFF9', `${NS} opacity=".72"`),
    crown ? P('M188 118 l22 -70 l47 50 l48 -50 l23 70Z', '#F5C84B') + spots([[218, 83, 8], [256, 73, 9], [298, 83, 8]], '#FFF5B8') : '',
  ].join('');
}

function humanoid(c) {
  const skin = c.skin || '#D7A06D';
  const cloth = c.cloth || '#526D8A';
  const accent = c.accent || '#D9B553';
  const mood = c.mood || 'happy';
  const headY = c.headY || 161;
  const bodyTop = 231;
  let extras = '';
  if (c.feature === 'skeleton') extras += line('M220 156 h72 M236 178 h40', '#8B7E69', 7) + line('M224 285 h64 M232 310 h48 M240 335 h32', '#D8CDB5', 10);
  if (c.feature === 'goblin') extras += P('M189 153 l-66 -31 l55 68Z', skin) + P('M323 153 l66 -31 l-55 68Z', skin) + P('M232 202 l10 24 l12 -21', '#FFF0C8');
  if (c.feature === 'kobold') extras += P('M194 143 l-34 -55 l57 30Z', skin) + P('M318 143 l34 -55 l-57 30Z', skin) + band('M326 312 q68 10 86 61', 13, skin);
  if (c.feature === 'orc') extras += P('M207 205 q-30 49 -43 3 q25 20 49 -2Z', '#FFF0C8') + P('M305 205 q30 49 43 3 q-25 20 -49 -2Z', '#FFF0C8');
  if (c.feature === 'mummy') extras += [118, 148, 181, 258, 292, 328].map(y => line(`M190 ${y} q66 20 132 0`, '#E7D8B8', 17)).join('');
  if (c.feature === 'brain') extras += P('M194 116 q20 -45 48 -18 q24 -42 49 -5 q28 -20 35 21 v20H194Z', '#E28A9D');
  if (c.feature === 'hat') extras += P('M165 132 q91 -56 182 0 q-39 25 -91 25 q-52 0 -91 -25Z', accent) + P('M209 127 q15 -84 47 -104 q39 41 48 105Z', cloth);
  if (c.feature === 'helmet' || c.feature === 'captain') extras += P('M176 169 q4 -94 80 -102 q76 8 80 102 l-31 -8 q-49 -19 -98 0Z', cloth) + P('M244 66 l12 -37 l15 38Z', accent);
  if (c.feature === 'horns' || c.feature === 'minotaur') extras += P('M194 121 q-61 -34 -50 -84 q20 44 67 54Z', '#EFE2C0') + P('M318 121 q61 -34 50 -84 q-20 44 -67 54Z', '#EFE2C0');
  if (c.feature === 'cyclops') extras += eye(256, 161, 1.05, 'cyclops');
  if (c.feature === 'vampire') extras += P('M188 232 l68 66 l68 -66 l34 154 H154Z', '#3A3159') + P('M226 207 l10 30 l12 -28 M286 207 l-10 30 l-12 -28', '#FFF0C8');
  if (c.feature === 'lich' || c.feature === 'necro') extras += C(256, 153, 67, '#D8D2C0') + C(231, 158, 11, '#70F0D1', NS) + C(281, 158, 11, '#70F0D1', NS) + P('M178 229 l78 58 l78 -58 l35 161 H143Z', cloth);
  if (c.feature === 'dullahan') extras += C(371, 184, 52, '#D8D2C0') + line('M343 194 q28 18 56 0', OUT, 8);
  if (c.feature === 'golem') extras += line('M184 140 l30 -46 l42 19 l44 -21 l31 50', '#8E8B82', 22) + line('M219 286 l37 35 l37 -35', '#71E2D0', 12);
  if (c.feature === 'angel') extras += E(256, 63, 55, 16, '#F5D85B', 'fill="none" stroke-width="12"') + P('M173 263 q-97 -66 -106 30 q48 -17 92 52Z', '#F3F0E1') + P('M339 263 q97 -66 106 30 q-48 -17 -92 52Z', '#F3F0E1');
  if (c.feature === 'demon' || c.feature === 'imp') extras += P('M185 124 q-45 -50 -42 -90 q35 43 77 54Z', '#8B2F4B') + P('M327 124 q45 -50 42 -90 q-35 43 -77 54Z', '#8B2F4B') + P('M180 282 q-80 10 -93 88 q53 -20 90 29Z', '#A33B57') + P('M332 282 q80 10 93 88 q-53 -20 -90 29Z', '#A33B57');
  if (c.feature === 'siren') extras += P('M181 133 q75 -91 150 0 q-34 -16 -55 3 q-30 -31 -95 -3Z', '#3D8E9D') + P('M206 373 q50 22 100 0 q-10 56 -50 75 q-40 -19 -50 -75Z', '#4DBBAE');
  if (c.feature === 'merlin') extras += P('M176 127 q80 -45 160 0 q-38 22 -80 22 q-42 0 -80 -22Z', '#375DA8') + P('M205 120 q18 -91 51 -112 q50 48 60 113Z', '#375DA8') + P('M197 196 q59 75 118 0 q0 113 -59 129 q-59 -16 -59 -129Z', '#F3F0E1');
  const standardEyes = c.feature === 'cyclops' || c.feature === 'lich' || c.feature === 'necro' ? '' : eye(224, headY, .75, mood) + eye(288, headY, .75, mood);
  const weapon = c.weapon === 'staff' ? band('M382 215 l-2 211', 13, '#835A39') + C(381, 194, 27, accent)
    : c.weapon === 'sword' ? P('M360 179 l27 -32 l12 39 l-77 150 l-22 -13Z', '#D8E4EC') + R(295, 322, 78, 19, 8, accent)
      : c.weapon === 'fork' ? band('M377 219 l9 206', 11, '#6E4A39') + line('M360 211 l17 -42 l18 38 l17 -42', accent, 10)
        : '';
  return [
    band('M210 354 l-13 70', 29, cloth), band('M302 354 l13 70', 29, cloth),
    E(188, 428, 43, 19, '#28384E'), E(324, 428, 43, 19, '#28384E'),
    R(171, bodyTop, 170, 151, 43, cloth), P(`M205 ${bodyTop} h102 l-18 151 h-66Z`, c.inner || '#E5D6B8'),
    band('M175 267 q-48 18 -73 59', 25, skin), band('M337 267 q48 18 73 59', 25, skin), C(94, 336, 22, skin), C(418, 336, 22, skin),
    R(177, 91, 158, 142, 52, skin),
    standardEyes, c.feature === 'cyclops' ? '' : line('M235 203 q21 16 42 0', OUT, 9),
    C(256, 259, 11, accent, NS), C(256, 299, 10, accent, NS),
    extras, weapon,
    shine('M191 255 q22 -24 48 -17'),
  ].join('');
}

function beast(c) {
  const body = c.body || '#B87945';
  const belly = c.belly || '#DDAE78';
  const feature = c.feature || '';
  const headX = feature === 'elephant' ? 365 : 374;
  let extras = '';
  if (feature === 'hedgehog') extras += P('M115 298 l28 -73 l25 35 l27 -61 l27 49 l35 -58 l24 60 l40 -36 l10 89Z', '#76513A');
  if (feature === 'rhino') extras += P('M403 218 l58 -53 l-17 75Z', '#EFE2C0');
  if (feature === 'spots') extras += spots([[173, 270, 13], [221, 235, 10], [258, 289, 12], [306, 247, 9], [348, 296, 11]], '#5F3B2B');
  if (feature === 'stripes') extras += [170, 218, 270, 320].map(x => line(`M${x} 226 q-15 33 -4 66`, '#56362E', 13)).join('');
  if (feature === 'wolf' || feature === 'fenrir') extras += P('M340 183 l13 -69 l42 51Z', body) + P('M389 178 l48 -58 l-8 75Z', body) + P('M196 224 q46 -72 94 -5Z', '#5B6577');
  if (feature === 'elephant') extras += P('M397 249 q57 48 15 125 q-23 22 -40 1 q35 -24 13 -96Z', body) + P('M333 210 q-63 -33 -65 40 q25 49 73 37Z', '#D39A8A');
  if (feature === 'cerberus') extras += E(298, 197, 52, 49, body) + E(409, 202, 52, 49, body) + eye(286, 192, .53, 'angry') + eye(421, 195, .53, 'angry');
  if (feature === 'chimera') extras += P('M201 218 q-30 -71 -69 -30 q38 20 47 68Z', '#B66C52') + band('M145 279 q-71 9 -66 78 q33 -24 57 8', 16, '#7B4E38');
  if (feature === 'wings' || feature === 'rider' || feature === 'bone') extras += P('M189 234 q-92 -108 -131 -9 q58 -9 107 67Z', feature === 'bone' ? '#D9D1BC' : c.wing || '#6883A7') + P('M290 228 q78 -116 142 -27 q-65 5 -119 83Z', feature === 'bone' ? '#D9D1BC' : c.wing || '#6883A7');
  if (feature === 'unicorn') extras += P('M377 148 l23 -89 l24 96Z', '#F4CF54') + P('M338 167 q-34 -49 -63 -12 q39 1 58 34Z', '#A98BCE');
  if (feature === 'sphinx') extras += P('M337 165 q38 -58 79 -10 l-8 61Z', '#D39B4E') + P('M130 239 q-79 -75 -91 7 q51 -9 91 53Z', '#C49B55');
  if (feature === 'behemoth') extras += P('M336 176 q-4 -74 48 -94 q-12 62 33 98Z', '#6C5847') + P('M205 224 q-49 -59 -88 -7 q46 0 76 45Z', '#6C5847');
  if (feature === 'minotaur') extras += P('M341 177 q-58 -68 -78 -7 q34 -17 76 33Z', '#EEE0C2');
  if (feature === 'rider') extras += humanoid({ skin: '#E1B080', cloth: '#4F6291', accent: '#E4BE4B', feature: 'helmet', weapon: 'sword' }).replace(/<[^>]+(?:x|cx|d)="[^"]+"[^>]*>/g, '');
  const mood = c.mood || (['wolf', 'fenrir', 'behemoth', 'stripes'].includes(feature) ? 'angry' : 'happy');
  return [
    band('M126 280 q-42 -27 -48 15', 15, body),
    [166, 225, 307, 360].map((x, i) => band(`M${x} 341 l${i % 2 ? 4 : -4} 77`, 25, body)).join(''),
    E(250, 287, 142, 82, body), E(251, 312, 94, 42, belly, NS),
    band(`M334 278 q34 -34 ${headX - 334} -78`, 28, body),
    E(headX, 181, 61, 54, body), E(418, 205, 42, 30, belly),
    P(`M${headX - 36} 151 l-24 -44 l49 20Z`, body), P(`M${headX + 24} 150 l38 -37 l-3 54Z`, body),
    eye(391, 176, .65, mood), C(432, 205, 7, '#25314A', NS),
    extras, shine('M151 254 q56 -39 117 -25'),
  ].join('');
}

function flyer(c) {
  const body = c.body || '#7452A4';
  const wing = c.wing || body;
  const fire = c.feature === 'fire';
  return [
    P('M220 244 Q115 124 53 235 Q120 231 174 319Z', wing),
    P('M292 244 Q397 124 459 235 Q392 231 338 319Z', wing),
    fire ? P('M153 276 q-72 44 -49 111 q20 -40 49 -23 q-6 -41 27 -69Z', '#F15A42') + P('M359 276 q72 44 49 111 q-20 -40 -49 -23 q6 -41 -27 -69Z', '#F15A42') : '',
    E(256, 289, 82, 100, body),
    C(256, 181, 75, body),
    P('M202 143 l-22 -57 l55 37Z', body), P('M310 143 l22 -57 l-55 37Z', body),
    eye(226, 181, .72, c.mood || 'happy'), eye(286, 181, .72, c.mood || 'happy'),
    line('M239 220 q17 15 34 0', OUT, 9),
    band('M225 375 l-22 42', 16, '#D6A34C'), band('M287 375 l22 42', 16, '#D6A34C'),
    shine('M213 253 q38 -34 76 -8'),
  ].join('');
}

function serpent(c) {
  const body = c.body || '#5AA783';
  const accent = c.accent || '#A8D68B';
  const heads = c.heads || 1;
  const necks = heads === 3
    ? band('M214 323 q-64 -80 -26 -166', 37, body) + band('M256 315 q0 -117 0 -178', 39, body) + band('M298 323 q64 -80 26 -166', 37, body)
    : band('M303 318 q78 -61 54 -164', 45, body);
  const headMarkup = heads === 3
    ? [190, 256, 322].map((x, i) => E(x, 137 + (i % 2) * 12, 48, 42, body) + eye(x + 12, 135 + (i % 2) * 12, .53, 'angry')).join('')
    : E(366, 137, 61, 51, body) + eye(383, 132, .66, c.mood || 'angry');
  return [
    band('M128 342 q68 78 156 39 q75 -33 121 35 q-87 45 -179 7 q-84 -31 -127 11', 54, body),
    necks, headMarkup,
    P('M339 110 l-13 -48 l40 35Z', body), P('M387 108 l34 -40 l-4 55Z', body),
    [165, 221, 283, 341].map(x => line(`M${x} 385 q20 18 40 0`, accent, 9)).join(''),
    c.feature === 'basilisk' ? P('M337 92 l29 -50 l25 51 l34 -31 l-4 61Z', '#E3C44F') : '',
    shine('M117 365 q53 39 105 24'),
  ].join('');
}

function aquatic(c) {
  const body = c.body || '#559FC2';
  if (c.feature === 'kraken') return [
    E(256, 190, 111, 104, body),
    eye(217, 181, .82, 'angry'), eye(295, 181, .82, 'angry'),
    [130, 180, 230, 282, 332, 382].map((x, i) => band(`M${x} 257 q${i < 3 ? -45 : 45} 69 ${i < 3 ? -16 : 16} 155`, 25, body)).join(''),
    spots([[201, 113, 10], [250, 91, 12], [305, 117, 9]], '#8BE1D3'), shine('M180 132 q55 -43 108 -16'),
  ].join('');
  return [
    P('M80 284 Q130 154 291 157 Q403 157 450 244 Q397 339 278 350 Q142 361 80 284Z', body),
    P('M102 280 l-73 -55 q12 70 60 91Z', body),
    P('M292 162 q39 -73 91 -36 q-47 23 -66 61Z', c.fin || '#7BC7D7'),
    eye(376, 230, .78, c.mood || 'happy'),
    line('M396 276 q22 13 40 -4', OUT, 9),
    c.feature === 'leviathan' ? P('M162 196 l24 -71 l36 62 l39 -80 l34 72Z', '#315D82') : '',
    shine('M145 229 q77 -70 159 -49'),
  ].join('');
}

function dragonRider() {
  return [
    P('M206 245 Q117 105 45 206 Q128 210 181 303Z', '#405B78'),
    P('M294 245 Q383 105 467 205 Q380 208 331 303Z', '#405B78'),
    band('M122 313 q-53 16 -66 75', 16, '#486D78'),
    [172, 231, 307, 364].map((x, i) => band(`M${x} 346 l${i % 2 ? 6 : -6} 71`, 24, '#527B82')).join(''),
    E(260, 303, 144, 76, '#527B82'), E(261, 324, 92, 35, '#7FA5A4', NS),
    band('M337 283 q42 -30 35 -87', 28, '#527B82'),
    E(383, 180, 58, 49, '#527B82'), E(424, 201, 36, 25, '#7FA5A4'),
    P('M351 148 l-10 -58 l41 43Z', '#527B82'), P('M397 141 l34 -51 l-2 69Z', '#527B82'),
    eye(395, 178, .62, 'angry'), C(438, 201, 6, '#25314A', NS),
    R(190, 165, 92, 90, 26, '#405A8B'),
    band('M205 239 l-27 57', 16, '#D6A576'), band('M267 238 l30 55', 16, '#D6A576'),
    C(236, 139, 42, '#D6A576'),
    P('M192 148 q6 -68 44 -73 q42 7 47 73 q-50 -22 -91 0Z', '#667998'),
    P('M225 75 l12 -40 l16 41Z', '#E6BE4C'), eye(246, 138, .48, 'angry'),
    band('M309 93 l82 281', 11, '#7D5A3B'), P('M304 80 l-8 -43 l34 29Z', '#E4C15B'),
    R(169, 245, 136, 24, 12, '#A36B43'), shine('M149 281 q59 -34 115 -24'),
  ].join('');
}

function sphinx() {
  return [
    P('M183 255 q-105 -113 -145 -13 q68 -17 127 79Z', '#D5A553'),
    P('M283 244 q85 -122 169 -35 q-73 15 -135 103Z', '#D5A553'),
    band('M127 292 q-51 -25 -57 24', 15, '#C98E42'),
    [162, 225, 302, 358].map((x, i) => band(`M${x} 345 l${i % 2 ? 5 : -5} 73`, 25, '#D29A4B')).join(''),
    E(247, 299, 145, 78, '#D29A4B'), E(247, 320, 97, 37, '#EBCB82', NS),
    band('M337 283 q37 -29 30 -80', 27, '#D29A4B'),
    P('M317 184 q50 -94 112 0 l-16 94 h-80Z', '#315A82'),
    P('M324 176 l-28 -47 l45 6 l33 -45 l34 45 l45 -6 l-28 47Z', '#E3B748'),
    E(374, 185, 54, 50, '#D9A778'), eye(356, 183, .59), eye(393, 183, .59),
    line('M361 218 q13 10 27 0', OUT, 7), P('M346 228 l28 28 l28 -28', '#315A82'),
    shine('M142 270 q56 -38 113 -26'),
  ].join('');
}

function behemoth() {
  return [
    band('M105 294 q-47 -24 -62 16', 20, '#5E4C40'),
    [142, 220, 318, 392].map((x, i) => band(`M${x} 334 l${i % 2 ? 6 : -6} 87`, 36, '#645345')).join(''),
    E(250, 284, 177, 100, '#645345'), E(251, 320, 117, 46, '#8C765E', NS),
    P('M117 214 l21 -76 l43 65 l41 -91 l46 83 l49 -88 l32 98 l49 -62 l11 87Z', '#473B35'),
    band('M355 280 q43 -31 39 -87', 37, '#645345'),
    E(409, 178, 72, 61, '#645345'), E(450, 207, 44, 31, '#8C765E'),
    P('M373 150 q-46 -51 -54 0 q35 -5 63 32Z', '#E6D5B4'), P('M426 141 q45 -59 60 -7 q-37 0 -58 36Z', '#E6D5B4'),
    eye(424, 177, .72, 'angry'), C(462, 206, 7, '#25314A', NS),
    P('M432 222 q21 41 48 4 q-1 49 -37 45Z', '#EFE0BF'), shine('M106 255 q66 -49 137 -39'),
  ].join('');
}

function leviathan() {
  return [
    band('M89 358 q70 75 162 39 q83 -33 167 22 q-79 31 -161 -3 q-91 -37 -166 19', 55, '#315E80'),
    band('M287 389 q94 -69 78 -188', 48, '#315E80'),
    E(377, 172, 70, 59, '#315E80'), E(426, 196, 43, 31, '#4D8DA5'),
    P('M329 155 l-38 -66 l69 35Z', '#4D8DA5'), P('M384 118 l17 -78 l28 84Z', '#4D8DA5'),
    P('M151 373 l-36 -78 l76 56Z', '#4D8DA5'), P('M226 403 l1 -91 l53 81Z', '#4D8DA5'), P('M316 354 l38 -78 l22 91Z', '#4D8DA5'),
    eye(397, 169, .73, 'angry'), C(441, 195, 7, '#25314A', NS),
    line('M401 226 q27 15 51 -4', OUT, 9), shine('M121 375 q52 34 106 16'),
  ].join('');
}

function fenrir() {
  return [
    beast({ body: '#49576C', belly: '#8490A0', feature: 'fenrir', mood: 'angry' }),
    line('M126 304 q33 43 76 64 q58 30 108 3', '#D0A94C', 13),
    [166, 206, 247, 290].map((x) => C(x, 355, 8, '#E7C661', NS)).join(''),
    P('M400 201 q20 42 53 6 q-5 51 -43 43Z', '#EEE3C8'),
  ].join('');
}

function boneDragon() {
  return [
    P('M210 250 Q112 106 50 211 Q126 215 183 303Z', '#BBB4A4'),
    P('M294 250 Q392 106 462 209 Q383 213 329 303Z', '#BBB4A4'),
    line('M88 199 l92 100 M137 150 l76 121 M424 198 l-92 101 M377 151 l-76 120', '#E9E0CC', 15),
    band('M112 327 q-55 18 -67 79', 15, '#D9D2BE'),
    [171, 231, 306, 365].map((x, i) => band(`M${x} 348 l${i % 2 ? 6 : -6} 71`, 20, '#E9E0CC')).join(''),
    E(258, 310, 137, 67, '#E9E0CC'),
    [176, 212, 248, 284, 320].map(x => line(`M${x} 286 q12 28 1 55`, '#9D9585', 8)).join(''),
    band('M342 294 q44 -36 37 -102', 23, '#E9E0CC'),
    P('M347 132 q52 -38 105 23 l-15 72 l-78 3Z', '#E9E0CC'),
    C(409, 173, 15, '#6FE0D0', NS), P('M431 196 l47 -7 l-38 28Z', '#D1C7B3'),
    P('M356 142 l-18 -57 l43 39Z', '#9D9585'), P('M396 121 l24 -56 l17 68Z', '#9D9585'),
    line('M374 211 l17 8 M406 215 l17 8', '#9D9585', 7),
  ].join('');
}

function plant() {
  return [
    band('M218 330 q-50 40 -85 84', 20, '#9A7046'), band('M294 330 q50 40 85 84', 20, '#9A7046'),
    P('M162 200 q94 -65 188 0 l-20 175 q-74 45 -148 0Z', '#D8B874'),
    P('M234 197 q-76 -100 -95 -32 q45 3 91 70Z', '#5AA66B'), P('M278 197 q76 -100 95 -32 q-45 3 -91 70Z', '#5AA66B'), P('M256 184 q-14 -112 34 -109 q-34 42 -16 117Z', '#72BB72'),
    eye(220, 266, .78), eye(292, 266, .78), mouth(256, 324),
  ].join('');
}

function ghost(c = {}) {
  const body = c.body || '#B7D5E8';
  return [
    P('M256 79 C153 79 116 171 122 271 C126 341 91 373 67 402 C125 416 164 394 190 365 C214 407 249 421 276 374 C310 413 358 412 388 370 C415 331 400 277 398 225 C394 136 341 79 256 79Z', body),
    eye(218, 206, .9, c.mood || 'happy'), eye(296, 206, .9, c.mood || 'happy'),
    c.feature === 'banshee' ? P('M145 183 q111 -143 222 0 q-47 -22 -111 15 q-64 -37 -111 -15Z', '#E3E8F4') : mouth(257, 278),
    shine('M166 171 q39 -62 101 -65'),
  ].join('');
}

function centaur() {
  return beast({ body: '#C48A52', belly: '#E7BC82' }) + humanoid({ skin: '#DFAF7A', cloth: '#486C8B', accent: '#D9B44C', weapon: 'sword' });
}

const H = (c) => () => humanoid(c);
const B = (c) => () => beast(c);
const F = (c) => () => flyer(c);
const S = (c) => () => serpent(c);
const A = (c) => () => aquatic(c);

export function buildChibiSymbols() {
  return {
    mushroom: () => mushroom(), boar, deer, zombie, slime: () => slime(),
    bat: F({ body: '#704FA3', wing: '#865FBC' }),
    skeleton: H({ skin: '#E9E1CF', cloth: '#566377', feature: 'skeleton', weapon: 'sword' }),
    goblin: H({ skin: '#7EAF5B', cloth: '#8B5A3B', accent: '#E2B04B', feature: 'goblin', weapon: 'sword' }),
    kobold: H({ skin: '#B87B47', cloth: '#4E7186', accent: '#D5B04E', feature: 'kobold', weapon: 'fork' }),
    imp: H({ skin: '#C74E62', cloth: '#74304E', accent: '#F0B44A', feature: 'imp', weapon: 'fork' }),
    mandrake: plant,
    orc: H({ skin: '#75A35F', cloth: '#6D4936', accent: '#D9A644', feature: 'orc', mood: 'angry' }),
    mummy: H({ skin: '#CDBE9D', cloth: '#8A7B67', accent: '#75C6CF', feature: 'mummy' }),
    hedgehog: B({ body: '#956C4A', belly: '#D5A979', feature: 'hedgehog' }),
    ghost: () => ghost(),
    rhino: B({ body: '#82949A', belly: '#AEBCC0', feature: 'rhino', mood: 'angry' }),
    leopard: B({ body: '#E3A24D', belly: '#F2CE89', feature: 'spots' }),
    wolf: B({ body: '#718096', belly: '#AEB7C3', feature: 'wolf', mood: 'angry' }),
    farmer: H({ skin: '#E0AE77', cloth: '#547A56', accent: '#D4A94E', feature: 'hat', weapon: 'fork' }),
    siren2: H({ skin: '#DFAF84', cloth: '#3D8C9A', accent: '#70D5C8', feature: 'siren' }),
    squirrelKeeper: H({ skin: '#D49B68', cloth: '#6C8650', accent: '#E0B14C', feature: 'hat', weapon: 'staff' }),
    troll: H({ skin: '#718F77', cloth: '#5C493D', accent: '#A98850', mood: 'angry' }),
    ogre: H({ skin: '#9BB36D', cloth: '#72513D', accent: '#D3A14B', feature: 'horns', mood: 'angry' }),
    werewolf: H({ skin: '#778295', cloth: '#4C5666', accent: '#B6A06A', feature: 'kobold', mood: 'angry' }),
    vampire: H({ skin: '#E3C6B1', cloth: '#572D54', accent: '#C74D63', feature: 'vampire', mood: 'angry' }),
    centaur,
    tiger: B({ body: '#E58E35', belly: '#F2C57B', feature: 'stripes', mood: 'angry' }),
    elephant: B({ body: '#8B9AA8', belly: '#B3BEC8', feature: 'elephant' }),
    gargoyle3: H({ skin: '#78808B', cloth: '#59616D', accent: '#91C6C9', feature: 'demon', mood: 'angry' }),
    siren3: H({ skin: '#DCA47B', cloth: '#356E9A', accent: '#71D3CA', feature: 'siren', weapon: 'staff' }),
    knight: H({ skin: '#D6A578', cloth: '#71839A', accent: '#E0B84E', feature: 'helmet', weapon: 'sword' }),
    sporeShroom: () => mushroom({ cap: '#8B5AA9', body: '#E7D9C5', spotsColor: '#C7F0B1', spores: true }),
    giant: H({ skin: '#B98666', cloth: '#5C6F61', accent: '#D2A24B', feature: 'horns', mood: 'angry' }),
    whale: A({ body: '#4D8DB0', fin: '#75B8CD' }),
    boa: S({ body: '#6E9E56', accent: '#D4C45B' }),
    gargoyle4: H({ skin: '#636B78', cloth: '#444C59', accent: '#9ED6D1', feature: 'demon', weapon: 'staff', mood: 'angry' }),
    lich: H({ skin: '#D7D0BF', cloth: '#604C89', accent: '#65D8C8', feature: 'lich', weapon: 'staff' }),
    witch: H({ skin: '#DFAF83', cloth: '#674782', accent: '#E0B64A', feature: 'hat', weapon: 'staff' }),
    alchemist: H({ skin: '#E0B388', cloth: '#537B78', accent: '#78D6C8', feature: 'hat', weapon: 'staff' }),
    banshee: () => ghost({ body: '#C4CDE7', feature: 'banshee', mood: 'angry' }),
    chimera: B({ body: '#B7764C', belly: '#E0B273', feature: 'chimera', mood: 'angry' }),
    golem: H({ skin: '#8E918B', cloth: '#737870', accent: '#74D9CC', feature: 'golem', mood: 'angry' }),
    necromancer: H({ skin: '#D4CDBA', cloth: '#4D3C70', accent: '#6DE2CB', feature: 'necro', weapon: 'staff' }),
    slimeQueen: () => slime({ color: '#79D5C8', dark: '#4AB8AA', crown: true }),
    cerberus: B({ body: '#593D48', belly: '#8B5C5E', feature: 'cerberus', mood: 'angry' }),
    basilisk: S({ body: '#668E4E', accent: '#B8CB66', feature: 'basilisk' }),
    dullahan: H({ skin: '#C9C3B2', cloth: '#37445B', accent: '#D7A844', feature: 'dullahan', weapon: 'sword', mood: 'angry' }),
    phoenix: F({ body: '#E9553F', wing: '#F18A3C', feature: 'fire' }),
    demon: H({ skin: '#A53750', cloth: '#61243E', accent: '#F0B14A', feature: 'demon', weapon: 'fork', mood: 'angry' }),
    angel: H({ skin: '#E5BB91', cloth: '#F2F0E5', inner: '#D5C78B', accent: '#E9C94D', feature: 'angel', weapon: 'staff' }),
    captain: H({ skin: '#D9A679', cloth: '#405C87', accent: '#E3B84E', feature: 'captain', weapon: 'sword' }),
    priest: H({ skin: '#DAB08A', cloth: '#EEE8D9', inner: '#6D88A0', accent: '#E1BE56', feature: 'helmet', weapon: 'staff' }),
    kraken: A({ body: '#73539A', feature: 'kraken' }),
    drake: B({ body: '#4E8873', belly: '#8FB87A', feature: 'wings', wing: '#557C91', mood: 'angry' }),
    vermillionBird: F({ body: '#D94B3D', wing: '#EE8242', feature: 'fire' }),
    dragonrider: dragonRider,
    hydra: S({ body: '#4F8A67', accent: '#9DC16F', heads: 3 }),
    sphinx,
    behemoth,
    leviathan,
    cyclops: H({ skin: '#9B8765', cloth: '#5F4A3C', accent: '#E1AF46', feature: 'cyclops', mood: 'angry' }),
    fenrir,
    minotaur: H({ skin: '#9B6848', cloth: '#594638', accent: '#D6A74D', feature: 'minotaur', weapon: 'sword', mood: 'angry' }),
    unicorn: B({ body: '#EEE8F5', belly: '#FFFFFF', feature: 'unicorn' }),
    merlin: H({ skin: '#DAB08C', cloth: '#365D9F', accent: '#E5C451', feature: 'merlin', weapon: 'staff' }),
    boneDragon,
    slimeMini: () => slime({ color: '#75DCCD', dark: '#4BB9AB', mini: true }),
  };
}
