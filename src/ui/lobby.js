// 로비 / 메인 메뉴

import { getMeta } from '../storage/save.js';
import { backgroundById } from '../data/backgrounds.js';
import { backgroundSvg } from '../art/backgrounds.js';
import { sprite } from './unitView.js';
import { TOTAL_ROUNDS } from '../engine/run.js';
import { SPECIES_LIST, speciesById } from '../data/species.js';
import { backendName, MAX_TEAM_NAME } from '../storage/backend.js';
import { modal, escapeHtml } from './dom.js';

const SHOWCASE = ['dragonrider', 'phoenix', 'kraken', 'minotaur', 'unicorn'];

export function renderLobby(root, { hasRun, onContinue, onNewRun, onBgShop, onCodex, onRules }) {
  const meta = getMeta();
  const bg = backgroundById(meta.selectedBackground);

  root.innerHTML = `
  <div class="scene lobby-scene">
    <div class="lobby-bg">${backgroundSvg(meta.selectedBackground)}</div>
    <div class="lobby-inner">
      <div class="title-block">
        <h1 class="game-title">Relay<span>Monsters</span></h1>
        <p class="tagline">원형 링 위에서 몬스터들이 매 턴 배턴을 넘기며 싸우는 회전 오토배틀러</p>
      </div>

      <div class="showcase">${SHOWCASE.map((k, i) => `<div class="show-unit s${i}">${sprite(k)}</div>`).join('')}</div>

      <div class="menu">
        ${hasRun ? '<button class="btn big primary" id="continueBtn">이어하기</button>' : ''}
        <button class="btn big ${hasRun ? 'ghost' : 'primary'}" id="newBtn">${hasRun ? '새 게임 (진행 중인 런 삭제)' : '게임 시작'}</button>
        <div class="menu-row">
          <button class="btn" id="bgBtn">배경 상점</button>
          <button class="btn" id="codexBtn">도감 ${meta.seenSpecies?.length || 0}/${SPECIES_LIST.length}</button>
          <button class="btn" id="rulesBtn">규칙</button>
        </div>
      </div>

      <div class="meta-bar">
        ${meta.teamName ? `<span class="meta-item">팀 이름 <b>${escapeHtml(meta.teamName)}</b></span>` : ''}
        <span class="meta-item"><b>${meta.coins}</b> 코인</span>
        <span class="meta-item">최고 라운드 <b>${meta.bestRound}</b>/${TOTAL_ROUNDS}</span>
        <span class="meta-item">클리어 <b>${meta.clears}</b></span>
        <span class="meta-item">배경 <b>${bg.name}</b></span>
        <span class="meta-item dim">멀티 백엔드: ${backendName() === 'local' ? '로컬 (Firebase 미연결)' : backendName()}</span>
      </div>
    </div>
  </div>`;

  root.querySelector('#continueBtn')?.addEventListener('click', onContinue);
  root.querySelector('#newBtn')?.addEventListener('click', onNewRun);
  root.querySelector('#bgBtn')?.addEventListener('click', onBgShop);
  root.querySelector('#codexBtn')?.addEventListener('click', onCodex);
  root.querySelector('#rulesBtn')?.addEventListener('click', onRules);
}

// 런 종료 화면
export function renderRunEnd(root, { run, cleared, onBack }) {
  const meta = getMeta();
  root.innerHTML = `
  <div class="scene end-scene">
    <div class="end-card ${cleared ? 'clear' : 'over'}">
      <div class="end-title">${cleared ? '클리어!' : '탈락'}</div>
      <p class="end-sub">${cleared
    ? `18라운드를 모두 승리했습니다.`
    : `R${Math.min(TOTAL_ROUNDS, run.round)} 에서 생명이 모두 소진되었습니다.`}</p>
      <div class="end-stats">
        <div><span>라운드 승리</span><b>${run.wins}</b></div>
        <div><span>도달 라운드</span><b>R${Math.min(TOTAL_ROUNDS, run.round)}</b></div>
        <div><span>획득 코인</span><b>+${run.coinsEarned || 0}</b></div>
        <div><span>보유 코인</span><b>${meta.coins}</b></div>
      </div>
      <div class="end-ring">${(run.ring || []).map((u) => {
    const sp = speciesById(u.speciesId);
    return sp ? `<div class="end-unit" title="${sp.name}">${sprite(sp.art)}</div>` : '';
  }).join('')}</div>
      <button class="btn big primary" id="backBtn">메인 메뉴로</button>
    </div>
  </div>`;
  root.querySelector('#backBtn').addEventListener('click', onBack);
}

// 새 게임 시작 전 팀 이름 입력 — 상대에게 공개되는 이름이라 매 런 시작 시 확인한다.
export function promptTeamName(defaultName = '') {
  return new Promise((resolve) => {
    let decided = false;
    const finish = (v) => { if (!decided) { decided = true; resolve(v); } };

    const m = modal(`<div class="team-name-prompt">
      <h3>팀 이름을 정해주세요</h3>
      <p class="hint">전투 화면과 상대 플레이어에게 공개되는 이름입니다.</p>
      <input type="text" id="teamNameInput" maxlength="${MAX_TEAM_NAME}"
        placeholder="예: 새벽의 릴레이" value="${escapeHtml(defaultName)}" autocomplete="off" />
      <div class="confirm-actions">
        <button class="btn ghost" data-act="cancel">취소</button>
        <button class="btn primary" data-act="ok">시작</button>
      </div>
    </div>`, { onClose: () => finish(null) });

    const input = m.box.querySelector('#teamNameInput');
    input.focus();
    input.select();

    const submit = () => {
      const v = input.value.trim();
      if (!v) { input.classList.add('invalid'); input.focus(); return; }
      finish(v);
      m.close();
    };

    m.box.addEventListener('click', (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (!act) return;
      if (act === 'ok') submit();
      else { finish(null); m.close(); }
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); submit(); }
    });
  });
}
