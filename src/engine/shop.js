// 상점과 경제 (기획서 8장)

import { makeRng, randomSeed } from './rng.js';
import { SPECIES_LIST, speciesById } from '../data/species.js';
import { ITEM_LIST, itemById } from '../data/items.js';
import { createUnit, mergeUnits, sellValue, unitSpecies, unitName } from './unit.js';
import { fireShopTrigger } from './shopEffects.js';
import { rollSpecies, shopTierForRound } from '../data/bots.js';

export const UNIT_PRICE = 3;
export const REROLL_PRICE = 1;
export const MAX_RING = 6;

// 유닛 슬롯: T1~T2 3칸 / T3~T4 4칸 / T5~T6 5칸, 소모품 슬롯은 항상 2칸
export function unitSlotsForTier(tier) {
  if (tier <= 2) return 3;
  if (tier <= 4) return 4;
  return 5;
}
export const ITEM_SLOTS = 2;

// 라운드 기본 골드: R1~6 10G / R7~12 12G / R13~18 14G
export function baseGoldForRound(round) {
  if (round <= 6) return 10;
  if (round <= 12) return 12;
  return 14;
}

let oidCounter = 0;
const nextOid = () => `o${(oidCounter += 1)}`;

// 신규 상점 유닛은 누적 경험치 1. T5·T6 은 2로 등장해 후반 합류 격차를 보정한다.
function startingExp(tier) {
  return tier >= 5 ? 2 : 1;
}

export function rollShop(run, seed = randomSeed()) {
  const tier = run.shopTier;
  const rng = makeRng(seed);
  const pool = SPECIES_LIST.filter((s) => s.tier <= tier);

  const units = [];
  for (let i = 0; i < unitSlotsForTier(tier); i++) {
    const sp = rollSpecies(tier, rng, pool);
    units.push({ oid: nextOid(), speciesId: sp.id, exp: startingExp(sp.tier), price: UNIT_PRICE });
  }

  const itemPool = ITEM_LIST.filter((it) => !(it.oncePerGame && run.retryTicketUsed));
  const items = [];
  for (let i = 0; i < ITEM_SLOTS; i++) {
    const it = rng.pick(itemPool);
    items.push({ oid: nextOid(), itemId: it.id, price: it.price });
  }

  run.shop = { units, items };
  return run.shop;
}

export function reroll(run) {
  if (run.gold < REROLL_PRICE) return { ok: false, msg: '골드가 부족합니다' };
  run.gold -= REROLL_PRICE;
  rollShop(run);
  return { ok: true };
}

// ── 구매 ──────────────────────────────────────────────────────────
export function buyUnit(run, oid, mergeTargetId = null) {
  const offer = run.shop.units.find((u) => u.oid === oid);
  if (!offer) return { ok: false, msg: '이미 판매된 유닛입니다' };
  if (run.gold < offer.price) return { ok: false, msg: '골드가 부족합니다' };

  const target = mergeTargetId ? run.ring.find((u) => u.id === mergeTargetId) : null;

  if (target) {
    if (target.speciesId !== offer.speciesId) return { ok: false, msg: '같은 종끼리만 합칠 수 있습니다' };
    run.gold -= offer.price;
    const before = target.exp;
    mergeUnits(target, { exp: offer.exp, permBuff: { atk: 0, hp: 0 }, granted: [] });
    run.shop.units = run.shop.units.filter((u) => u.oid !== oid);
    return { ok: true, merged: true, msg: `${unitName(target)} 합치기 (경험치 ${before} → ${target.exp})` };
  }

  // 링이 꽉 차 있으면 같은 종 합치기만 가능하다
  if (run.ring.length >= MAX_RING) {
    const same = run.ring.find((u) => u.speciesId === offer.speciesId);
    if (!same) return { ok: false, msg: '링이 꽉 찼습니다 (같은 종에만 합칠 수 있습니다)' };
    return buyUnit(run, oid, same.id);
  }

  run.gold -= offer.price;
  const unit = createUnit(offer.speciesId, { exp: offer.exp });
  run.ring.push(unit);
  run.shop.units = run.shop.units.filter((u) => u.oid !== oid);
  return { ok: true, unitId: unit.id, msg: `${unitName(unit)} 구매` };
}

