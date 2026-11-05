import { SKILLS, ELEMENTS, STATUS_LABELS } from './data.js';

// Every element has useful matchups; neutral remains a dependable fallback.
const ADVANTAGES = {
  fire: ['ice', 'wind'], water: ['fire', 'earth'], wind: ['earth', 'poison'],
  earth: ['thunder', 'fire'], ice: ['wind', 'water'], thunder: ['water', 'light'],
  light: ['dark', 'poison'], dark: ['light', 'neutral'], poison: ['earth', 'water'],
  neutral: [],
};
export function typeMultiplier(attackElement, defenderElement) {
  if (!ELEMENTS[attackElement] || !ELEMENTS[defenderElement]) return 1;
  if (attackElement !== 'neutral' && attackElement === defenderElement) return 0.75;
  if (ADVANTAGES[attackElement]?.includes(defenderElement)) return 1.5;
  if (ADVANTAGES[defenderElement]?.includes(attackElement)) return 0.75;
  return 1;
}

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const has = (unit, id) => unit.statuses.some(status => status.id === id);
const random = battle => (battle.rng || Math.random)();
const label = id => typeof STATUS_LABELS[id] === 'string' ? STATUS_LABELS[id] : STATUS_LABELS[id]?.label || id;
const name = unit => unit.monster.name;
const addLog = (battle, message) => { battle.log.push(message); if (battle.log.length > 80) battle.log.shift(); };

function makeUnit(monster, level) {
  // getMonster() supplies final trained stats together with its level marker.
  // Only raw bestiary entries need level scaling at the combat boundary.
  const prepared = Number.isFinite(monster.level) && monster.level >= 1;
  level = prepared ? monster.level : Math.max(1, Number(level) || 1);
  const growth = prepared ? 1 : 1 + (level - 1) * 0.065;
  const base = { hp: 110, mp: 55, attack: 32, defense: 28, agility: 30, accuracy: 96, evasion: 5, magicAttack: 32, magicDefense: 28, ...monster.stats };
  const stats = Object.fromEntries(Object.entries(base).map(([key, value]) => [key,
    Math.round(Number(value) * (['accuracy', 'evasion'].includes(key) ? 1 : growth)),
  ]));
  return { monster, level, hp: Math.max(1, stats.hp), maxHp: Math.max(1, stats.hp), mp: Math.max(0, stats.mp), maxMp: Math.max(0, stats.mp), stats, statuses: [], buffs: {} };
}

export function createBattle(playerMonster, enemyMonster, level = 1) {
  return {
    player: makeUnit(playerMonster, level), enemy: makeUnit(enemyMonster, enemyMonster.level || level),
    turn: 1, log: [`${enemyMonster.name} がフィールドに現れた！`, '属性相性・魔力・状態異常を見極めて、技を選ぼう。'], result: null,
  };
}

function finish(battle) {
  battle.player.hp = Math.max(0, battle.player.hp);
  battle.enemy.hp = Math.max(0, battle.enemy.hp);
  if (battle.player.hp <= 0) battle.result = 'lose';
  else if (battle.enemy.hp <= 0) battle.result = 'win';
  if (battle.result && !battle.finishedLogged) {
    addLog(battle, battle.result === 'win' ? '勝利！ふたりの絆が、またひとつ強くなった。' : '今回はここまで。休んで、次の作戦を練ろう。');
    battle.finishedLogged = true;
  }
  return !!battle.result;
}

function canUse(unit, skill) {
  return skill && unit.mp >= (skill.cost || 0) && !(has(unit, 'seal') && skill.category !== 'physical');
}

function chooseEnemy(battle) {
  const unit = battle.enemy;
  const skills = unit.monster.skills.map(id => SKILLS[id]).filter(skill => canUse(unit, skill));
  const healing = skills.find(skill => skill.category === 'heal');
  if (unit.hp < unit.maxHp * 0.38 && healing) return healing.id;
  const ward = skills.find(skill => skill.category === 'buff');
  if (ward && !unit.buffs.ward && unit.hp > unit.maxHp * 0.55 && random(battle) < 0.22) return ward.id;
  const damaging = skills.filter(skill => ['physical', 'magic'].includes(skill.category));
  if (!damaging.length) return unit.mp < unit.maxMp ? 'rest' : 'struggle';
  if (unit.hp < unit.maxHp * 0.25 && random(battle) < 0.18) return 'guard';
  const ranked = damaging.map(skill => ({ skill, score: skill.power * typeMultiplier(skill.element, battle.player.monster.element) * (0.8 + random(battle) * 0.4) }));
  ranked.sort((a, b) => b.score - a.score);
  return ranked[0].skill.id;
}

