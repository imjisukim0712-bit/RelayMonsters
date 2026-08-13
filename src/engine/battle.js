// 전투 엔진 (기획서 4장)
//
// 전투는 전부 자동 진행되며, 시뮬레이션 결과를 이벤트 타임라인으로 반환한다.
// UI 는 이벤트를 순서대로 재생만 하면 되므로 규칙과 연출이 완전히 분리된다.
//
// 턴 시퀀스
//   1 턴 시작 → 2 공격 선언(공격) → 3 공격 준비(공격 전) → 4 전선 교전(동시 피해·피해받음)
//   → 5 사망 판정(처치·사망·아군 사망·링 압축) → 6 공격 마무리(공격 후)
//   → 7 회전(회전·한 바퀴) → 8 승패 판정

import { makeRng } from './rng.js';
import {
  aheadUnit, behindUnit, neighborUnits, frontUnit, ringSize, rotate, reverseOrder,
} from './ring.js';
import {
  unitAtk, unitHp, unitLevel, unitAbilities, abilityEffect, abilityLevelKey, unitSpecies,
} from './unit.js';
import { effectText, triggerName } from './text.js';

export const MAX_TURNS = 30;
export const MAX_RING = 6;
const MAX_DEPTH = 8; // 재귀 깊이 제한 (무한 루프 방지)

// ── 전투 유닛 ─────────────────────────────────────────────────────
let bUid = 0;
function toBattleUnit(runUnit, teamIdx) {
  const sp = unitSpecies(runUnit);
  const level = unitLevel(runUnit);
  const atk = unitAtk(runUnit);
  const hp = unitHp(runUnit);
  bUid += 1;
  return {
    uid: `b${bUid}`,
    runId: runUnit.id,
    speciesId: runUnit.speciesId,
    name: sp.name,
    art: sp.art,
    tier: sp.tier,
    team: teamIdx,
    level,
    abilKey: abilityLevelKey(level),
    abilities: unitAbilities(runUnit),
    atk,
    baseAtk: atk,
    hp,
    maxHp: hp,
    shield: 0,
    alive: true,
    lapCount: 0,
    thisAttackBonus: 0,
    nextAttackBonus: 0,
    damageUp: {},
    usedTurn: {},
    usedRotation: {},
    usedBattle: {},
    killedBy: null,
    overkill: 0,
    revived: false,
    summoned: false,
    manaUnit: !!sp.manaUnit,
    manaSupply: !!sp.manaSupply,
    mana: 0,
    maxMana: 10,
  };
}

function makeSummon(spLike, atk, hp, teamIdx) {
  bUid += 1;
  return {
    uid: `b${bUid}`, runId: null, speciesId: spLike.id, name: spLike.name, art: spLike.art,
    tier: spLike.tier, team: teamIdx, level: 1, abilKey: 1, abilities: [],
    atk, baseAtk: atk, hp, maxHp: hp, shield: 0, alive: true, lapCount: 0,
    thisAttackBonus: 0, nextAttackBonus: 0, damageUp: {}, usedTurn: {}, usedRotation: {},
    usedBattle: {}, killedBy: null, overkill: 0, revived: false, summoned: true,
    manaUnit: false, manaSupply: false, mana: 0, maxMana: 0,
  };
}

// ── 스냅샷 / 이벤트 ───────────────────────────────────────────────
function snapTeam(team) {
  return {
    frontIdx: team.frontIdx,
    units: team.units.map((u) => ({
      uid: u.uid, speciesId: u.speciesId, name: u.name, art: u.art, tier: u.tier,
      atk: u.atk, hp: Math.max(0, u.hp), maxHp: u.maxHp, shield: u.shield,
      level: u.level, abilKey: u.abilKey, lapCount: u.lapCount,
      trigger: u.abilities[0]?.trigger || null,
      manaUnit: u.manaUnit, mana: u.mana, maxMana: u.maxMana,
    })),
  };
}
function snapshot(state) {
  return { turn: state.turn, teams: [snapTeam(state.teams[0]), snapTeam(state.teams[1])] };
}
function emit(state, type, data = {}) {
  state.events.push({ type, ...data, snap: snapshot(state) });
}
function logLine(state, text) {
  state.logs.push(text);
  state.events.push({ type: 'log', text, snap: snapshot(state) });
}

