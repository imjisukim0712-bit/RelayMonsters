// 상점 트리거 (판매 · 아이템 사용) — 런 데이터에 직접 영향을 주는 효과
// 전투 트리거와 달리 여기서의 permBuff 는 실제로 영구 반영된다.

import { unitAbilities, abilityEffect, unitLevel, unitHp, unitName } from './unit.js';
import { effectText, triggerName } from './text.js';

// 링(배열) 기준 인접 계산. 인덱스 0 = 1번 슬롯, 앞 유닛 = i-1, 뒤 유닛 = i+1
function ahead(ring, unit) {
  const n = ring.length;
  const i = ring.indexOf(unit);
  if (i < 0 || n <= 1) return null;
  return ring[(i - 1 + n) % n];
}
function behind(ring, unit) {
  const n = ring.length;
  const i = ring.indexOf(unit);
  if (i < 0 || n <= 1) return null;
  return ring[(i + 1) % n];
}

function resolveShopTargets(ring, unit, effect, ctx, rng) {
  const n = effect.count || 1;
  const pool = ctx.excludeSelf ? ring.filter((u) => u !== unit) : ring.slice();
  const sample = (arr, k) => {
    const a = arr.slice();
    const out = [];
    while (out.length < k && a.length) out.push(a.splice(Math.floor(rng() * a.length), 1)[0]);
    return out;
  };
  const lowestHp = (arr) => {
    if (!arr.length) return [];
    let best = arr[0];
    for (const u of arr) if (unitHp(u) < unitHp(best)) best = u;
    return [best];
  };

  switch (effect.target) {
    case 'self': return [unit];
    case 'itemTarget': return ctx.itemTarget ? [ctx.itemTarget] : [unit];
    case 'randomAlly':
    case 'randomAllies': return sample(pool, n);
    case 'allAlly': return ring.slice();
    case 'allAllyOther': return ring.filter((u) => u !== unit);
    case 'lowestHpAlly': return lowestHp(ring);
    case 'lowestHpOtherAlly': return lowestHp(ring.filter((u) => u !== unit));
    case 'frontUnit': { const t = ahead(ring, unit); return t ? [t] : []; }
    case 'backUnit': { const t = behind(ring, unit); return t ? [t] : []; }
    case 'neighbors': {
      const a = ahead(ring, unit);
      const b = behind(ring, unit);
      const out = [];
      if (a) out.push(a);
      if (b && b !== a) out.push(b);
      return out;
    }
    default: return [];
  }
}

function applyPermBuff(u, atk, hp) {
  u.permBuff.atk = (u.permBuff.atk || 0) + (atk || 0);
  u.permBuff.hp = (u.permBuff.hp || 0) + (hp || 0);
}

function applyShopEffect(ring, unit, effect, ctx, rng, out) {
  if (!effect) return;
  if (effect.op === 'multi') {
    for (const e of effect.effects || []) applyShopEffect(ring, unit, e, ctx, rng, out);
    return;
  }
  const targets = effect.target ? resolveShopTargets(ring, unit, effect, ctx, rng) : [];

  switch (effect.op) {
    case 'permBuff':
    case 'buff': // 상점 단계에서 발동하는 스탯 변화는 영구로 처리한다
      for (const t of targets) {
        applyPermBuff(t, effect.atk || 0, effect.hp || 0);
        out.push(`${unitName(t)} 영구 ${effect.atk ? `공격력 +${effect.atk}` : ''}${effect.atk && effect.hp ? ', ' : ''}${effect.hp ? `체력 +${effect.hp}` : ''}`);
      }
      break;
    case 'copyItem': {
      const num = ctx.itemNumeric;
      if (!num) break;
      for (const t of targets) {
        const exp = Math.floor(((num.exp || 0) * effect.pct) / 100);
        const atk = Math.floor(((num.atk || 0) * effect.pct) / 100);
        const hp = Math.floor(((num.hp || 0) * effect.pct) / 100);
        if (exp) t.exp += exp;
        if (atk || hp) applyPermBuff(t, atk, hp);
        if (exp || atk || hp) {
          const bits = [];
          if (exp) bits.push(`경험치 +${exp}`);
          if (atk) bits.push(`공격력 +${atk}`);
          if (hp) bits.push(`체력 +${hp}`);
          out.push(`${unitName(t)} ${bits.join(', ')} (복제)`);
        }
      }
      break;
    }
    default:
      break;
  }
}

// 상점 트리거 발동. ring 은 런의 링 배열, unit 은 능력을 가진 유닛.
export function fireShopTrigger(ring, unit, trigger, ctx = {}, rng = Math.random) {
  const out = [];
  const lines = [];
  const level = unitLevel(unit);
  for (const ability of unitAbilities(unit)) {
    if (ability.trigger !== trigger) continue;
    const eff = abilityEffect(ability, level);
    if (!eff) continue;
    lines.push(`${unitName(unit)} · ${triggerName(trigger)} → ${effectText(eff)}`);
    applyShopEffect(ring, unit, eff, ctx, rng, out);
  }
  return [...lines, ...out];
}
