import { MONSTERS } from './data.js';

const SAVE_KEY = 'starweave-sanctuary-v1';
const MAX_LEVEL = 50;
const TRAINING = {
  attack: { name: '風切りの稽古', cost: 18 },
  defense: { name: '岩守りの稽古', cost: 16 },
  agility: { name: '星渡りの稽古', cost: 16 },
  magicAttack: { name: '星詠みの稽古', cost: 20 },
};
export const REGIONS = [
  { id: 'meadow', name: 'こもれびの浮島', description: '風の糸が結ぶ、はじまりの草原。小さな出会いが待っている。', element: 'wind', cost: 20, reward: 150 },
  { id: 'tide', name: '月しずくの水庭', description: '水面に沈んだ月の記憶。氷と水の精霊が集う場所。', element: 'water', cost: 25, reward: 210 },
  { id: 'forge', name: '灯火の鉱石谷', description: '大地の鼓動と雷鳴が響く、あたたかな鉱石の渓谷。', element: 'fire', cost: 30, reward: 280 },
  { id: 'eclipse', name: '宵星の忘れ庭', description: 'ほどけた夜空の向こう。光と影が最後の星糸を守る。', element: 'dark', cost: 35, reward: 360 },
];
const REGION_ELEMENTS = {
  meadow: ['neutral', 'wind', 'earth'], tide: ['water', 'ice'],
  forge: ['fire', 'thunder', 'earth'], eclipse: ['light', 'dark', 'poison'],
};

const freshProfile = () => ({ level: 1, xp: 0, bond: 35, training: { attack: 0, defense: 0, agility: 0, magicAttack: 0 }, lastPetDay: 0 });
const freshState = () => ({
  version: 1, day: 1, gold: 1200, crystals: 12, food: 20, energy: 80,
  bond: 35, level: 1, xp: 0, selectedId: 'm01', owned: ['m01', 'm06', 'm11'],
  history: ['星暦 01 日 — ほどけた空を、きみと結びなおす。星織りの庭へようこそ。'],
  training: { attack: 0, defense: 0, agility: 0, magicAttack: 0 },
  questProgress: { feeds: 0, training: 0, explorations: 0, breeding: 0, victories: 0, restored: 0 },
  lastDailyDay: 0, storyChapter: 0,
  profiles: Object.fromEntries(['m01', 'm06', 'm11'].map(id => [id, freshProfile()])),
});
const bounded = (value, fallback, max = 999999) => Number.isFinite(value) ? Math.max(0, Math.min(max, Math.floor(value))) : fallback;
function readProfile(raw = {}) {
  const profile = freshProfile();
  profile.level = Math.max(1, bounded(raw.level, 1, MAX_LEVEL));
  profile.xp = bounded(raw.xp, 0);
  profile.bond = bounded(raw.bond, 35, 100);
  profile.lastPetDay = bounded(raw.lastPetDay, 0);
  for (const key of Object.keys(profile.training)) profile.training[key] = bounded(raw.training?.[key], 0, 200);
  return profile;
}
function syncActiveProfile(state) {
  state.profiles ||= {};
  for (const id of state.owned) state.profiles[id] ||= freshProfile();
  const previous = state.profiles[state.selectedId] || freshProfile();
  state.profiles[state.selectedId] = readProfile({ ...previous, level: state.level, xp: state.xp, bond: state.bond, training: state.training });
}
function activateProfile(state, id) {
  const profile = state.profiles[id] ||= freshProfile();
  state.selectedId = id;
  state.level = profile.level;
  state.xp = profile.xp;
  state.bond = profile.bond;
  state.training = { ...profile.training };
}
export function selectMonster(state, id) {
  if (!state.owned.includes(id) || !MONSTERS.some(monster => monster.id === id)) return 'まだ庭の仲間になっていません。';
  syncActiveProfile(state);
  activateProfile(state, id);
  saveGame(state);
  return `${getMonster(state).name} と過ごしましょう。`;
}
export function loadGame() {
  const initial = freshState();
  try {
    const raw = globalThis.localStorage?.getItem(SAVE_KEY);
    if (!raw) return initial;
    const saved = JSON.parse(raw);
    if (!saved || saved.version !== 1 || typeof saved !== 'object') return initial;
    const result = { ...initial };
    for (const key of ['gold', 'crystals', 'food', 'xp', 'lastDailyDay']) result[key] = bounded(saved[key], initial[key]);
    result.day = Math.max(1, bounded(saved.day, 1));
    result.level = Math.max(1, bounded(saved.level, 1, MAX_LEVEL));
    result.energy = bounded(saved.energy, 80, 100);
    result.bond = bounded(saved.bond, 35, 100);
    result.storyChapter = bounded(saved.storyChapter, 0, 4);
    const validIds = new Set(MONSTERS.map(m => m.id));
    if (Array.isArray(saved.owned)) {
      result.owned = [...new Set(saved.owned.filter(id => validIds.has(id)))];
      if (!result.owned.length) result.owned = [...initial.owned];
    }
    result.selectedId = result.owned.includes(saved.selectedId) ? saved.selectedId : result.owned[0];
    for (const key of Object.keys(initial.training)) result.training[key] = bounded(saved.training?.[key], 0, 200);
    for (const key of Object.keys(initial.questProgress)) result.questProgress[key] = bounded(saved.questProgress?.[key], 0);
    if (Array.isArray(saved.history)) result.history = saved.history.filter(item => typeof item === 'string').slice(-40);
    result.profiles = {};
    for (const id of result.owned) {
      // v1 migration preserves the previous shared progress on the active monster.
      // Other monsters begin independently rather than inheriting cloned upgrades.
      const rawProfile = saved.profiles?.[id];
      result.profiles[id] = rawProfile && typeof rawProfile === 'object'
        ? readProfile(rawProfile)
        : id === result.selectedId ? readProfile(result) : freshProfile();
    }
    activateProfile(result, result.selectedId);
    return result;
  } catch { return initial; }
}

