// 전투 배경 벡터 레이어 (기획서 12.5)
// sky / distant / ground / ringPath 4개 레이어 구조를 모든 배경이 공유하므로
// 배경을 바꿔도 동일한 전투 UI를 그대로 재사용한다.

import { backgroundById } from '../data/backgrounds.js';

const VB_W = 1200;
const VB_H = 600;

function environmentDecor(bgId, p, horizon) {
  const commonRocks = `<g fill="${p.accent}" opacity=".55">
    <ellipse cx="105" cy="535" rx="42" ry="15"/><ellipse cx="1090" cy="522" rx="54" ry="17"/>
    <ellipse cx="945" cy="570" rx="26" ry="9"/>
  </g>`;
  if (bgId === 'bg_grass') return `<g fill="#527B45">
    <path d="M36 ${horizon + 112} q28 -46 58 -14 q26 -58 64 -10 q34 -30 66 24Z"/>
    <path d="M996 ${horizon + 108} q32 -54 65 -16 q28 -66 70 -8 q28 -28 60 22Z"/>
  </g><g fill="#78A85A">
    <circle cx="82" cy="${horizon + 92}" r="34"/><circle cx="130" cy="${horizon + 91}" r="43"/><circle cx="178" cy="${horizon + 100}" r="30"/>
    <circle cx="1044" cy="${horizon + 92}" r="34"/><circle cx="1092" cy="${horizon + 80}" r="44"/><circle cx="1140" cy="${horizon + 98}" r="32"/>
  </g><g fill="#F8D55B" opacity=".9">${[178, 214, 978, 1012].map((x, i) => `<circle cx="${x}" cy="${530 + (i % 2) * 18}" r="6"/>`).join('')}</g>${commonRocks}`;
  if (bgId === 'bg_sunset') return `<circle cx="930" cy="128" r="76" fill="#FFD36B" opacity=".9"/>
    <g fill="#6F6742" opacity=".7"><path d="M0 520 q56 -80 112 0Z M1050 520 q72 -98 150 0Z"/></g>
    <g stroke="#6E5536" stroke-width="6" opacity=".55"><path d="M80 580 q20 -78 6 -126 M1120 580 q-20 -82 -4 -134"/></g>${commonRocks}`;
  if (bgId === 'bg_snow') return `<g stroke="#25314A" stroke-width="5" stroke-linejoin="round">
    <path d="M78 510 l54 -124 l54 124Z" fill="#7899A9"/><path d="M1014 504 l66 -148 l66 148Z" fill="#7899A9"/>
    <path d="M92 472 l40 -86 l40 86Z M1030 456 l50 -100 l50 100Z" fill="#EAF4FB" stroke="none"/>
  </g><g fill="#FFFFFF" opacity=".72">${Array.from({ length: 20 }, (_, i) => `<circle cx="${(i * 163) % 1200}" cy="${40 + (i * 71) % 430}" r="${2 + (i % 3)}"/>`).join('')}</g>${commonRocks}`;
  if (bgId === 'bg_desert') return `<circle cx="970" cy="118" r="70" fill="#FFD36B" opacity=".86"/>
    <g stroke="#25314A" stroke-width="6" stroke-linejoin="round"><path d="M112 530 v-96 q0 -18 18 -18 q18 0 18 18 v20 h24 v-32" fill="none" stroke="#6A9857" stroke-width="20"/>
    <path d="M1086 522 v-78 q0 -16 16 -16 q16 0 16 16" fill="none" stroke="#6A9857" stroke-width="18"/></g>${commonRocks}`;
  if (bgId === 'bg_cave') return `<path d="M0 0 h1200 v74 l-70 92 l-54 -104 l-70 128 l-68 -116 l-80 92 l-78 -122 l-88 116 l-80 -112 l-72 132 l-82 -124 l-68 106 l-78 -94 l-70 108 l-72 -102 l-70 90 l-72 -90Z" fill="#1F2938" opacity=".96"/>
    <path d="M500 0 h220 l130 360 h-480Z" fill="#DDF8DE" opacity=".10"/>
    <g fill="#84D8B8" stroke="#25314A" stroke-width="5"><path d="M90 544 l28 -82 l28 82Z"/><path d="M1060 544 l34 -104 l34 104Z"/></g>${commonRocks}`;
  return `<g fill="#FFF2B0" opacity=".8">${Array.from({ length: 34 }, (_, i) => `<circle cx="${(i * 197) % 1200}" cy="${24 + (i * 83) % 360}" r="${2 + (i % 4)}"/>`).join('')}</g>
    <circle cx="978" cy="118" r="68" fill="#A88DE0" opacity=".62"/><circle cx="998" cy="98" r="54" fill="#34294E" opacity=".72"/>
    <g fill="#6D5A99" stroke="#25314A" stroke-width="5"><path d="M70 480 l72 -54 l86 50 l-74 34Z"/><path d="M980 480 l66 -48 l92 42 l-78 38Z"/></g>`;
}