function blocked(battle, unit) {
  if (has(unit, 'stun')) { addLog(battle, `${name(unit)} は気絶して動けない。`); return true; }
  if (has(unit, 'petrify')) { addLog(battle, `${name(unit)} は石化して動けない。`); return true; }
  if (has(unit, 'sleep')) { addLog(battle, `${name(unit)} は眠っている…。`); return true; }
  if (has(unit, 'freeze')) { addLog(battle, `${name(unit)} は凍って動けない。`); return true; }
  if (has(unit, 'paralysis') && random(battle) < 0.3) { addLog(battle, `${name(unit)} は麻痺で動けなかった。`); return true; }
  if (has(unit, 'confusion') && random(battle) < 0.35) {
    const damage = Math.max(1, Math.round(unit.maxHp * 0.07));
    unit.hp -= damage; addLog(battle, `${name(unit)} は混乱し、自分に ${damage} ダメージ！`); return true;
  }
  return false;
}

function execute(battle, unit, target, skillId) {
  if (unit.hp <= 0 || target.hp <= 0 || blocked(battle, unit)) return;
  if (skillId === 'guard') {
    unit.buffs.guard = 1; unit.mp = Math.min(unit.maxMp, unit.mp + 4);
    addLog(battle, `${name(unit)} は身を守った。受けるダメージを半減！`); return;
  }
  if (skillId === 'rest') {
    const recovered = Math.min(unit.maxMp - unit.mp, Math.max(8, Math.round(unit.maxMp * 0.3)));
    unit.mp += recovered; addLog(battle, `${name(unit)} は呼吸を整え、魔力が ${recovered} 回復。`); return;
  }
  const skill = skillId === 'struggle' ? { name: '体当たり', power: 28, cost: 0, category: 'physical', element: 'neutral', accuracy: 100 } : SKILLS[skillId];
  if (!canUse(unit, skill)) { addLog(battle, `${name(unit)} は技を使えなかった。魔力や封印状態を確認しよう。`); return; }
  unit.mp -= skill.cost || 0;
  addLog(battle, `${name(unit)} の「${skill.name}」！`);
  if (skill.category === 'heal') {
    const healed = Math.min(unit.maxHp - unit.hp, Math.round(unit.maxHp * clamp((skill.power || 30) / 100, 0.1, 0.6)));
    unit.hp += healed; addLog(battle, `体力が ${healed} 回復した。`); return;
  }
  if (skill.category === 'buff') {
    unit.buffs.ward = 4; addLog(battle, `${name(unit)} の防御力と魔防が3ターン上昇！`); return;
  }
  const skillAccuracy = (skill.accuracy ?? 100) <= 1 ? (skill.accuracy ?? 1) * 100 : (skill.accuracy ?? 100);
  const accuracy = clamp(skillAccuracy * unit.stats.accuracy / 100 - target.stats.evasion, 20, 100);
  if (random(battle) * 100 >= accuracy) { addLog(battle, `${name(target)} は攻撃をかわした！`); return; }
  const magical = skill.category === 'magic';
  const attack = unit.stats[magical ? 'magicAttack' : 'attack'] * (has(unit, 'weaken') ? 0.65 : 1) * (!magical && has(unit, 'burn') ? 0.8 : 1);
  const defense = target.stats[magical ? 'magicDefense' : 'defense'] * (target.buffs.ward ? 1.35 : 1) * (has(target, 'petrify') ? 1.4 : 1);
  const effectiveness = typeMultiplier(skill.element, target.monster.element);
  const critical = random(battle) < 0.08;
  const affinity = skill.element === unit.monster.element ? 1.15 : 1;
  const damage = Math.max(1, Math.round((skill.power || 20) * (attack + 25) / (defense + 40) * effectiveness * affinity * (critical ? 1.5 : 1) * (0.92 + random(battle) * 0.16) * (target.buffs.guard ? 0.5 : 1)));
  target.hp -= damage;
  addLog(battle, `${damage} ダメージ！${effectiveness > 1 ? ' 弱点を突いた！' : effectiveness < 1 ? ' 効果はいまひとつ。' : ''}${critical ? ' 会心の一撃！' : ''}`);
  if (has(target, 'sleep')) { target.statuses = target.statuses.filter(status => status.id !== 'sleep'); addLog(battle, `${name(target)} は目を覚ました。`); }
  if (skill.element === 'fire' && has(target, 'freeze')) { target.statuses = target.statuses.filter(status => status.id !== 'freeze'); addLog(battle, '炎で氷が溶けた！'); }
  if (skill.status && target.hp > 0) {
    const spec = typeof skill.status === 'string' ? { id: skill.status } : skill.status;
    const chance = spec.chance ?? skill.statusChance ?? 0.35;
    if (STATUS_LABELS[spec.id] && !has(target, spec.id) && random(battle) < (chance > 1 ? chance / 100 : chance)) {
      // +1 because the shared end-of-round pass immediately consumes one tick.
      const turns = spec.turns ?? (['stun', 'freeze', 'petrify'].includes(spec.id) ? 1 : 3);
      target.statuses.push({ id: spec.id, turns: turns + 1 });
      addLog(battle, `${name(target)} は「${label(spec.id)}」になった！`);
    }
  }
}