export function saveGame(state) {
  syncActiveProfile(state);
  try {
    globalThis.localStorage?.setItem(SAVE_KEY, JSON.stringify(state));
    return Boolean(globalThis.localStorage);
  } catch { return false; }
}

export function getMonster(state) {
  const source = MONSTERS.find(m => m.id === state.selectedId) || MONSTERS[0];
  if (!source) return null;
  const stats = { ...source.stats };
  for (const key of Object.keys(stats)) {
    if (key !== 'accuracy' && key !== 'evasion') stats[key] = Math.round(stats[key] * (1 + (state.level - 1) * 0.055));
    stats[key] += state.training[key] || 0;
  }
  return { ...source, stats, level: state.level, bond: state.bond };
}

function rewardXP(state, amount) {
  state.xp += amount;
  let levels = 0;
  while (state.level < MAX_LEVEL && state.xp >= state.level * 60) {
    state.xp -= state.level * 60;
    state.level += 1;
    levels += 1;
  }
  if (state.level === MAX_LEVEL) state.xp = 0;
  return levels ? ` レベル ${state.level} に成長！` : '';
}
function record(state, message) {
  state.history.push(`${state.day} 日目 — ${message}`);
  state.history = state.history.slice(-40);
  saveGame(state);
  return message;
}
function story(state) {
  const restored = Math.min(4, Math.floor(state.questProgress.explorations / 3));
  if (restored <= state.storyChapter) return '';
  state.storyChapter = restored;
  state.questProgress.restored = restored;
  const chapters = [
    '', '最初の星糸がつながり、庭の風見灯に明かりが戻った。',
    '水庭の記憶がよみがえった。空を裂いたのは争いではなく、忘れられた約束だった。',
    '鉱石谷の鐘が鳴る。モンスターとの絆が、失われた星座の形を教えてくれる。',
    '四つの星糸が結ばれた。きみと仲間たちの庭が、世界の新しい星座になった。',
  ];
  state.crystals += 5;
  return ` ${chapters[restored]} 星晶 +5。`;
}
export function feed(state) {
  if (state.food < 1) return 'ごはんが足りません。探索で食材を集めましょう。';
  if (state.bond >= 100 && state.energy >= 100) return 'おなかも気持ちもいっぱい！ 今は一緒に冒険したそうです。';
  state.food -= 1;
  state.bond = Math.min(100, state.bond + 7);
  state.energy = Math.min(100, state.energy + 9);
  state.questProgress.feeds += 1;
  return record(state, `${getMonster(state).name} は星麦クッキーを夢中で食べた。絆 +7、元気 +9。${rewardXP(state, 8)}`);
}
export function train(state, kind = 'attack') {
  const plan = Object.hasOwn(TRAINING, kind) ? TRAINING[kind] : null;
  if (!plan) return 'そのトレーニングはまだありません。';
  if (state.energy < plan.cost) return `元気が足りません（必要 ${plan.cost}）。休息かごはんで回復しましょう。`;
  if (state.training[kind] >= 200) return 'この能力の稽古を極めました！ ほかの能力を伸ばしましょう。';
  state.energy -= plan.cost;
  const gain = state.bond >= 70 ? 3 : 2;
  state.training[kind] = Math.min(200, state.training[kind] + gain);
  state.bond = Math.min(100, state.bond + 2);
  state.questProgress.training += 1;
  return record(state, `${plan.name}を達成。能力 +${gain}、絆 +2。${rewardXP(state, 25)}`);
}
export function rest(state) {
  state.day += 1;
  state.energy = 100;
  state.food += 2;
  return record(state, '雲の毛布でぐっすり。新しい朝、元気が全回復。庭の収穫でごはん +2。');
}
export function explore(state, region = 'meadow') {
  const area = REGIONS.find(r => r.id === (typeof region === 'string' ? region : region?.id));
  if (!area) return 'その浮島への航路は見つかりません。';
  if (state.energy < area.cost) return `探索には元気 ${area.cost} が必要です。庭で休んでから出発しましょう。`;
  state.energy -= area.cost;
  state.gold += area.reward;
  state.food += 2;
  state.crystals += 1;
  state.bond = Math.min(100, state.bond + 3);
  state.questProgress.explorations += 1;
  const candidates = MONSTERS.filter(m => REGION_ELEMENTS[area.id].includes(m.element) && !state.owned.includes(m.id));
  let encounter = '';
  // Every third expedition guarantees an encounter; bond improves other attempts.
  if (candidates.length && (state.questProgress.explorations % 3 === 0 || Math.random() < 0.35 + state.bond / 400)) {
    const found = candidates[Math.floor(Math.random() * candidates.length)];
    state.owned.push(found.id);
    encounter = ` ${found.name} が星糸をたどり、庭の仲間になった！`;
  }
  return record(state, `${area.name}を探索。星貨 +${area.reward}、ごはん +2、星晶 +1。${encounter}${rewardXP(state, 35)}${story(state)}`);
}
export function breed(state, partnerId) {
  if (state.owned.length < 2) return '星結びには、ふたり以上の仲間が必要です。';
  const mateId = partnerId ?? state.owned.find(id => id !== state.selectedId);
  if (mateId === state.selectedId || !state.owned.includes(mateId)) return '星結びの相手には、別の仲間を選んでください。';
  const partner = MONSTERS.find(monster => monster.id === mateId);
  if (!partner) return 'その仲間の星糸が見つかりません。';
  if (state.crystals < 6) return '星結びには星晶が 6 個必要です。探索や朝の贈り物で集めましょう。';
  const candidates = MONSTERS.filter(m => !state.owned.includes(m.id));
  if (!candidates.length) return '50 体すべての星糸がつながっています。庭の図鑑は完成しました！';
  const current = getMonster(state);
  const related = candidates.filter(m => m.element === current.element || m.element === partner.element);
  const pool = related.length && Math.random() < 0.6 ? related : candidates;
  const found = pool[Math.floor(Math.random() * pool.length)];
  state.crystals -= 6;
  state.owned.push(found.id);
  state.questProgress.breeding += 1;
  return record(state, `星晶 6 個で ${current.name} と ${partner.name} の記憶を結んだ。新しい命、${found.name} が誕生！ 親の仲間も庭に残ります。`);
}
export function claimDaily(state) {
  if (state.lastDailyDay >= state.day) return '今日の朝の贈り物は受け取り済みです。次の朝をお楽しみに。';
  state.lastDailyDay = state.day;
  state.gold += 200;
  state.food += 3;
  state.crystals += 2;
  return record(state, '風の郵便屋から朝の贈り物。星貨 +200、ごはん +3、星晶 +2。');
}