// ── 대상 해석 ─────────────────────────────────────────────────────
// 사망 판정은 4.1 의 5단계에서 확정되므로 체력 0 이하이면서 아직 제거되지 않은 유닛이 존재한다.
// 대상 선택에서는 이런 "쓰러지는 중"인 유닛을 제외한다. 그래야 처치 트리거의 피해가
// 방금 죽인 대상에게 낭비되지 않는다 (사이클롭스의 "다른 적" 표현과도 일치).
// 예외는 self — 트롤처럼 피해받음으로 자신을 회복해 사망을 면하는 처리는 유지된다.
const isLive = (u) => !!u && u.alive && u.hp > 0;
const allies = (state, u) => state.teams[u.team].units.filter(isLive);
const enemies = (state, u) => state.teams[1 - u.team].units.filter(isLive);
const enemyTeam = (state, u) => state.teams[1 - u.team];
const ownTeam = (state, u) => state.teams[u.team];

function pickBy(list, better) {
  if (!list.length) return [];
  let best = list[0];
  for (const u of list) if (better(u, best)) best = u;
  return [best];
}

function resolveTargets(state, unit, effect, ctx) {
  const n = effect.count || 1;
  const rng = state.rng;
  const alive = isLive;

  switch (effect.target) {
    case 'self': return [unit];
    case 'randomAlly':
    case 'randomAllies': return rng.sample(allies(state, unit), n);
    case 'allAlly': return allies(state, unit);
    case 'allAllyOther': return allies(state, unit).filter((u) => u !== unit);
    case 'lowestHpAlly': return pickBy(allies(state, unit), (a, b) => a.hp < b.hp);
    case 'lowestHpOtherAlly':
      return pickBy(allies(state, unit).filter((u) => u !== unit), (a, b) => a.hp < b.hp);
    case 'randomEnemy': return rng.sample(enemies(state, unit), n);
    case 'allEnemy': return enemies(state, unit);
    case 'lowestHpEnemy': return pickBy(enemies(state, unit), (a, b) => a.hp < b.hp);
    case 'highestAtkEnemy': return pickBy(enemies(state, unit), (a, b) => a.atk > b.atk);
    case 'attacker': return alive(ctx.attacker) ? [ctx.attacker] : [];
    case 'attackTarget': return alive(ctx.attackTarget) ? [ctx.attackTarget] : [];
    case 'targetBackEnemy': {
      if (!ctx.attackTarget) return [];
      const t = behindUnit(enemyTeam(state, unit), ctx.attackTarget);
      return alive(t) ? [t] : [];
    }
    case 'targetAndBackEnemy': {
      if (!ctx.attackTarget) return [];
      const back = behindUnit(enemyTeam(state, unit), ctx.attackTarget);
      const out = [];
      if (alive(ctx.attackTarget)) out.push(ctx.attackTarget);
      if (alive(back) && back !== ctx.attackTarget) out.push(back);
      return out;
    }
    case 'targetNeighborEnemies':
      if (!ctx.attackTarget) return [];
      return neighborUnits(enemyTeam(state, unit), ctx.attackTarget).filter(alive);
    case 'randomEnemiesExcludingTarget':
      return rng.sample(enemies(state, unit).filter((u) => u !== ctx.attackTarget), n);
    // 'frontUnit' = 앞 유닛(회전 방향 한 칸 앞), 'backUnit' = 뒤 유닛
    case 'frontUnit': {
      const t = aheadUnit(ownTeam(state, unit), unit);
      return alive(t) ? [t] : [];
    }
    case 'backUnit': {
      const t = behindUnit(ownTeam(state, unit), unit);
      return alive(t) ? [t] : [];
    }
    case 'neighbors': return neighborUnits(ownTeam(state, unit), unit).filter(alive);
    case 'killedBy': return alive(unit.killedBy) ? [unit.killedBy] : [];
    // 연금술사(마나 공급 유닛) 전용 대상 — 마나 유닛이 아닌 아군은 걸러낸다 (6.2절)
    case 'frontManaUnit': {
      const t = aheadUnit(ownTeam(state, unit), unit);
      return alive(t) && t.manaUnit ? [t] : [];
    }
    case 'backManaUnit': {
      const t = behindUnit(ownTeam(state, unit), unit);
      return alive(t) && t.manaUnit ? [t] : [];
    }
    case 'frontAndBackManaUnits': {
      const f = aheadUnit(ownTeam(state, unit), unit);
      const b = behindUnit(ownTeam(state, unit), unit);
      const out = [];
      if (alive(f) && f.manaUnit) out.push(f);
      if (alive(b) && b.manaUnit && b !== f) out.push(b);
      return out;
    }
    case 'allAllyManaUnits': return allies(state, unit).filter((u) => u.manaUnit);
    default: return [];
  }
}

