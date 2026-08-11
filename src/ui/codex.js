// 도감 · 규칙 화면

import { SPECIES_LIST, TIER_COLORS, TIER_NAMES, TIER_BUDGET, TRIGGERS } from '../data/species.js';
import { ITEM_LIST } from '../data/items.js';
import { itemSprite } from '../art/items.js';
import { sprite, statChips } from './unitView.js';
import { speciesAbilityLines } from '../engine/text.js';
import { speciesAbilityList } from '../engine/unit.js';
import { getMeta } from '../storage/save.js';
import { modal } from './dom.js';
import { MAX_TURNS } from '../engine/battle.js';

export function renderCodex(root, { onBack }) {
  let filterTier = 0;
  let filterTrigger = '';

  function draw() {
    const meta = getMeta();
    const seen = new Set(meta.seenSpecies || []);
    const list = SPECIES_LIST.filter(
      (s) => (!filterTier || s.tier === filterTier)
        && (!filterTrigger || speciesAbilityList(s).some((a) => a.trigger === filterTrigger)),
    );

    root.innerHTML = `
    <div class="scene codex-scene">
      <header class="hud">
        <div class="hud-left">
          <button class="btn tiny ghost" data-act="back">← 메뉴</button>
          <h2 class="panel-title">도감 <small>${seen.size}/${SPECIES_LIST.length} 조우</small></h2>
        </div>
        <div class="hud-right">
          <button class="btn tiny ghost" data-act="items">소모품 목록</button>
        </div>
      </header>

      <div class="filters">
        <div class="filter-row">
          <button class="pill${filterTier === 0 ? ' on' : ''}" data-tier="0">전체</button>
          ${[1, 2, 3, 4, 5, 6].map((t) => `<button class="pill${filterTier === t ? ' on' : ''}" data-tier="${t}" style="--tier:${TIER_COLORS[t]}">T${t} ${TIER_NAMES[t]}</button>`).join('')}
        </div>
        <div class="filter-row">
          <button class="pill sm${filterTrigger === '' ? ' on' : ''}" data-trigger="">모든 기믹</button>
          ${Object.entries(TRIGGERS).map(([k, v]) => `<button class="pill sm${filterTrigger === k ? ' on' : ''}" data-trigger="${k}">${v}</button>`).join('')}
        </div>
      </div>

      <div class="codex-grid">
        ${list.map((s) => codexCard(s, seen.has(s.id))).join('')}
      </div>
      ${list.length === 0 ? '<p class="panel-note">해당 조건의 종이 없습니다.</p>' : ''}
    </div>`;
  }

  function codexCard(s, seenIt) {
    const lines = speciesAbilityLines(speciesAbilityList(s));
    const manaTag = s.manaUnit ? '<span class="mana-tag">마나 유닛</span>' : s.manaSupply ? '<span class="mana-tag">마나 공급 유닛</span>' : '';
    return `<article class="codex-card${seenIt ? ' seen' : ''}" data-id="${s.id}" style="--tier:${TIER_COLORS[s.tier]}">
      <div class="cc-top">
        <div class="cc-art">${sprite(s.art)}</div>
        <div class="cc-head">
          <div class="cc-name">${s.name} <span class="tier-tag">${s.id}</span>${manaTag}</div>
          ${statChips({ atk: s.atk, hp: s.hp, manaUnit: !!s.manaUnit, mana: 0, maxMana: 10 })}
          <div class="cc-budget">예산 ${s.atk * 2 + s.hp}/${TIER_BUDGET[s.tier]}</div>
        </div>
      </div>
      <ul class="cc-abil">${lines.map((l) => `<li><b>Lv${l.key}</b><span>${l.text}</span></li>`).join('')}</ul>
      <div class="cc-sil">${s.silhouette || ''}</div>
    </article>`;
  }

  function onClick(e) {
    const btn = e.target.closest('[data-act], [data-tier], [data-trigger]');
    if (!btn) return;
    if (btn.dataset.act === 'back') { root.removeEventListener('click', onClick); onBack(); return; }
    if (btn.dataset.act === 'items') { showItems(); return; }
    if (btn.dataset.tier != null) { filterTier = Number(btn.dataset.tier); draw(); return; }
    if (btn.dataset.trigger != null) { filterTrigger = btn.dataset.trigger; draw(); }
  }

  root.addEventListener('click', onClick);
  draw();
}

