// 런 진행 · 라운드 · 생명 (기획서 9장)

import { rollShop, baseGoldForRound, shopTierFor } from './shop.js';
import { presetBot, BOT_VARIANTS } from '../data/bots.js';
import { ringFromSnapshot } from '../data/bots.js';
import { fetchOpponent, uploadSnapshot, makeSnapshot } from '../storage/backend.js';
import { addCoins, getMeta, updateMeta, saveRun, clearRun, markSpeciesSeen } from '../storage/save.js';
import { randomSeed } from './rng.js';

export const TOTAL_ROUNDS = 18;
export const START_LIVES = 3;

// 런 종료 보상 — 라운드 승리당 8코인, 클리어 시 150코인 추가
export const COINS_PER_WIN = 8;
export const COINS_ON_CLEAR = 150;

export function newRun() {
  const run = {
    round: 1,
    wins: 0,
    lives: START_LIVES,
    gold: 0,
    shopTier: 1,
    retryTicketUsed: false,
    bonusGold: 0,
    reverseNextBattle: false,
    ring: [],
    shop: { units: [], items: [] },
    seenSnapshots: [],
    status: 'shop',
    lastResult: null,
    opponentLabel: '',
    teamName: getMeta().teamName || '이름 없는 팀',
  };
  enterShop(run, { fresh: true });
  return run;
}

// 라운드 시작 — 골드는 이월되지 않고 리셋된다
export function enterShop(run, { fresh = false, keepGold = false } = {}) {
  run.shopTier = shopTierFor(run.round);
  if (!keepGold) {
    run.gold = baseGoldForRound(run.round) + (run.bonusGold || 0);
    run.bonusGold = 0;
  }
  run.status = 'shop';
  rollShop(run, randomSeed());
  if (!fresh) saveRun(run);
  return run;
}

// 상대 결정 — 스냅샷 풀이 얕으면 프리셋 봇으로 폴백한다
export async function prepareOpponent(run) {
  const snap = await fetchOpponent({ round: run.round, wins: run.wins, seen: run.seenSnapshots });
  if (snap) {
    run.seenSnapshots.push(snap.snapshotId);
    const teamName = snap.teamName || '익명의 팀';
    return {
      ring: ringFromSnapshot(snap),
      label: `${teamName} · R${snap.round} (${snap.wins}승)`,
      teamName,
      source: 'snapshot',
    };
  }
  const variant = Math.floor(Math.random() * BOT_VARIANTS.length);
  const bot = presetBot(run.round, variant);
  return { ring: bot.ring, label: `프리셋 봇 · ${bot.name}`, teamName: bot.name, source: 'bot' };
}

export function battleOptions(run) {
  const opts = { seed: randomSeed(), reverseStart: !!run.reverseNextBattle };
  return opts;
}

export async function applyBattleResult(run, result) {
  run.lastResult = result;
  run.reverseNextBattle = false;

  if (result === 'win') {
    run.wins += 1;
    // 승리한 링을 스냅샷으로 남긴다 (비동기 멀티 업로드 단위)
    try {
      const snap = makeSnapshot({
        round: run.round, wins: run.wins, lives: run.lives, ring: run.ring, teamName: run.teamName,
      });
      await uploadSnapshot(snap);
    } catch (e) {
      console.warn('스냅샷 업로드를 건너뜁니다.', e);
    }
    run.round += 1;
  } else if (result === 'lose') {
    run.lives -= 1;
  }
  // 무승부는 생명을 소모하지 않고 같은 라운드를 재도전한다

  const meta = getMeta();
  const reached = Math.min(TOTAL_ROUNDS, run.round);
  if (reached > (meta.bestRound || 0)) updateMeta({ bestRound: reached });
  markSpeciesSeen(run.ring.map((u) => u.speciesId));

  if (run.round > TOTAL_ROUNDS) {
    run.status = 'clear';
    finishRun(run, true);
    return 'clear';
  }
  if (run.lives <= 0) {
    run.status = 'over';
    finishRun(run, false);
    return 'over';
  }
  enterShop(run);
  return 'shop';
}

function finishRun(run, cleared) {
  const meta = getMeta();
  const coins = run.wins * COINS_PER_WIN + (cleared ? COINS_ON_CLEAR : 0);
  run.coinsEarned = coins;
  addCoins(coins);
  updateMeta({
    totalRuns: (meta.totalRuns || 0) + 1,
    clears: (meta.clears || 0) + (cleared ? 1 : 0),
  });
  clearRun();
}

export function roundBandLabel(round) {
  if (round <= 3) return '튜토리얼 구간';
  if (round <= 6) return '첫 시너지 형성';
  if (round <= 9) return '빌드 방향 확정';
  if (round <= 12) return '노선 분기점';
  if (round <= 15) return '극단화 구간';
  return '결승 3연전';
}
