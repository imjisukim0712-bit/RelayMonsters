// 전투 배경 (기획서 12.5 / 13.4 / 14.5)
// 배경은 시각 요소만 바꾼다. 스탯·상점 확률·전투 규칙에 영향을 주지 않는다.
// 모든 배경은 sky / distant / ground / ringPath 레이어를 제공한다.

export const BACKGROUND_LIST = [
  {
    id: 'bg_grass', name: '풀밭', priceCoins: 0, defaultUnlocked: true,
    desc: '기본 배경. 낮은 풀과 먼 언덕.',
    palette: {
      sky: ['#DCF0FF', '#EFF9FF'], distant: '#BCE0A8', distant2: '#A8D492',
      ground: '#9FD07E', ground2: '#8CC63F', ringPath: '#C9B98A', accent: '#7FB247',
    },
  },
  {
    id: 'bg_sunset', name: '노을 초원', priceCoins: 250, defaultUnlocked: false,
    desc: '해가 낮게 걸린 초원. 긴 그림자가 깔린다.',
    palette: {
      sky: ['#FFD9A8', '#FFEFD2'], distant: '#E0A97C', distant2: '#C98E68',
      ground: '#C9A96B', ground2: '#B9954F', ringPath: '#8E6E43', accent: '#E88B4A',
    },
  },
  {
    id: 'bg_snow', name: '설원', priceCoins: 350, defaultUnlocked: false,
    desc: '얕게 쌓인 눈과 서늘한 하늘.',
    palette: {
      sky: ['#D8EAF7', '#F2FAFF'], distant: '#C3D8E8', distant2: '#AEC8DC',
      ground: '#EAF4FB', ground2: '#D5E7F3', ringPath: '#B7CEDE', accent: '#8FB8D4',
    },
  },
  {
    id: 'bg_desert', name: '메마른 사구', priceCoins: 350, defaultUnlocked: false,
    desc: '바람이 지나간 모래 능선.',
    palette: {
      sky: ['#FFE9BE', '#FFF7E3'], distant: '#E8CE9A', distant2: '#D9BA80',
      ground: '#F0D9A4', ground2: '#DFC287', ringPath: '#BD9C60', accent: '#C9A25E',
    },
  },
  {
    id: 'bg_cave', name: '이끼 동굴', priceCoins: 500, defaultUnlocked: false,
    desc: '천장에서 새어 드는 빛과 이끼 바닥.',
    palette: {
      sky: ['#2F3A4A', '#43526A'], distant: '#3C5348', distant2: '#33473E',
      ground: '#4E6B53', ground2: '#3F5A45', ringPath: '#6E8A6A', accent: '#7FB247',
    },
  },
  {
    id: 'bg_void', name: '별의 회랑', priceCoins: 800, defaultUnlocked: false,
    desc: '떠 있는 석판과 성운.',
    palette: {
      sky: ['#2A2340', '#3D3260'], distant: '#4A3D70', distant2: '#3B3159',
      ground: '#4C4172', ground2: '#3E355F', ringPath: '#7A6BA8', accent: '#FFC93C',
    },
  },
];

export const BACKGROUNDS = Object.fromEntries(BACKGROUND_LIST.map((b) => [b.id, b]));
export const DEFAULT_BACKGROUND = 'bg_grass';

export function backgroundById(id) {
  return BACKGROUNDS[id] || BACKGROUNDS[DEFAULT_BACKGROUND];
}