// 전투 중심부는 채도·명암 대비를 낮춰 몬스터와 전투 정보가 항상 먼저 보이게 한다.
export function backgroundSvg(bgId) {
  const bg = backgroundById(bgId);
  const p = bg.palette;
  const horizon = 330;
  const openSky = !['bg_cave', 'bg_void'].includes(bgId);
  const clouds = openSky ? `<g fill="#FFFFFF" opacity="${bgId === 'bg_snow' ? 0.62 : 0.38}">
    <ellipse cx="238" cy="112" rx="96" ry="31"/><ellipse cx="302" cy="122" rx="72" ry="24"/>
    <ellipse cx="900" cy="92" rx="82" ry="28"/><ellipse cx="850" cy="102" rx="55" ry="20"/>
  </g>` : '';
  const decor = environmentDecor(bgId, p, horizon);

  return `<svg class="bg-svg" viewBox="0 0 ${VB_W} ${VB_H}" preserveAspectRatio="none" aria-hidden="true">
    <defs>
      <linearGradient id="sky-${bgId}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${p.sky[0]}"/><stop offset="1" stop-color="${p.sky[1]}"/>
      </linearGradient>
      <radialGradient id="ground-${bgId}" cx="50%" cy="48%" r="68%">
        <stop offset="0" stop-color="${p.ground}"/><stop offset="1" stop-color="${p.ground2}"/>
      </radialGradient>
      <pattern id="grain-${bgId}" width="48" height="48" patternUnits="userSpaceOnUse">
        <circle cx="7" cy="12" r="2" fill="#25314A" opacity=".035"/><circle cx="34" cy="31" r="1.5" fill="#25314A" opacity=".03"/>
      </pattern>
      <linearGradient id="vignette-${bgId}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#25314A" stop-opacity=".08"/><stop offset=".46" stop-color="#25314A" stop-opacity="0"/><stop offset="1" stop-color="#25314A" stop-opacity=".14"/>
      </linearGradient>
    </defs>
    <rect x="0" y="0" width="${VB_W}" height="${horizon + 10}" fill="url(#sky-${bgId})"/>
    ${clouds}
    <path d="M-40 ${horizon} q150 -124 320 -48 q120 -86 250 -8 q140 -72 260 10 q110 -52 450 8 l0 76 l-1280 0Z" fill="${p.distant}"/>
    <path d="M-40 ${horizon + 14} q210 -78 430 -16 q210 -64 420 4 q130 -36 430 12 l0 58 l-1280 0Z" fill="${p.distant2}"/>
    <rect x="0" y="${horizon}" width="${VB_W}" height="${VB_H - horizon}" fill="url(#ground-${bgId})"/>
    <path d="M0 ${horizon + 56} q300 -32 600 -5 q300 29 600 -9 l0 ${VB_H} l-1200 0Z" fill="${p.ground2}" opacity=".74"/>
    <path d="M90 520 q210 -52 390 -8 q170 38 330 -3 q170 -42 330 13 l0 78 l-1050 0Z" fill="${p.ringPath}" opacity=".10"/>
    ${decor}
    <rect width="${VB_W}" height="${VB_H}" fill="url(#grain-${bgId})"/>
    <rect width="${VB_W}" height="${VB_H}" fill="url(#vignette-${bgId})"/>
  </svg>`;
}

// 링 경로 — 풀밭 위에서 묻히지 않도록 반투명 흙길/눌린 잔디 원으로 표시한다
export function ringPathColor(bgId) {
  return backgroundById(bgId).palette.ringPath;
}

// 배경 상점용 16:9 미리보기
export function backgroundPreview(bgId) {
  return `<div class="bg-preview">${backgroundSvg(bgId)}</div>`;
}
