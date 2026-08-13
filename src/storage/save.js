// 세이브 데이터 (기획서 14.4)
// version 3 스키마. 코인·배경 보유 목록은 런 데이터가 아닌 meta 에 저장한다.

import { DEFAULT_BACKGROUND } from '../data/backgrounds.js';

const KEY = 'relaymonsters.save.v3';
export const SAVE_VERSION = 3;

function defaultMeta() {
  return {
    bestRound: 0,
    clears: 0,
    coins: 0,
    ownedBackgrounds: [DEFAULT_BACKGROUND],
    selectedBackground: DEFAULT_BACKGROUND,
    mySnapshots: [],
    totalRuns: 0,
    seenSpecies: [],
    teamName: '',
    seenTutorial: false,
  };
}

function defaultSave() {
  return { version: SAVE_VERSION, run: null, meta: defaultMeta() };
}

let cache = null;

function migrate(raw) {
  const data = { ...defaultSave(), ...raw };
  data.meta = { ...defaultMeta(), ...(raw.meta || {}) };
  // bg_grass 는 신규 세이브와 마이그레이션된 기존 세이브에 항상 자동 지급한다.
  if (!data.meta.ownedBackgrounds.includes(DEFAULT_BACKGROUND)) {
    data.meta.ownedBackgrounds = [DEFAULT_BACKGROUND, ...data.meta.ownedBackgrounds];
  }
  if (!data.meta.ownedBackgrounds.includes(data.meta.selectedBackground)) {
    data.meta.selectedBackground = DEFAULT_BACKGROUND;
  }
  data.version = SAVE_VERSION;
  return data;
}

export function loadSave() {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? migrate(JSON.parse(raw)) : defaultSave();
  } catch (e) {
    console.warn('세이브를 읽지 못했습니다. 새로 시작합니다.', e);
    cache = defaultSave();
  }
  return cache;
}

export function commitSave() {
  if (!cache) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch (e) {
    console.warn('세이브를 저장하지 못했습니다.', e);
  }
}

export function getMeta() {
  return loadSave().meta;
}

export function updateMeta(patch) {
  const s = loadSave();
  s.meta = { ...s.meta, ...patch };
  commitSave();
  return s.meta;
}

export function addCoins(n) {
  const meta = getMeta();
  return updateMeta({ coins: Math.max(0, meta.coins + n) }).coins;
}

export function saveRun(run) {
  const s = loadSave();
  s.run = run;
  commitSave();
}

export function loadRun() {
  return loadSave().run;
}

export function clearRun() {
  const s = loadSave();
  s.run = null;
  commitSave();
}

export function markSpeciesSeen(ids) {
  const meta = getMeta();
  const set = new Set(meta.seenSpecies || []);
  let changed = false;
  for (const id of ids) if (!set.has(id)) { set.add(id); changed = true; }
  if (changed) updateMeta({ seenSpecies: [...set] });
}

export function resetAll() {
  cache = defaultSave();
  commitSave();
}