// ── 피해 / 회복 / 버프 ────────────────────────────────────────────
const damageUpTotal = (t) => Object.values(t.damageUp).reduce((s, v) => s + v, 0);

function dealDamage(state, source, target, rawAmount, opts = {}) {
  if (!target || !target.alive || rawAmount <= 0) return { dealt: 0, killed: false };

  let amount = rawAmount;
  const bonus = damageUpTotal(target);
  if (bonus > 0) {
    amount += bonus;
    target.damageUp = {}; // 다음 피해에 더한 뒤 제거
  }

  let remain = amount;
  if (target.shield > 0) {
    const absorbed = Math.min(target.shield, remain);
    target.shield -= absorbed;
    remain -= absorbed;
  }
  const hpBefore = target.hp;
  target.hp -= remain;

  emit(state, 'damage', {
    uid: target.uid, amount, hpDamage: remain, sourceUid: source?.uid || null,
  });

  if (target.hp <= 0) {
    target.overkill = Math.max(0, remain - Math.max(0, hpBefore));
    if (source) target.killedBy = source;
  }

  // 보호막 정산 후 체력 피해를 1 이상 받았을 때 피해받음이 발동한다.
  // 피해받음 능력으로 발생한 피해(reactive)는 다른 피해받음을 다시 발동하지 않는다.
  if (remain >= 1 && !opts.reactive) {
    fireOn(state, target, 'ON_DAMAGED', { attacker: source });
  }

  checkDeaths(state);
  return { dealt: remain, killed: target.hp <= 0 };
}

function heal(state, target, amount) {
  if (!target || !target.alive || amount <= 0) return;
  const before = target.hp;
  target.hp = Math.min(target.maxHp, target.hp + amount);
  if (target.hp !== before) emit(state, 'heal', { uid: target.uid, amount: target.hp - before });
}

function addShield(state, target, amount) {
  if (!target || !target.alive || amount <= 0) return;
  target.shield += amount;
  emit(state, 'shield', { uid: target.uid, amount });
}

function buff(state, target, atk, hp) {
  if (!target || !target.alive || (!atk && !hp)) return;
  if (atk) target.atk = Math.max(0, target.atk + atk);
  if (hp) { target.maxHp += hp; target.hp += hp; }
  emit(state, 'buff', { uid: target.uid, atk: atk || 0, hp: hp || 0 });
}

function debuffAtk(state, target, amount) {
  if (!target || !target.alive || amount <= 0) return;
  target.atk = Math.max(0, target.atk - amount); // 공격력은 0 미만이 되지 않는다
  emit(state, 'debuff', { uid: target.uid, atk: -amount });
}

