// 전투 배경 벡터 레이어 (기획서 12.5)
// sky / distant / ground / ringPath 4개 레이어 구조를 모든 배경이 공유하므로
// 배경을 바꿔도 동일한 전투 UI를 그대로 재사용한다.

import { backgroundById } from '../data/backgrounds.js';

const VB_W = 1200;
const VB_H = 600;

// 전투 중심부는 채도·명암 대비를 낮춰 몬스터와 전투 정보가 항상 먼저 보이게 한다.
export function backgroundSvg(bgId) {
  const bg = backgroundById(bgId);
  const p = bg.palette;
  const horizon = 330;

  const stars = bgId === 'bg_void'
    ? Array.from({ length: 26 }, (_, i) => {
      const x = ((i * 977) % VB_W);
      const y = ((i * 613) % (horizon - 40)) + 20;
      const r = 2 + ((i * 7) % 3);
      return `<circle cx="${x}" cy="${y}" r="${r}" fill="#FFF6D8" opacity="0.7"/>`;
    }).join('')
    : '';

  const clouds = ['bg_grass', 'bg_sunset', 'bg_snow', 'bg_desert'].includes(bgId)
    ? `<g fill="#FFFFFF" opacity="${bgId === 'bg_snow' ? 0.55 : 0.42}">
         <ellipse cx="240" cy="110" rx="92" ry="30"/><ellipse cx="300" cy="120" rx="70" ry="24"/>
         <ellipse cx="920" cy="86" rx="76" ry="26"/><ellipse cx="866" cy="96" rx="54" ry="20"/>
       </g>`
    : '';

  return `<svg class="bg-svg" viewBox="0 0 ${VB_W} ${VB_H}" preserveAspectRatio="none" aria-hidden="true">
    <defs>
      <linearGradient id="sky-${bgId}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${p.sky[0]}"/><stop offset="1" stop-color="${p.sky[1]}"/>
      </linearGradient>
    </defs>
    <rect x="0" y="0" width="${VB_W}" height="${horizon + 10}" fill="url(#sky-${bgId})"/>
    ${stars}${clouds}
    <path d="M-40 ${horizon} q150 -120 320 -46 q120 -84 250 -6 q140 -70 260 10 q110 -50 220 6 l0 60 l-1050 0Z" fill="${p.distant}"/>
    <path d="M-40 ${horizon + 14} q210 -76 430 -14 q210 -62 420 4 q130 -34 240 10 l0 40 l-1090 0Z" fill="${p.distant2}"/>
    <rect x="0" y="${horizon}" width="${VB_W}" height="${VB_H - horizon}" fill="${p.ground}"/>
    <path d="M0 ${horizon + 60} q300 -34 600 -6 q300 28 600 -8 l0 ${VB_H} l-1200 0Z" fill="${p.ground2}"/>
    <g fill="${p.accent}" opacity="0.5">
      <path d="M120 ${VB_H - 40} l10 -34 l10 34Z"/><path d="M1080 ${VB_H - 30} l10 -32 l10 32Z"/>
      <path d="M300 ${VB_H - 18} l8 -26 l8 26Z"/><path d="M900 ${VB_H - 14} l8 -24 l8 24Z"/>
    </g>
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
