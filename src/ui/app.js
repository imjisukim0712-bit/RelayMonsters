// 씬 라우터

import { renderLobby, renderRunEnd } from './lobby.js';
import { renderShop } from './shopScene.js';
import { playBattle } from './battleScene.js';
import { renderBgShop } from './bgShop.js';
import { renderCodex, renderRules } from './codex.js';
import { modal, toast, confirmDialog } from './dom.js';
import { newRun, prepareOpponent, battleOptions, applyBattleResult, TOTAL_ROUNDS } from '../engine/run.js';
import { simulateBattle } from '../engine/battle.js';
import { loadRun, saveRun, clearRun, getMeta } from '../storage/save.js';
import { sprite } from './unitView.js';
import { speciesById } from '../data/species.js';

export function startApp(root) {
  let run = loadRun();
  let scene = null;

  function swap(fn) {
    if (scene?.destroy) scene.destroy();
    scene = null;
    document.querySelectorAll('#toasts .toast').forEach((n) => n.remove());
    root.scrollTop = 0;
    scene = fn() || null;
  }

  function goLobby() {
    swap(() => renderLobby(root, {
      hasRun: Boolean(run),
      onContinue: () => goShop(),
      onNewRun: async () => {
        if (run) {
          const ok = await confirmDialog('진행 중인 런이 삭제됩니다. 새 게임을 시작할까요?', { okText: '새 게임' });
          if (!ok) return;
        }
        clearRun();
        run = newRun();
        saveRun(run);
        goShop();
      },
      onBgShop: () => swap(() => renderBgShop(root, { onBack: goLobby })),
      onCodex: () => swap(() => renderCodex(root, { onBack: goLobby })),
      onRules: () => swap(() => renderRules(root, { onBack: goLobby })),
    }));
  }

  function goShop() {
    if (!run) { run = newRun(); saveRun(run); }
    const meta = getMeta();
    swap(() => renderShop(root, {
      run,
      backgroundId: meta.selectedBackground,
      onStartBattle: () => goBattle(),
      onQuit: () => goLobby(),
    }));
  }

  async function goBattle() {
    const meta = getMeta();
    root.innerHTML = '<div class="scene loading"><div class="spinner"></div><p>상대를 찾고 있습니다…</p></div>';
    let opponent;
    try {
      opponent = await prepareOpponent(run);
    } catch (e) {
      console.warn(e);
      opponent = null;
    }
    if (!opponent || !opponent.ring.length) {
      toast('상대를 불러오지 못했습니다', 'warn');
      goShop();
      return;
    }

    const battle = simulateBattle(run.ring, opponent.ring, battleOptions(run));
    swap(() => playBattle(root, {
      run,
      battle,
      opponentLabel: opponent.label,
      backgroundId: meta.selectedBackground,
      onDone: (result) => showResult(result, battle, opponent),
    }));
  }

  function showResult(result, battle, opponent) {
    const label = result === 'win' ? '승리' : result === 'lose' ? '패배' : '무승부';
    const detail = result === 'win'
      ? `라운드 ${run.round} → ${Math.min(TOTAL_ROUNDS, run.round + 1)}`
      : result === 'lose'
        ? `생명 ${run.lives} → ${run.lives - 1} · 같은 라운드 재도전`
        : '생명 소모 없이 같은 라운드 재도전';

    const m = modal(`<div class="result-card result-${result}">
      <div class="result-title">${label}</div>
      <div class="result-sub">${battle.turns}턴 · ${opponent.label}</div>
      <p class="result-detail">${detail}</p>
      <div class="result-log">${battle.logs.slice(-6).map((l) => `<div>${l}</div>`).join('')}</div>
      <button class="btn big primary" data-act="next">계속</button>
    </div>`, { wide: true });

    m.box.addEventListener('click', async (e) => {
      if (!e.target.closest('[data-act="next"]')) return;
      m.close();
      const next = await applyBattleResult(run, result);
      if (next === 'clear' || next === 'over') {
        const finished = run;
        run = null;
        swap(() => renderRunEnd(root, { run: finished, cleared: next === 'clear', onBack: goLobby }));
      } else {
        goShop();
      }
    });
  }

  goLobby();
  return { goLobby, goShop };
}

export { sprite, speciesById };