// ── 마나 (5.4절) ──────────────────────────────────────────────────
// 마나 유닛만 마나를 보유한다. 최대 10, 전투 종료 시 0으로 초기화(새 전투마다 재생성되므로 자동 충족).
function gainMana(state, target, amount) {
  if (!target || !target.alive || !target.manaUnit || amount <= 0) return;
  const before = target.mana;
  target.mana = Math.min(target.maxMana || 10, target.mana + amount);
  if (target.mana !== before) emit(state, 'mana', { uid: target.uid, amount: target.mana - before, mana: target.mana });
}

// 마나를 얻은 유닛의 현재 레벨 능력 중 마나 조건(manaGate)을 확인해 충족하면 즉시 발동한다.
// 자기 트리거로 얻었든 다른 유닛이 부여했든 같은 규칙을 따른다 (6.2절) — 한 번의 획득 이벤트당 1회.
function checkManaGates(state, unit, ctx) {
  if (!unit || !unit.alive) return;
  unit.abilities.forEach((ability) => {
    const eff = abilityEffect(ability, unit.level);
    if (!eff) return;
    const gates = eff.op === 'manaGate' ? [eff] : (eff.op === 'multi' ? (eff.effects || []).filter((e) => e.op === 'manaGate') : []);
    for (const gate of gates) {
      if (unit.mana < gate.threshold) continue;
      unit.mana -= gate.threshold;
      emit(state, 'trigger', {
        uid: unit.uid, trigger: ability.trigger, label: '마나', text: effectText(gate.then),
      });
      logLine(state, `${unit.name} · 마나 ${gate.threshold} → ${effectText(gate.then)}`);
      applyEffect(state, unit, gate.then, ctx);
    }
  });
}

// ── 효과 실행 ─────────────────────────────────────────────────────
function applyEffect(state, unit, effect, ctx) {
  if (!effect) return;
  if (effect.op === 'multi') {
    for (const e of effect.effects || []) applyEffect(state, unit, e, ctx);
    return;
  }
  if (effect.condition === 'hpHigherThanTarget') {
    const t = ctx.attackTarget;
    if (!t || !(unit.hp > t.hp)) return;
  }
  if (effect.condition === 'targetAlive') {
    if (!isLive(ctx.attackTarget)) return;
  }

  const targets = effect.target ? resolveTargets(state, unit, effect, ctx) : [];

  switch (effect.op) {
    case 'damage':
      for (const t of targets) dealDamage(state, unit, t, effect.amount, { reactive: effect.reactive });
      break;
    case 'heal':
      for (const t of targets) heal(state, t, effect.amount);
      break;
    case 'shield':
      for (const t of targets) addShield(state, t, effect.amount);
      break;
    case 'buff':
    // 전투 중 permBuff 는 일시 버프와 동일하게 동작한다. 영구 반영은 상점 트리거가 담당한다.
    case 'permBuff':
      for (const t of targets) buff(state, t, effect.atk || 0, effect.hp || 0);
      break;
    case 'debuffAtk':
      for (const t of targets) debuffAtk(state, t, effect.amount);
      break;
    case 'summon':
      doSummon(state, unit, effect);
      break;
    case 'revive':
      unit.hp = Math.max(1, Math.round((unit.maxHp * effect.pct) / 100));
      unit.shield = 0;
      unit.revived = true;
      emit(state, 'revive', { uid: unit.uid, hp: unit.hp });
      break;
    case 'markDamageUp':
      for (const t of targets) {
        const key = unit.speciesId; // 같은 출처끼리는 중첩되지 않는다
        t.damageUp[key] = Math.max(t.damageUp[key] || 0, effect.amount);
        emit(state, 'mark', { uid: t.uid, amount: effect.amount });
      }
      break;
    case 'transferAtk':
      for (const t of targets) buff(state, t, Math.floor((unit.atk * effect.pct) / 100), 0);
      break;
    case 'thisAttackBonus':
      unit.thisAttackBonus += effect.amount;
      emit(state, 'note', { uid: unit.uid, text: `이번 공격 +${effect.amount}` });
      break;
    case 'nextAttackBonus':
      for (const t of targets) {
        t.nextAttackBonus += effect.amount;
        emit(state, 'note', { uid: t.uid, text: `다음 공격 +${effect.amount}` });
      }
      break;
    case 'extraAttack':
      oneSidedAttack(state, unit, { pct: effect.pct });
      break;
    case 'orderAttack':
      for (const t of targets) oneSidedAttack(state, t, { pct: effect.pct });
      break;
    case 'overkillSplash': {
      const over = ctx.overkill || 0;
      const dmg = Math.floor((over * effect.pct) / 100);
      if (dmg <= 0) break;
      const pool = enemies(state, unit).filter((u) => u !== ctx.victim).sort((a, b) => b.hp - a.hp);
      for (const t of pool.slice(0, effect.count || 1)) dealDamage(state, unit, t, dmg);
      break;
    }
    case 'gainMana':
      gainMana(state, unit, effect.amount);
      checkManaGates(state, unit, ctx);
      break;
    case 'manaGate':
      gainMana(state, unit, effect.gain);
      checkManaGates(state, unit, ctx);
      break;
    case 'grantMana':
      for (const t of targets) { gainMana(state, t, effect.amount); checkManaGates(state, t, ctx); }
      break;
    case 'manaValueDamage': {
      const mana = unit.mana; // 보유 마나 — 효과 해결 직전의 현재 마나 수치
      const amount = effect.mode === 'double' ? mana * 2 : effect.mode === 'plus' ? mana + (effect.bonus || 0) : mana;
      for (const t of targets) dealDamage(state, unit, t, amount);
      break;
    }
    default:
      break;
  }
}

