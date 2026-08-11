// 소모품 아이콘 — 유닛과 같은 두꺼운 선화·단색 채색 규칙을 따른다 (viewBox 0 0 64 64)

const OUT = '#2B2B3A';
const wrap = (inner) => `<svg class="item-svg" viewBox="0 0 64 64" aria-hidden="true"><g stroke="${OUT}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round">${inner}</g></svg>`;

const ART = {
  // 경험치사탕
  candy: wrap(`
    <circle cx="32" cy="32" r="15" fill="#EF476F"/>
    <path d="M17 26 l-11 -7 l3 13 l-3 13 l11 -7Z" fill="#F5A0B4"/>
    <path d="M47 26 l11 -7 l-3 13 l3 13 l-11 -7Z" fill="#F5A0B4"/>
    <path d="M26 32 q6 -8 12 0" fill="none" stroke="#FFF3DC" stroke-width="4"/>`),
  // 근육주스
  juice: wrap(`
    <path d="M22 14 h20 l-3 38 a7 7 0 0 1 -14 0Z" fill="#FF9F43"/>
    <path d="M23 32 h18 l-2 20 a7 7 0 0 1 -14 0Z" fill="#E8722A"/>
    <rect x="19" y="8" width="26" height="9" rx="4" fill="#C4CDD8"/>
    <path d="M28 24 l4 -5 l4 5" fill="none" stroke="#FFF3DC" stroke-width="4"/>`),
  // 강철껍질
  shell: wrap(`
    <path d="M32 8 l20 8 v16 c0 12 -9 20 -20 24 -11 -4 -20 -12 -20 -24 V16Z" fill="#8894A0"/>
    <path d="M32 16 l12 5 v10 c0 7 -5 12 -12 15 -7 -3 -12 -8 -12 -15V21Z" fill="#C4CDD8"/>`),
  // 회전기름
  oil: wrap(`
    <path d="M26 12 h12 v8 l8 10 v18 a6 6 0 0 1 -6 6 H24 a6 6 0 0 1 -6 -6 V30l8 -10Z" fill="#F0C64B"/>
    <path d="M22 34 h20 v14 H22Z" fill="#D8A83E"/>
    <path d="M46 20 a12 12 0 1 1 -6 -10" fill="none" stroke="${OUT}" stroke-width="4"/>
    <path d="M40 6 l6 5 l-7 4Z" fill="${OUT}"/>`),
  // 나침반
  compass: wrap(`
    <circle cx="32" cy="32" r="21" fill="#DCEBFA"/>
    <path d="M32 18 l6 12 l-6 16 l-6 -16Z" fill="#EF476F"/>
    <circle cx="32" cy="32" r="3.5" fill="${OUT}" stroke="none"/>
    <path d="M32 8 v4 M32 52 v4 M8 32 h4 M52 32 h4" fill="none" stroke="${OUT}" stroke-width="4"/>`),
  // 응급붕대
  bandage: wrap(`
    <rect x="8" y="24" width="48" height="16" rx="8" fill="#F7EDD8" transform="rotate(-22 32 32)"/>
    <rect x="24" y="24" width="16" height="16" rx="4" fill="#EFE0BC" transform="rotate(-22 32 32)"/>
    <path d="M32 26 v12 M26 32 h12" fill="none" stroke="#EF476F" stroke-width="4"/>`),
  // 독가시
  thorn: wrap(`
    <circle cx="32" cy="36" r="16" fill="#7FBF56"/>
    <path d="M32 20 l4 -14 l4 14Z" fill="#5E9F3E"/>
    <path d="M48 32 l14 -2 l-12 8Z" fill="#5E9F3E"/>
    <path d="M16 32 l-14 -2 l12 8Z" fill="#5E9F3E"/>
    <path d="M32 52 l-3 12 l8 -10Z" fill="#5E9F3E"/>
    <circle cx="27" cy="33" r="3" fill="${OUT}" stroke="none"/>
    <circle cx="38" cy="33" r="3" fill="${OUT}" stroke="none"/>`),
  // 행운의동전
  coin: wrap(`
    <circle cx="32" cy="32" r="20" fill="#F0C64B"/>
    <circle cx="32" cy="32" r="13" fill="#FFE49A"/>
    <path d="M32 22 v20 M26 26 h10 a5 5 0 0 1 0 10 h-8" fill="none" stroke="#B8891F" stroke-width="4"/>`),
  // 재도전권
  retry: wrap(`
    <rect x="8" y="16" width="48" height="32" rx="8" fill="#C4D8F0"/>
    <path d="M22 32 a10 10 0 1 0 10 -10" fill="none" stroke="#3E6EA8" stroke-width="4"/>
    <path d="M32 14 l7 8 l-9 3Z" fill="#3E6EA8"/>
    <path d="M42 40 h8" fill="none" stroke="#3E6EA8" stroke-width="4"/>`),
};

export function itemSprite(art) {
  return ART[art] || ART.coin;
}

export function hasItemArt(art) {
  return Boolean(ART[art]);
}
