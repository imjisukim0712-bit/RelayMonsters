// 능력 문구 생성 (기획서 14.2 — 문구는 데이터에서 파생한다)

import { TRIGGERS } from '../data/species.js';

function hasJong(word) {
  const c = word.charCodeAt(word.length - 1);
  if (Number.isNaN(c) || c < 0xac00 || c > 0xd7a3) return false;
  return (c - 0xac00) % 28 !== 0;
}
function josa(w, withJong, withoutJong) {
  return w + (hasJong(w) ? withJong : withoutJong);
}
const iga = (w) => josa(w, '이', '가');
const eunneun = (w) => josa(w, '은', '는');

const COUNT_WORDS = { 1: '', 2: ' 둘', 3: ' 셋', 4: ' 넷' };

export function targetName(effect) {
  const n = effect.count || 1;
  // COUNT_WORDS[1] 은 빈 문자열이므로 ?? 로 판정해야 한다 (|| 를 쓰면 " 1" 이 붙는다)
  const cw = COUNT_WORDS[n] ?? ` ${n}`;
  switch (effect.target) {
    case 'self': return '자신';
    case 'randomAlly': return `무작위 아군${cw}`;
    case 'randomAllies': return `무작위 아군${cw}`;
    case 'allAlly': return '모든 아군';
    case 'allAllyOther': return '자신을 제외한 모든 아군';
    case 'lowestHpAlly': return '체력이 가장 낮은 아군';
    case 'lowestHpOtherAlly': return '체력이 가장 낮은 다른 아군';
    case 'randomEnemy': return `무작위 적${cw}`;
    case 'randomEnemiesExcludingTarget': return `공격 대상을 제외한 무작위 적${cw}`;
    case 'allEnemy': return '모든 적';
    case 'lowestHpEnemy': return '체력이 가장 낮은 적';
    case 'highestAtkEnemy': return '공격력이 가장 높은 적';
    case 'highestHpOtherEnemy': return `체력이 가장 높은 다른 적${cw}`;
    case 'attacker': return '공격한 적';
    case 'attackTarget': return '공격 대상';
    case 'targetBackEnemy': return '공격 대상의 뒤 적';
    case 'targetAndBackEnemy': return '공격 대상과 그 뒤 적';
    case 'targetNeighborEnemies': return '공격 대상의 앞 적과 뒤 적';
    case 'frontUnit': return '앞 유닛';
    case 'backUnit': return '뒤 유닛';
    case 'neighbors': return '앞 유닛과 뒤 유닛';
    case 'itemTarget': return '아이템 대상';
    default: return '대상';
  }
}

function statPhrase(effect, permanent) {
  const parts = [];
  if (effect.atk) parts.push(`공격력 ${effect.atk > 0 ? '+' : ''}${effect.atk}`);
  if (effect.hp) parts.push(`체력 ${effect.hp > 0 ? '+' : ''}${effect.hp}`);
  const body = parts.join(', ');
  return permanent ? `영구적으로 ${body}` : body;
}

// bare = true 이면 대상 표현을 생략한다 (multi 안에서 같은 대상이 반복될 때)
export function effectText(effect, bare = false) {
  if (!effect) return '—';
  const t = targetName(effect);
  const each = (effect.count || 1) > 1 ? '각각 ' : '';

  if (bare) {
    switch (effect.op) {
      case 'damage': return `${each}${effect.amount} 피해`;
      case 'heal': return `체력 ${effect.amount} 회복`;
      case 'shield': return `보호막 ${effect.amount} 획득`;
      case 'debuffAtk': return `공격력 -${effect.amount}`;
      case 'buff': return statPhrase(effect, false);
      case 'permBuff': return statPhrase(effect, true);
      default: break;
    }
  }

  switch (effect.op) {
    case 'multi': {
      // 같은 대상이 이어지면 두 번째부터 대상 표현을 생략한다
      const list = effect.effects || [];
      return list.map((e, i) => effectText(e, i > 0 && e.target === list[i - 1].target)).join(', ');
    }

    case 'damage': {
      const cond = effect.condition === 'targetAlive' ? '공격 대상이 생존했다면 ' : '';
      const tgt = effect.condition === 'targetAlive' && effect.target === 'attackTarget' ? '대상' : t;
      return `${cond}${tgt}에게 ${each}${effect.amount} 피해`;
    }
    case 'heal':
      return effect.target === 'self'
        ? `체력 ${effect.amount} 회복`
        : `${t} 체력 ${effect.amount} 회복`;
    case 'shield':
      return effect.target === 'self'
        ? `자신이 보호막 ${effect.amount} 획득`
        : `${iga(t)} 보호막 ${effect.amount} 획득`;
    case 'buff':
      return effect.target === 'self'
        ? statPhrase(effect, false)
        : `${t} ${statPhrase(effect, false)}`;
    case 'permBuff':
      return `${iga(t)} ${statPhrase(effect, true)}`;
    case 'debuffAtk':
      return `${t} 공격력 -${effect.amount}`;
    case 'summon':
      return `${effect.atk}/${effect.hp} ${effect.name} 소환`;
    case 'revive':
      return `체력 ${effect.pct}%로 부활`;
    case 'markDamageUp':
      return `${iga(t)} 다음에 받는 피해 +${effect.amount}, 중첩되지 않음`;
    case 'transferAtk':
      return `사망 직전 ${iga(t)} 자신의 공격력 ${effect.pct}% 획득`;
    case 'thisAttackBonus':
      return effect.condition === 'hpHigherThanTarget'
        ? `자신의 체력이 대상보다 높으면 이번 공격의 공격력 +${effect.amount}`
        : `이번 공격의 공격력 +${effect.amount}`;
    case 'nextAttackBonus':
      return `${iga(t)} 다음 공격에만 공격력 +${effect.amount}`;
    case 'extraAttack':
      return `공격 대상이 생존했다면 공격력 ${effect.pct}%로 추가 공격`;
    case 'orderAttack':
      return `${iga(t)} 공격력 ${effect.pct}%로 즉시 공격`;
    case 'overkillSplash': {
      const many = (effect.count || 1) > 1 ? `다른 적${COUNT_WORDS[effect.count] || ''}에게 각각` : '다른 적에게';
      return `초과 피해의 ${effect.pct}%를 체력이 가장 높은 ${many} 줌`;
    }
    case 'copyItem':
      return `사용한 아이템의 수치 효과 ${effect.pct}%를 ${t}에게 복제${effect.pct < 100 ? ', 소수점 버림' : ''}`;
    default:
      return effect.op;
  }
}

function limitSuffix(ability) {
  if (ability.oncePerTurn) return ', 턴당 1회';
  if (ability.oncePerRotation) return ', 회전당 1회';
  if (ability.oncePerBattle) return ', 전투당 1회';
  return '';
}

export function triggerName(trigger) {
  return TRIGGERS[trigger] || trigger;
}

// 한 줄 문구: "사망 → 무작위 아군 체력 +2"
export function abilityLine(ability, levelKey) {
  const eff = ability.flat || ability.levels?.[levelKey];
  if (!eff) return '—';
  return `${triggerName(ability.trigger)} → ${effectText(eff)}${limitSuffix(ability)}`;
}

// Lv1 / Lv3 / Lv5 세 줄 전부
export function abilityLines(ability) {
  if (ability.flat) return [{ key: 0, text: abilityLine(ability, 0) }];
  return [1, 3, 5].map((k) => ({ key: k, text: abilityLine(ability, k) }));
}