function endRound(battle, unit) {
  for (const status of unit.statuses) {
    if (['burn', 'poison'].includes(status.id)) {
      const damage = Math.max(1, Math.round(unit.maxHp * (status.id === 'poison' ? 0.08 : 0.05)));
      unit.hp -= damage; addLog(battle, `${name(unit)} は${label(status.id)}で ${damage} ダメージ。`);
    }
    status.turns -= 1;
    if (status.turns <= 0) addLog(battle, `${name(unit)} の${label(status.id)}が治った。`);
  }
  unit.statuses = unit.statuses.filter(status => status.turns > 0);
  for (const key of Object.keys(unit.buffs)) {
    unit.buffs[key] -= 1;
    if (unit.buffs[key] <= 0) delete unit.buffs[key];
  }
  if (battle.turn > 30) {
    const damage = Math.ceil(unit.maxHp * 0.08);
    unit.hp -= damage; addLog(battle, `長期戦の疲労で ${name(unit)} に ${damage} ダメージ。`);
  }
}

/** Resolve one complete round. Invalid or unaffordable player input never spends a turn. */
export function actBattle(battle, skillId) {
  if (battle.result) return battle;
  const special = ['guard', 'rest'].includes(skillId);
  if (!special && (!battle.player.monster.skills.includes(skillId) || !SKILLS[skillId])) {
    addLog(battle, '使える技を選んでください。'); return battle;
  }
  if (!special && !canUse(battle.player, SKILLS[skillId])) {
    addLog(battle, has(battle.player, 'seal') && SKILLS[skillId].category !== 'physical' ? '封印中は物理技・防御・深呼吸が使えます。' : '魔力が足りません。深呼吸で回復しよう。'); return battle;
  }
  const enemySkill = chooseEnemy(battle);
  const speed = unit => unit.stats.agility * (has(unit, 'paralysis') ? 0.5 : 1);
  const playerFirst = skillId === 'guard' || (enemySkill !== 'guard' && speed(battle.player) >= speed(battle.enemy));
  const moves = playerFirst ? [[battle.player, battle.enemy, skillId], [battle.enemy, battle.player, enemySkill]] : [[battle.enemy, battle.player, enemySkill], [battle.player, battle.enemy, skillId]];
  addLog(battle, `── ターン ${battle.turn} ──`);
  for (const move of moves) { execute(battle, ...move); if (finish(battle)) return battle; }
  endRound(battle, battle.player); endRound(battle, battle.enemy);
  finish(battle); battle.turn += 1;
  return battle;
}
