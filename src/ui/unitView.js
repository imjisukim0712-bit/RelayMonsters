// 유닛 렌더링 (기획서 13.2 / 13.3)
// 카드·초상화 크롭 없이 투명 배경 전신 SVG 를 그대로 세우고,
// 공격력·체력은 발밑 숫자 칩으로, 능력 기믹은 트리거 배지로 분리해 표시한다.

import { TIER_COLORS, TRIGGERS } from '../data/species.js';
import {
  unitSpecies, unitAtk, unitHp, unitLevel, unitAbilities, levelProgress, expToNextLevel,
  abilityLevelKey,
} from '../engine/unit.js';
import { speciesAbilityLines, abilityLine } from '../engine/text.js';
import { hasArt } from '../art/symbols.js';

export function sprite(artKey, extraClass = '') {
  const key = hasArt(artKey) ? artKey : 'slimeMini';
  return `<svg class="sprite ${extraClass}" viewBox="0 0 512 512" aria-hidden="true"><use href="#sym-${key}"/></svg>`;
}

const ICO_ATK = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20 L14 10 M12 4 h8 v8 M20 4 L10 14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>';
const ICO_HP = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.6-7-9.6A4.4 4.4 0 0 1 12 7a4.4 4.4 0 0 1 7 3.4c0 5-7 9.6-7 9.6Z" fill="currentColor"/></svg>';
const ICO_SHIELD = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l7 3v6c0 4.2-3 7.4-7 9-4-1.6-7-4.8-7-9V6Z" fill="currentColor"/></svg>';
const ICO_MANA = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3c3 4.2 6 7.9 6 11.2A6 6 0 0 1 6 14.2C6 10.9 9 7.2 12 3Z" fill="currentColor"/></svg>';
export const ICONS = { atk: ICO_ATK, hp: ICO_HP, shield: ICO_SHIELD, mana: ICO_MANA };

// 공격력·체력·보호막·마나 아이콘은 서로 다른 형태를 쓰고 항상 숫자를 병기한다 (13.3)
// 마나는 마나 유닛만 표시한다 (5.4절)
export function statChips({ atk, hp, maxHp, shield = 0, manaUnit = false, mana = 0, maxMana = 10 }) {
  const hpText = maxHp != null && hp !== maxHp ? `${hp}<span class="chip-sub">/${maxHp}</span>` : `${hp}`;
  return `<div class="chips">
    <span class="chip chip-atk" title="공격력">${ICO_ATK}<span class="v">${atk}</span></span>
    <span class="chip chip-hp" title="체력">${ICO_HP}<span class="v">${hpText}</span></span>
    ${shield > 0 ? `<span class="chip chip-shield" title="보호막">${ICO_SHIELD}<span class="v">${shield}</span></span>` : ''}
    ${manaUnit ? `<span class="chip chip-mana" title="마나">${ICO_MANA}<span class="v">${mana}<span class="chip-sub">/${maxMana}</span></span></span>` : ''}
  </div>`;
}

export function levelPips(level) {
  return `<span class="lv" aria-label="레벨 ${level}">Lv${level}${level >= 5 ? '' : ''}</span>`;
}

// 링·상점 공용 유닛 스탠드
export function unitStand(view, opts = {}) {
  const {
    tier, art, name, atk, hp, maxHp, shield = 0, level = 1, trigger = null,
    manaUnit = false, mana = 0, maxMana = 10,
  } = view;
  const color = TIER_COLORS[tier] || '#8CC63F';
  const cls = [
    'unit', opts.flip ? 'flip' : '', opts.dead ? 'dead' : '', opts.front ? 'is-front' : '',
    opts.selected ? 'selected' : '', opts.className || '',
  ].filter(Boolean).join(' ');

  return `<div class="${cls}" data-uid="${view.uid || ''}" data-id="${opts.id || ''}" style="--tier:${color}">
    <div class="unit-shadow"></div>
    <div class="unit-ring"></div>
    <div class="unit-body">${sprite(art)}</div>
    ${opts.hitArea === false ? '' : '<div class="unit-hit" aria-hidden="true"></div>'}
    <div class="unit-foot">
      ${statChips({ atk, hp, maxHp, shield, manaUnit, mana, maxMana })}
      ${trigger ? `<div class="badge" data-trigger="${trigger}">${TRIGGERS[trigger] || ''}</div>` : ''}
      ${opts.showName ? `<div class="unit-name">${name} <span class="lv-tag">Lv${level}</span></div>` : ''}
    </div>
    ${opts.slotLabel ? `<div class="slot-tag${opts.slotLabel === 1 ? ' first' : ''}">${opts.slotLabel}</div>` : ''}
  </div>`;
}

