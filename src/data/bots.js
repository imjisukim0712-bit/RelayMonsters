// 프리셋 봇 덱 (기획서 11.3) — 18라운드 × 5종 = 90개
// 서버 없이 검증하기 위한 폴백 상대. 고정 시드에서 결정론적으로 생성하므로
// 같은 라운드·같은 변형은 항상 동일한 덱이 된다. 라운드마다 최소 5개의
// 서로 다른 이름·전략의 AI 팀을 제공해, 실제 상대 스냅샷이 부족할 때도
// 자동으로 다양한 상대와 매칭된다.

import { makeRng } from '../engine/rng.js';
import { SPECIES_LIST, speciesById } from './species.js';
import { createUnit, speciesAbilityList } from '../engine/unit.js';

export const BOT_VARIANTS = [
  {
    key: 'assault', name: '돌격 릴레이',
    triggers: ['ON_ATTACK', 'ON_BEFORE_ATTACK', 'ON_AFTER_ATTACK', 'ON_KILL'],
  },
  {
    key: 'cycle', name: '순환 릴레이',
    triggers: ['ON_ROTATE', 'ON_LAP', 'ON_DEATH', 'ON_ALLY_DEATH'],
  },
  {
    key: 'guard', name: '수비 릴레이',
    triggers: ['ON_DAMAGED', 'ON_BATTLE_START', 'ON_ITEM_USE', 'ON_SELL'],
  },
  {
    key: 'berserk', name: '광란 릴레이',
    triggers: ['ON_KILL', 'ON_DEATH', 'ON_ALLY_DEATH'],
  },
  {
    key: 'tactic', name: '전술 릴레이',
    triggers: ['ON_BEFORE_ATTACK', 'ON_ITEM_USE', 'ON_SELL'],
  },
];

export function shopTierForRound(round) {
  return Math.min(6, Math.max(1, Math.ceil(round / 3)));
}

// 라운드별 봇 편성 크기 — 초반은 작은 링, 중반부터 만석까지 섞는다.
function ringSizeFor(round, rng) {
  if (round <= 3) return 2 + rng.int(2); // 2~3
  if (round <= 6) return 3 + rng.int(2); // 3~4
  if (round <= 9) return 4 + rng.int(2); // 4~5
  if (round <= 12) return 4 + rng.int(3); // 4~6
  return 3 + rng.int(4); // 3~6 (압축·만석 노선 혼재)
}

// 라운드별 총 경험치 예산. 완주 기준 유효 경험치 약 45를 라운드에 비례 배분한다.
function expBudgetFor(round, size) {
  return size + Math.round(round * 2.4);
}

function tierWeights(tier) {
  // 현재 티어 45% / −1 티어 30% / −2 이하 25%
  const buckets = [];
  buckets.push({ tiers: [tier], w: 45 });
  if (tier - 1 >= 1) buckets.push({ tiers: [tier - 1], w: 30 });
  const low = [];
  for (let t = 1; t <= tier - 2; t++) low.push(t);
  if (low.length) buckets.push({ tiers: low, w: 25 });
  return buckets;
}

export function rollSpecies(tier, rng, pool = SPECIES_LIST) {
  const buckets = tierWeights(tier).filter((b) => b.tiers.some((t) => pool.some((s) => s.tier === t)));
  if (!buckets.length) return rng.pick(pool) || rng.pick(SPECIES_LIST);
  const bucket = rng.weighted(buckets.map((b) => [b, b.w]));
  const candidates = pool.filter((s) => bucket.tiers.includes(s.tier));
  return rng.pick(candidates.length ? candidates : pool);
}

export function presetBot(round, variantIdx) {
  const variant = BOT_VARIANTS[variantIdx % BOT_VARIANTS.length];
  const rng = makeRng(round * 7919 + variantIdx * 104729 + 17);
  const tier = shopTierForRound(round);

  const themed = SPECIES_LIST.filter(
    (s) => s.tier <= tier && speciesAbilityList(s).some((a) => variant.triggers.includes(a.trigger)),
  );
  const anyPool = SPECIES_LIST.filter((s) => s.tier <= tier);

  const size = Math.min(6, ringSizeFor(round, rng));
  const chosen = [];
  for (let i = 0; i < size; i++) {
    // 70% 는 아키타입에 맞는 종, 30% 는 자유 선택
    const pool = themed.length >= 3 && rng.next() < 0.7 ? themed : anyPool;
    let sp = rollSpecies(tier, rng, pool);
    let guard = 0;
    while (chosen.some((c) => c.id === sp.id) && guard < 12) {
      sp = rollSpecies(tier, rng, pool);
      guard += 1;
    }
    chosen.push(sp);
  }

  // 경험치 배분 — 에이스 한 기에 집중하고 나머지에 분배한다
  let budget = expBudgetFor(round, size);
  const exps = new Array(size).fill(1);
  budget -= size;
  const aceIdx = rng.int(size);
  const aceShare = Math.min(budget, Math.round(budget * (0.45 + rng.next() * 0.2)));
  exps[aceIdx] += aceShare;
  budget -= aceShare;
  let cursor = 0;
  while (budget > 0) {
    const i = (aceIdx + 1 + cursor) % size;
    const give = Math.min(budget, 1 + rng.int(2));
    exps[i] += give;
    budget -= give;
    cursor += 1;
  }

  const ring = chosen.map((sp, i) => createUnit(sp.id, { exp: Math.min(24, exps[i]) }));

  // 후반 봇에는 영구 성장 아이템 흔적을 조금 얹는다
  if (round >= 8) {
    const target = ring[rng.int(ring.length)];
    target.permBuff.atk += 1 + rng.int(2);
    target.permBuff.hp += 1 + rng.int(3);
  }
  if (round >= 12 && rng.next() < 0.5) {
    const t = ring[rng.int(ring.length)];
    const grant = rng.pick(['ITEM_OIL_ROTATE', 'ITEM_BANDAGE_SHIELD', 'ITEM_THORN']);
    if (!t.granted.includes(grant)) t.granted.push(grant);
  }

  return {
    name: `R${round} ${variant.name}`,
    variant: variant.key,
    round,
    ring,
  };
}

// 라운드별 전체 변형 (최소 5종)
export function presetBotsForRound(round) {
  return BOT_VARIANTS.map((_, v) => presetBot(round, v));
}

// 스냅샷 → 전투용 링
export function ringFromSnapshot(snapshot) {
  return (snapshot.ring || [])
    .filter((e) => speciesById(e.speciesId))
    .map((e) => createUnit(e.speciesId, { exp: e.exp, permBuff: e.permBuff, granted: e.granted }));
}