function doSummon(state, parent, effect) {
  const team = state.teams[parent.team];
  if (team.units.filter((u) => u.alive).length >= MAX_RING) return; // 링이 꽉 차면 소환하지 않는다
  let s;
  if (effect.self) {
    // 자기 자신 재소환 — 원래 최대 체력은 유지한 채, 지정한 비율만큼 체력을 채워 새 개체로 등장한다.
    // 새 개체는 능력을 물려받지 않아 같은 전투에서 무한히 재소환되지 않는다.
    const hp = Math.max(1, Math.round((parent.maxHp * effect.pct) / 100));
    s = makeSummon({ id: parent.speciesId, name: parent.name, art: parent.art, tier: parent.tier }, parent.atk, hp, parent.team);
    s.maxHp = parent.maxHp;
    s.level = parent.level;
    s.abilKey = parent.abilKey;
  } else {
    s = makeSummon({ id: 'SUM-01', name: effect.name, art: effect.art, tier: effect.tier || 1 }, effect.atk, effect.hp, parent.team);
  }
  const idx = team.units.indexOf(parent);
  const at = idx >= 0 ? idx + 1 : team.units.length;
  team.units.splice(at, 0, s);
  if (at <= team.frontIdx) team.frontIdx += 1;
  emit(state, 'summon', { uid: s.uid, parentUid: parent.uid, self: !!effect.self });
}

// ── 트리거 ────────────────────────────────────────────────────────
const limitKey = (ability, idx) => (ability.source === 'granted' ? `g:${ability.grantId}` : `s:${idx}`);

function fireOn(state, unit, trigger, ctx = {}) {
  if (!unit || !unit.alive) return;
  if (state.depth >= MAX_DEPTH) return;
  state.depth += 1;
  try {
    unit.abilities.forEach((ability, idx) => {
      if (ability.trigger !== trigger) return;
      const key = limitKey(ability, idx);
      if (ability.oncePerTurn && unit.usedTurn[key]) return;
      if (ability.oncePerRotation && unit.usedRotation[key]) return;
      if (ability.oncePerBattle && unit.usedBattle[key]) return;

      const eff = abilityEffect(ability, unit.level);
      if (!eff) return;

      if (ability.oncePerTurn) unit.usedTurn[key] = true;
      if (ability.oncePerRotation) unit.usedRotation[key] = true;
      if (ability.oncePerBattle) unit.usedBattle[key] = true;

      // manaGate 는 능력 문구 전체("마나 획득 / 마나 n → 효과")를 늘 보여주지만,
      // 실시간 로그에는 이번에 실제로 일어난 마나 획득만 알린다. 조건을 만족한 효과는
      // checkManaGates 가 그 순간 별도로 알린다.
      const liveText = eff.op === 'manaGate' ? `마나 ${eff.gain} 획득` : effectText(eff);
      emit(state, 'trigger', {
        uid: unit.uid, trigger, label: triggerName(trigger), text: liveText,
      });
      logLine(state, `${unit.name} · ${triggerName(trigger)} → ${liveText}`);
      applyEffect(state, unit, eff, ctx);
    });
  } finally {
    state.depth -= 1;
  }
}