function showItems() {
  modal(`<div class="items-doc">
    <h3>소모품</h3>
    <div class="items-list">
      ${ITEM_LIST.map((it) => `<div class="item-row">
        <div class="item-art">${itemSprite(it.art)}</div>
        <div><b>${it.name}</b> <span class="item-price">${it.price}G</span><br><span class="item-desc">${it.desc}</span></div>
      </div>`).join('')}
    </div>
    <p class="panel-note">대상 유닛에게 사용하는 아이템은 해당 유닛의 「아이템 사용」 능력을 한 번 발동합니다. 대상이 없는 나침반·행운의동전·재도전권은 발동시키지 않습니다.</p>
  </div>`, { wide: true });
}

export function renderRules(root, { onBack }) {
  root.innerHTML = `
  <div class="scene rules-scene">
    <header class="hud">
      <div class="hud-left">
        <button class="btn tiny ghost" id="backBtn">← 메뉴</button>
        <h2 class="panel-title">규칙</h2>
      </div>
    </header>
    <div class="rules-body">
      <section>
        <h3>링 시스템</h3>
        <ul>
          <li>링의 칸 수 = 살아있는 유닛 수. 빈칸은 없고 최대 6칸이다.</li>
          <li>유닛이 죽으면 링이 즉시 <b>압축</b>되어 한 칸 작아진다. 남은 유닛의 상대 순서는 유지된다.</li>
          <li>전선 유닛이 사망하면 <b>뒤 유닛</b>이 그 자리를 물려받고, 그 턴의 회전은 이 승계로 대체된다.</li>
          <li>매 턴 종료 시 링이 시계 방향으로 1칸 회전한다. 개별 유닛을 빼내거나 자리를 바꾸는 효과는 없다.</li>
          <li>1번 슬롯 유닛이 1턴째 전선에 서고, 이후 슬롯 순서대로 등판한다.</li>
        </ul>
      </section>
      <section>
        <h3>위치 용어</h3>
        <ul>
          <li><b>전선</b> — 상대와 마주보며 실제로 공격을 주고받는 자리</li>
          <li><b>앞 유닛</b> — 회전 방향 한 칸 앞. 나보다 먼저 전선을 지난 아군</li>
          <li><b>뒤 유닛</b> — 회전 반대 방향 한 칸 뒤. 나 다음에 전선에 설 아군</li>
          <li>앞과 뒤가 같은 유닛을 가리키면 효과는 한 번만 적용된다.</li>
        </ul>
      </section>
      <section>
        <h3>턴 시퀀스</h3>
        <ol class="seq">
          <li>턴 시작</li>
          <li>공격 선언 → <b>공격</b> 트리거</li>
          <li>공격 준비 → <b>공격 전</b> 트리거</li>
          <li>전선 교전 — 양쪽이 동시에 피해 (상호 처치 가능) → <b>피해받음</b></li>
          <li>사망 판정 → <b>처치 · 사망 · 아군 사망</b> → 링 압축</li>
          <li>공격 마무리 → <b>공격 후</b> (생존한 공격자만)</li>
          <li>회전 → <b>회전 · 한 바퀴</b></li>
          <li>승패 판정</li>
        </ol>
      </section>
      <section>
        <h3>승패</h3>
        <ul>
          <li>승리 — 상대 링 전멸 → 라운드 +1</li>
          <li>패배 — 아군 링 전멸 → 생명 −1, 같은 라운드 재도전</li>
          <li>무승부 — ${MAX_TURNS}턴 초과 또는 동시 전멸 → 생명 소모 없이 재도전</li>
          <li>총 18라운드, 생명 3개. 라운드는 승리해야만 오른다.</li>
        </ul>
      </section>
      <section>
        <h3>성장</h3>
        <ul>
          <li>경험치 1당 공격력 +1, 체력 +1. 최대 레벨은 5.</li>
          <li>필요 경험치 — Lv2:3 / Lv3:7 / Lv4:12 / Lv5:18 (누적)</li>
          <li>능력 승급은 <b>Lv3 · Lv5</b> 두 지점에서 일어난다.</li>
          <li>합치기 — 같은 종 위에 겹치면 드롭 대상이 남고 경험치가 전부 전이된다. 영구 버프는 더 높은 쪽을 계승한다.</li>
        </ul>
      </section>
      <section>
        <h3>경제</h3>
        <ul>
          <li>라운드 기본 골드 — R1~6 10G / R7~12 12G / R13~18 14G. <b>이월 없음</b></li>
          <li>유닛 3G · 리롤 1G · 판매 환급은 누적 경험치만큼(최대 5G)</li>
          <li>소수정예는 에이스 등판 주기가 짧고, 만석은 인접·광역 연계 총량이 크다. 링을 <b>일부러 줄이는 플레이</b>도 유효 전략이다.</li>
        </ul>
      </section>
    </div>
  </div>`;
  root.querySelector('#backBtn').addEventListener('click', onBack);
}