// ── 링 안에서의 합치기 ────────────────────────────────────────────
export function mergeInRing(run, sourceId, targetId) {
  if (sourceId === targetId) return { ok: false };
  const source = run.ring.find((u) => u.id === sourceId);
  const target = run.ring.find((u) => u.id === targetId);
  if (!source || !target) return { ok: false };
  if (source.speciesId !== target.speciesId) return { ok: false, msg: '같은 종끼리만 합칠 수 있습니다' };
  mergeUnits(target, source);
  run.ring = run.ring.filter((u) => u.id !== sourceId);
  return { ok: true, msg: `${unitName(target)} 합치기 → 경험치 ${target.exp}` };
}

// ── 판매 ──────────────────────────────────────────────────────────
export function sellUnit(run, unitId) {
  const unit = run.ring.find((u) => u.id === unitId);
  if (!unit) return { ok: false };
  const refund = sellValue(unit);
  // 판매 트리거는 링에서 제거되기 직전에 발동한다 (자신은 대상에서 제외)
  const lines = fireShopTrigger(run.ring, unit, 'ON_SELL', { excludeSelf: true }, Math.random);
  run.ring = run.ring.filter((u) => u.id !== unitId);
  run.gold += refund;
  return { ok: true, refund, lines, msg: `${unitName(unit)} 판매 +${refund}G` };
}

// ── 순서 변경 ─────────────────────────────────────────────────────
export function reorderRing(run, unitId, toIndex) {
  const from = run.ring.findIndex((u) => u.id === unitId);
  if (from < 0) return { ok: false };
  const [u] = run.ring.splice(from, 1);
  const idx = Math.max(0, Math.min(run.ring.length, toIndex));
  run.ring.splice(idx, 0, u);
  return { ok: true };
}

// ── 소모품 ────────────────────────────────────────────────────────
export function useItem(run, oid, targetUnitId = null) {
  const offer = run.shop.items.find((i) => i.oid === oid);
  if (!offer) return { ok: false, msg: '이미 사용된 소모품입니다' };
  const item = itemById(offer.itemId);
  if (!item) return { ok: false };
  if (run.gold < offer.price) return { ok: false, msg: '골드가 부족합니다' };
  if (item.oncePerGame && run.retryTicketUsed) return { ok: false, msg: '게임당 1회만 구매할 수 있습니다' };

  const lines = [];

  if (item.kind === 'run') {
    if (item.run.reverseNextBattle) {
      run.reverseNextBattle = true;
      lines.push('다음 전투를 역회전으로 시작합니다');
    }
    if (item.run.bonusGold) {
      run.bonusGold += item.run.bonusGold;
      lines.push(`다음 라운드 골드 +${item.run.bonusGold}`);
    }
    if (item.run.life) {
      run.lives += item.run.life;
      run.retryTicketUsed = true;
      lines.push(`생명 +${item.run.life}`);
    }
  } else {
    const target = run.ring.find((u) => u.id === targetUnitId);
    if (!target) return { ok: false, msg: '대상 유닛을 선택하세요' };

    if (item.numeric?.exp) {
      target.exp += item.numeric.exp;
      lines.push(`${unitName(target)} 경험치 +${item.numeric.exp}`);
    }
    if (item.numeric?.atk) {
      target.permBuff.atk += item.numeric.atk;
      lines.push(`${unitName(target)} 영구 공격력 +${item.numeric.atk}`);
    }
    if (item.numeric?.hp) {
      target.permBuff.hp += item.numeric.hp;
      lines.push(`${unitName(target)} 영구 체력 +${item.numeric.hp}`);
    }
    if (item.grant) {
      if (!target.granted.includes(item.grant)) {
        target.granted.push(item.grant);
        lines.push(`${unitName(target)} 「${item.name}」 능력 부여`);
      } else {
        lines.push(`${unitName(target)} 이미 「${item.name}」 능력을 가지고 있습니다`);
      }
    }

    // 대상 유닛의 아이템 사용 능력을 한 번 발동한다
    lines.push(...fireShopTrigger(run.ring, target, 'ON_ITEM_USE', {
      itemTarget: target, itemNumeric: item.numeric || null,
    }, Math.random));
  }

  run.gold -= offer.price;
  run.shop.items = run.shop.items.filter((i) => i.oid !== oid);
  return { ok: true, lines, msg: `${item.name} 사용` };
}

export function shopTierFor(round) {
  return shopTierForRound(round);
}

export function speciesOf(unit) {
  return unitSpecies(unit) || speciesById(unit.speciesId);
}