// 처리 순서: 전선 유닛 우선 → 회전 방향 순서 → 레벨 높은 쪽 → 아군 → 적군
function orderedUnits(state) {
  const out = [];
  for (const teamIdx of [0, 1]) {
    const team = state.teams[teamIdx];
    const n = team.units.length;
    team.units.forEach((u, i) => {
      const pos = n ? (((team.frontIdx - i) % n) + n) % n : 0;
      out.push({ u, teamIdx, pos });
    });
  }
  out.sort((a, b) => (a.pos - b.pos) || (b.u.level - a.u.level) || (a.teamIdx - b.teamIdx));
  return out.map((e) => e.u);
}

function fireAll(state, trigger, ctxFor = () => ({})) {
  for (const u of orderedUnits(state)) if (u.alive) fireOn(state, u, trigger, ctxFor(u));
}

// ── 사망 판정 · 링 압축 ───────────────────────────────────────────
function checkDeaths(state) {
  if (state.deferDeaths || state.resolvingDeaths) return;
  state.resolvingDeaths = true;
  try {
    let guard = 0;
    while (guard < MAX_DEPTH) {
      guard += 1;
      const dying = [];
      for (const team of state.teams) {
        for (const u of team.units) if (u.alive && u.hp <= 0) dying.push(u);
      }
      if (!dying.length) return;

      // 처치 → 사망 → 아군 사망 순서로 해결한다 (제거·압축 전)
      for (const v of dying) {
        if (v.killedBy && v.killedBy.alive) {
          fireOn(state, v.killedBy, 'ON_KILL', { victim: v, overkill: v.overkill });
        }
      }

      const confirmed = [];
      for (const v of dying) {
        if (v.hp > 0) continue; // 회복으로 살아남았다
        v.revived = false;
        fireOn(state, v, 'ON_DEATH', { victim: v });
        if (v.revived && v.hp > 0) continue; // 부활 성공
        v.alive = false;
        confirmed.push(v);
        emit(state, 'death', { uid: v.uid });
        logLine(state, `${v.name} 사망`);
      }

      for (const v of confirmed) {
        for (const a of state.teams[v.team].units) {
          if (a !== v && a.alive) fireOn(state, a, 'ON_ALLY_DEATH', { victim: v });
        }
      }

      if (confirmed.length) {
        for (const teamIdx of [0, 1]) {
          if (confirmed.some((v) => v.team === teamIdx)) compress(state, teamIdx);
        }
        emit(state, 'compress', {});
      }
    }
  } finally {
    state.resolvingDeaths = false;
  }
}

// 링 압축. 전선 유닛이 죽으면 뒤 유닛이 그 자리를 물려받는다.
// 이 승계가 교전 단계에서 일어났다면 그 턴의 회전은 승계로 대체한다
// (다음 등판 유닛이 전선을 건너뛰지 않도록).
function compress(state, teamIdx) {
  const team = state.teams[teamIdx];
  const n = team.units.length;
  if (!n) return;
  const front = team.units[((team.frontIdx % n) + n) % n];
  const frontDied = front && !front.alive;

  let successor = null;
  if (frontDied) {
    for (let k = 1; k < n; k++) {
      const u = team.units[(team.frontIdx + k) % n];
      if (u.alive) { successor = u; break; }
    }
  }

  team.units = team.units.filter((u) => u.alive);
  if (!team.units.length) { team.frontIdx = 0; return; }

  if (frontDied) {
    team.frontIdx = Math.max(0, successor ? team.units.indexOf(successor) : 0);
    if (state.phase === 'combat') team.rotationConsumed = true;
  } else {
    team.frontIdx = Math.max(0, team.units.indexOf(front));
  }
  // 링이 압축되면 한 바퀴 카운터는 리셋된다.
  for (const u of team.units) u.lapCount = 0;
}

