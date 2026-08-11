// 유닛 인스턴스와 파생 스탯 (기획서 7장 / 14.1)
// level·atk·hp 는 저장하지 않고 exp + 종 데이터에서 항상 파생 계산한다.

import { anySpecies } from '../data/species.js';
import { GRANTED_ABILITIES } from '../data/items.js';

// 누적 경험치 구간: Lv1 0~2 / Lv2 3~6 / Lv3 7~11 / Lv4 12~17 / Lv5 18+
export const LEVEL_THRESHOLDS = [0, 3, 7, 12, 18];
export const MAX_LEVEL = 5;

let uidCounter = 0;
export function newUid() {
  uidCounter += 1;
  return `u_${uidCounter.toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;
}

export function levelFromExp(exp) {
  let lv = 1;
  for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
    if (exp >= LEVEL_THRESHOLDS[i]) lv = i + 1;
  }
  return lv;
}

// 다음 레벨까지 남은 경험치 (Lv5면 null)
export function expToNextLevel(exp) {
  const lv = levelFromExp(exp);
  if (lv >= MAX_LEVEL) return null;
  return LEVEL_THRESHOLDS[lv] - exp;
}

export function levelProgress(exp) {
  const lv = levelFromExp(exp);
  if (lv >= MAX_LEVEL) return { lv, inLevel: 0, need: 0, ratio: 1 };
  const floorExp = LEVEL_THRESHOLDS[lv - 1];
  const ceilExp = LEVEL_THRESHOLDS[lv];
  return { lv, inLevel: exp - floorExp, need: ceilExp - floorExp, ratio: (exp - floorExp) / (ceilExp - floorExp) };
}

// 능력 승급은 Lv3 / Lv5 두 지점. 현재 레벨 이하의 가장 높은 키를 사용한다.
export function abilityLevelKey(level) {
  if (level >= 5) return 5;
  if (level >= 3) return 3;
  return 1;
}

export function createUnit(speciesId, { exp = 1, permBuff, granted } = {}) {
  return {
    id: newUid(),
    speciesId,
    exp,
    permBuff: { atk: permBuff?.atk || 0, hp: permBuff?.hp || 0 },
    granted: granted ? granted.slice() : [],
  };
}

export function unitSpecies(u) {
  return anySpecies(u.speciesId);
}

// 종 정의의 능력 목록. 대부분은 ability 하나, 마나 유닛 일부는 abilities 배열(트리거가 다른 능력 둘)을 쓴다.
export function speciesAbilityList(sp) {
  if (!sp) return [];
  if (sp.abilities) return sp.abilities;
  return sp.ability ? [sp.ability] : [];
}

export function unitLevel(u) {
  return levelFromExp(u.exp);
}

export function unitAtk(u) {
  const sp = unitSpecies(u);
  return Math.max(0, sp.atk + u.exp + (u.permBuff?.atk || 0));
}

export function unitHp(u) {
  const sp = unitSpecies(u);
  return Math.max(1, sp.hp + u.exp + (u.permBuff?.hp || 0));
}

export function unitName(u) {
  return unitSpecies(u).name;
}

// 종 고유 능력 + 아이템으로 부여된 능력
// 마나 유닛(미라 등)처럼 한 종이 서로 다른 트리거의 능력 둘을 가질 수 있어 abilities 배열도 지원한다.
export function unitAbilities(u) {
  const sp = unitSpecies(u);
  const list = [];
  for (const a of speciesAbilityList(sp)) list.push({ source: 'species', speciesId: sp.id, ...a });
  for (const gid of u.granted || []) {
    const g = GRANTED_ABILITIES[gid];
    if (g) list.push({ source: 'granted', grantId: g.id, label: g.label, trigger: g.trigger, flat: g.flat });
  }
  return list;
}

// 현재 레벨에서 적용되는 효과
export function abilityEffect(ability, level) {
  if (ability.flat) return ability.flat;
  if (!ability.levels) return null;
  return ability.levels[abilityLevelKey(level)] || null;
}

// 판매 환급: 누적 경험치만큼, 최대 5G
export function sellValue(u) {
  return Math.min(5, Math.max(1, u.exp));
}

// 합치기: 대상이 남고 소스의 누적 경험치가 전이된다.
// 영구 버프는 합산하지 않고 더 높은 쪽을 계승한다.
export function mergeUnits(target, source) {
  target.exp = target.exp + source.exp;
  target.permBuff = {
    atk: Math.max(target.permBuff?.atk || 0, source.permBuff?.atk || 0),
    hp: Math.max(target.permBuff?.hp || 0, source.permBuff?.hp || 0),
  };
  const set = new Set([...(target.granted || []), ...(source.granted || [])]);
  target.granted = [...set];
  return target;
}

export function cloneUnit(u) {
  return {
    id: newUid(),
    speciesId: u.speciesId,
    exp: u.exp,
    permBuff: { ...u.permBuff },
    granted: (u.granted || []).slice(),
  };
}