// 런 유닛 → 표시용 뷰
export function viewFromRunUnit(u) {
  const sp = unitSpecies(u);
  const abil = unitAbilities(u)[0];
  return {
    uid: u.id,
    speciesId: u.speciesId,
    tier: sp.tier,
    art: sp.art,
    name: sp.name,
    atk: unitAtk(u),
    hp: unitHp(u),
    maxHp: unitHp(u),
    shield: 0,
    level: unitLevel(u),
    trigger: abil?.trigger || null,
    manaUnit: !!sp.manaUnit,
    mana: 0,
    maxMana: 10,
  };
}

// 상세 정보 패널 — Lv1·Lv3·Lv5 세 줄을 모두 표시하고 현재 줄만 선명하게
export function detailPanel(u, { extra = '' } = {}) {
  const sp = unitSpecies(u);
  const level = unitLevel(u);
  const key = abilityLevelKey(level);
  const prog = levelProgress(u.exp);
  const need = expToNextLevel(u.exp);
  const color = TIER_COLORS[sp.tier] || '#8CC63F';
  const abilities = unitAbilities(u);
  const speciesAbils = abilities.filter((a) => a.source === 'species');
  const granted = abilities.filter((a) => a.source === 'granted');
  const manaTag = sp.manaUnit ? '<span class="mana-tag">마나 유닛</span>' : sp.manaSupply ? '<span class="mana-tag">마나 공급 유닛</span>' : '';

  const lines = speciesAbils.length
    ? speciesAbilityLines(speciesAbils).map(
      (l) => `<li class="${l.key === key ? 'active' : 'dim'}"><b>Lv${l.key}</b><span>${l.text}</span></li>`,
    ).join('')
    : '<li class="dim"><span>능력 없음</span></li>';

  return `<div class="detail" style="--tier:${color}">
    <div class="detail-head">
      <div class="detail-art">${sprite(sp.art)}</div>
      <div class="detail-meta">
        <div class="detail-title"><b>${sp.name}</b><span class="tier-tag">T${sp.tier}</span><span class="lv-tag">Lv${level}</span>${manaTag}</div>
        <div class="detail-stats">${statChips({ atk: unitAtk(u), hp: unitHp(u), manaUnit: !!sp.manaUnit, mana: 0, maxMana: 10 })}</div>
        <div class="exp-row">
          <div class="exp-bar"><i style="width:${Math.round(prog.ratio * 100)}%"></i></div>
          <span class="exp-text">${need == null ? '최대 레벨' : `다음 승급까지 ${need} exp`} · 누적 ${u.exp}</span>
        </div>
        ${(u.permBuff?.atk || u.permBuff?.hp) ? `<div class="perm">영구 성장 +${u.permBuff.atk || 0}/+${u.permBuff.hp || 0}</div>` : ''}
      </div>
    </div>
    <ul class="abil">${lines}</ul>
    ${granted.length ? `<div class="granted">${granted.map((g) => `<span class="granted-tag">${g.label} · ${abilityLine(g, 0)}</span>`).join('')}</div>` : ''}
    <div class="silhouette">${sp.silhouette || ''}</div>
    ${extra}
  </div>`;
}