// ── 공격 ──────────────────────────────────────────────────────────
function attackPower(unit, pctValue) {
  const base = pctValue === 100 ? unit.atk : Math.floor((unit.atk * pctValue) / 100);
  let power = base + unit.thisAttackBonus;
  if (unit.nextAttackBonus > 0) {
    power += unit.nextAttackBonus;
    unit.nextAttackBonus = 0;
  }
  return Math.max(0, power);
}

// 추가 공격 · 즉시 공격 — 반격 없는 일방 공격.
// 해당 유닛의 공격 전·공격·공격 후를 발동한다.
function oneSidedAttack(state, attacker, { pct = 100 } = {}) {
  if (!isLive(attacker)) return;
  const foe = frontUnit(state.teams[1 - attacker.team]);
  if (!isLive(foe)) return;

  emit(state, 'attack', { attackers: [attacker.uid], targets: [foe.uid], extra: true });
  fireOn(state, attacker, 'ON_ATTACK', { attackTarget: foe });
  fireOn(state, attacker, 'ON_BEFORE_ATTACK', { attackTarget: foe });

  if (isLive(attacker) && isLive(foe)) dealDamage(state, attacker, foe, attackPower(attacker, pct));
  attacker.thisAttackBonus = 0;
  if (attacker.alive) fireOn(state, attacker, 'ON_AFTER_ATTACK', { attackTarget: foe });
}

function exchange(state) {
  const a = frontUnit(state.teams[0]);
  const b = frontUnit(state.teams[1]);
  if (!a || !b) return;

  emit(state, 'attack', { attackers: [a.uid, b.uid], targets: [b.uid, a.uid] });

  // 공격 선언 (공격 전보다 먼저)
  fireOn(state, a, 'ON_ATTACK', { attackTarget: b });
  fireOn(state, b, 'ON_ATTACK', { attackTarget: a });
  // 공격 준비
  fireOn(state, a, 'ON_BEFORE_ATTACK', { attackTarget: b });
  fireOn(state, b, 'ON_BEFORE_ATTACK', { attackTarget: a });

  // 전선 교전 — 동시 피해. 상호 처치가 가능해야 하므로 사망 판정을 미뤄 둔다.
  const bothReady = isLive(a) && isLive(b);
  const aPow = bothReady ? attackPower(a, 100) : 0;
  const bPow = bothReady ? attackPower(b, 100) : 0;
  state.deferDeaths = true;
  try {
    if (aPow > 0) dealDamage(state, a, b, aPow);
    if (bPow > 0) dealDamage(state, b, a, bPow);
  } finally {
    state.deferDeaths = false;
  }
  a.thisAttackBonus = 0;
  b.thisAttackBonus = 0;

  checkDeaths(state);

  // 공격 마무리 — 교전과 사망 판정을 통과해 생존한 공격자만
  if (a.alive) fireOn(state, a, 'ON_AFTER_ATTACK', { attackTarget: b });
  if (b.alive) fireOn(state, b, 'ON_AFTER_ATTACK', { attackTarget: a });
}