export function pet(state) {
  syncActiveProfile(state);
  const profile = state.profiles[state.selectedId];
  if (profile.lastPetDay >= state.day) return `${getMonster(state).name} は嬉しそうに寄り添っている。今日のふれあいは受け取り済みです。`;
  profile.lastPetDay = state.day;
  const gain = state.bond < 100 ? 1 : 0;
  state.bond = Math.min(100, state.bond + 1);
  return record(state, `${getMonster(state).name} を優しくなでた。${gain ? '絆 +1。' : '絆は最高です。'} 小さなぬくもりが手のひらに伝わる。`);
}

export function buySupplies(state, item) {
  const offers = {
    food: { cost: 120, amount: 5, label: 'ごはん' },
    crystal: { cost: 300, amount: 3, label: '星晶' },
  };
  const offer = Object.hasOwn(offers, item) ? offers[item] : null;
  if (!offer) return 'その品物は取り扱っていません。';
  if (state.gold < offer.cost) return `星貨が足りません。${offer.label}の購入には ${offer.cost} 星貨が必要です。`;
  state.gold -= offer.cost;
  state[item === 'crystal' ? 'crystals' : 'food'] += offer.amount;
  return record(state, `${offer.cost} 星貨で${offer.label}を ${offer.amount} 個購入しました。`);
}