// ── 회전 ──────────────────────────────────────────────────────────
function doRotation(state) {
  state.phase = 'rotate';
  const info = [];
  for (const teamIdx of [0, 1]) {
    const team = state.teams[teamIdx];
    if (!team.units.length) { info.push({ teamIdx, dir: 0, moved: false, steps: 0 }); continue; }
    for (const u of team.units) u.usedRotation = {};

    if (team.units.length <= 1) {
      // 유닛이 하나만 남으면 돌 자리가 없다 — 회전 기믹을 발동하지 않고 자리 유지로 취급한다.
      team.rotationConsumed = false;
      info.push({ teamIdx, dir: 0, moved: false, steps: 0 });
      continue;
    }

    if (team.rotationConsumed) {
      // 압축 승계로 이미 다음 유닛이 전선에 섰다. 위치는 그대로 두고 트리거만 진행한다.
      team.rotationConsumed = false;
      info.push({ teamIdx, dir: 1, moved: false, steps: 1, consumed: true });
      continue;
    }
    const r = rotate(team);
    info.push({ teamIdx, dir: r.dir, moved: r.moved, steps: r.moved ? r.steps : 0, skipped: r.skipped });
  }

  emit(state, 'rotate', { info });

  // 회전이 없었던 팀(유닛 하나만 남은 팀)의 유닛에는 회전 트리거가 발동하지 않는다.
  for (const u of orderedUnits(state)) {
    if (!u.alive || state.teams[u.team].units.length <= 1) continue;
    fireOn(state, u, 'ON_ROTATE', {});
  }

  // 한 바퀴 — 링 칸 수만큼 회전해 완주했을 때
  for (const teamIdx of [0, 1]) {
    const team = state.teams[teamIdx];
    const n = ringSize(team);
    if (!n) continue;
    const rec = info.find((i) => i.teamIdx === teamIdx);
    const steps = rec?.steps || 0;
    if (!steps) continue;
    for (const u of team.units.slice()) {
      if (!u.alive) continue;
      u.lapCount += steps;
      if (u.lapCount >= n) {
        u.lapCount -= n;
        emit(state, 'lap', { uid: u.uid });
        fireOn(state, u, 'ON_LAP', {});
      }
    }
  }
  checkDeaths(state);
}

// ── 전투 실행 ─────────────────────────────────────────────────────
export function simulateBattle(playerRing, enemyRing, opts = {}) {
  const mkTeam = (ring, idx, reverse) => ({
    units: ring.map((u) => toBattleUnit(u, idx)),
    frontIdx: 0,
    reverseNext: !!reverse,
    skipNext: false,
    fastNext: false,
    rotationConsumed: false,
  });

  const state = {
    rng: makeRng(opts.seed || 12345),
    turn: 0,
    depth: 0,
    phase: 'start',
    deferDeaths: false,
    resolvingDeaths: false,
    events: [],
    logs: [],
    teams: [mkTeam(playerRing, 0, opts.reverseStart), mkTeam(enemyRing, 1, false)],
  };

  emit(state, 'battle_start', {});
  if (opts.reverseStart) logLine(state, '나침반 — 첫 회전이 역회전으로 시작한다');

  fireAll(state, 'ON_BATTLE_START', () => ({}));
  checkDeaths(state);

  let result = null;
  const decide = () => {
    const a = state.teams[0].units.length > 0;
    const b = state.teams[1].units.length > 0;
    if (!a && !b) return 'draw';
    if (!b) return 'win';
    if (!a) return 'lose';
    return null;
  };
  result = decide();

  while (!result) {
    state.turn += 1;
    if (state.turn > MAX_TURNS) { result = 'draw'; break; }

    emit(state, 'turn_start', { turn: state.turn });
    for (const team of state.teams) for (const u of team.units) u.usedTurn = {};

    state.phase = 'combat';
    exchange(state);
    result = decide();
    if (result) break;

    doRotation(state);
    result = decide();
  }

  const label = result === 'win' ? '승리' : result === 'lose' ? '패배' : '무승부';
  emit(state, 'end', { result, turn: Math.min(state.turn, MAX_TURNS) });
  logLine(state, `전투 종료 — ${label} (${Math.min(state.turn, MAX_TURNS)}턴)`);

  return { result, events: state.events, logs: state.logs, turns: Math.min(state.turn, MAX_TURNS) };
}
