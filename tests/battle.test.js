import test from 'node:test';
import assert from 'node:assert/strict';
import { createBattle, actBattle, typeMultiplier } from '../src/battle.js';
import { MONSTERS, SKILLS, STATUS_LABELS } from '../src/data.js';
import { getMonster, loadGame } from '../src/game.js';

function fixture(t, overrides = {}) {
  SKILLS.__testStrike = { id: '__testStrike', name: '検証用攻撃', category: 'physical', element: 'neutral', power: 35, accuracy: 100, cost: 0, ...overrides };
  t.after(() => { delete SKILLS.__testStrike; });
  const monster = { ...MONSTERS[0], element: 'neutral', skills: ['__testStrike'], stats: { hp: 500, mp: 60, attack: 40, defense: 40, agility: 50, accuracy: 100, evasion: 0, magicAttack: 40, magicDefense: 40 } };
  const battle = createBattle(monster, { ...monster, name: '相手', stats: { ...monster.stats, agility: 25 } });
  battle.rng = () => 0.5;
  return battle;
}

test('attribute matchups reward weakness and resist same element', () => {
  assert.equal(typeMultiplier('fire', 'ice'), 1.5);
  assert.equal(typeMultiplier('ice', 'fire'), 0.75);
  assert.equal(typeMultiplier('water', 'water'), 0.75);
  assert.equal(typeMultiplier('neutral', 'water'), 1);
  assert.equal(typeMultiplier('invalid', 'water'), 1);
});

test('trained player stats enter battle unchanged while raw enemies scale', () => {
  const state = loadGame(); state.level = 12; state.training.attack = 35;
  const player = getMonster(state);
  const battle = createBattle(player, MONSTERS[0], state.level);
  assert.deepEqual(battle.player.stats, player.stats);
  assert.equal(battle.player.maxHp, player.stats.hp);
  assert.equal(battle.player.level, state.level);
  assert.ok(battle.enemy.maxHp > MONSTERS[0].stats.hp);
});

test('ward skill spends its mana and cannot collide with free guard', t => {
  const battle = fixture(t);
  battle.player.monster = { ...battle.player.monster, skills: ['ward'] };
  actBattle(battle, 'ward');
  assert.equal(battle.player.mp, 60 - SKILLS.ward.cost);
  assert.equal(battle.player.buffs.ward, 3);
  assert.equal(battle.player.buffs.guard, undefined);
  assert.equal(SKILLS.guard, undefined);
  assert.ok(MONSTERS.every(monster => !monster.skills.includes('guard')));
});

test('an exchange consumes a turn and both sides deal damage', t => {
  const battle = fixture(t);
  assert.equal(actBattle(battle, '__testStrike'), battle);
  assert.equal(battle.turn, 2);
  assert.ok(battle.player.hp < battle.player.maxHp);
  assert.ok(battle.enemy.hp < battle.enemy.maxHp);
  assert.equal(battle.result, null);
});

test('guard has priority even when slower and halves damage', t => {
  const battle = fixture(t);
  battle.player.stats.agility = 1;
  const normal = structuredClone({ ...battle, rng: undefined }); normal.rng = () => 0.5;
  actBattle(normal, '__testStrike');
  actBattle(battle, 'guard');
  const guardedDamage = battle.player.maxHp - battle.player.hp;
  const normalDamage = normal.player.maxHp - normal.player.hp;
  assert.ok(guardedDamage <= Math.ceil(normalDamage / 2));
  assert.equal(battle.player.buffs.guard, undefined);
});

test('unaffordable and unknown moves preserve the turn; rest restores mana', t => {
  const battle = fixture(t, { cost: 30 }); battle.player.mp = 0;
  actBattle(battle, '__testStrike'); assert.equal(battle.turn, 1);
  actBattle(battle, 'missing'); assert.equal(battle.turn, 1);
  actBattle(battle, 'rest'); assert.equal(battle.turn, 2); assert.ok(battle.player.mp > 0);
});

test('seal blocks magic while leaving rest usable and expires', t => {
  const battle = fixture(t, { category: 'magic' });
  battle.player.statuses = [{ id: 'seal', turns: 1 }];
  actBattle(battle, '__testStrike'); assert.equal(battle.turn, 1);
  actBattle(battle, 'rest'); assert.equal(battle.turn, 2);
  assert.equal(battle.player.statuses.length, 0);
});

test('petrify, freeze, sleep and stun interrupt attacks and expire', t => {
  for (const id of ['petrify', 'freeze', 'sleep', 'stun']) {
    const battle = fixture(t); battle.player.statuses = [{ id, turns: 1 }];
    actBattle(battle, '__testStrike');
    assert.equal(battle.enemy.hp, battle.enemy.maxHp, id);
    assert.equal(battle.player.statuses.length, 0, id);
  }
});

test('all status definitions exist and poison/burn damage their bearer', t => {
  for (const id of ['burn', 'petrify', 'freeze', 'paralysis', 'sleep', 'poison', 'weaken', 'confusion', 'stun', 'seal']) assert.ok(STATUS_LABELS[id], id);
  const battle = fixture(t); battle.player.statuses = [{ id: 'poison', turns: 2 }, { id: 'burn', turns: 2 }];
  const before = battle.player.hp;
  actBattle(battle, 'guard');
  assert.ok(before - battle.player.hp >= battle.player.maxHp * 0.13);
  assert.equal(battle.player.statuses[0].turns, 1);
});

test('weakening reduces damage, paralysis can skip, confusion self-damages', t => {
  const normal = fixture(t); actBattle(normal, '__testStrike');
  const weakened = fixture(t); weakened.player.statuses = [{ id: 'weaken', turns: 2 }]; actBattle(weakened, '__testStrike');
  assert.ok(weakened.enemy.hp > normal.enemy.hp);
  for (const id of ['paralysis', 'confusion']) {
    const battle = fixture(t); battle.player.statuses = [{ id, turns: 2 }]; battle.rng = () => 0;
    actBattle(battle, '__testStrike'); assert.equal(battle.enemy.hp, battle.enemy.maxHp);
    assert.ok(battle.player.hp < battle.player.maxHp);
  }
});

test('knockout stops retaliation and completed battle ignores further actions', t => {
  const battle = fixture(t); battle.enemy.hp = 1;
  actBattle(battle, '__testStrike'); assert.equal(battle.result, 'win'); assert.equal(battle.player.hp, battle.player.maxHp);
  const logLength = battle.log.length; actBattle(battle, 'rest'); assert.equal(battle.log.length, logLength);
});

test('a successful freeze interrupts the enemy and wears off', t => {
  const battle = fixture(t, { status: { id: 'freeze', chance: 1, turns: 1 } });
  actBattle(battle, '__testStrike');
  assert.equal(battle.player.hp, battle.player.maxHp);
  assert.ok(battle.enemy.statuses.some(status => status.id === 'freeze'));
  actBattle(battle, 'guard');
  assert.equal(battle.enemy.statuses.length, 0);
});

test('magic attacks use magic defense, not physical defense', t => {
  const battle = fixture(t, { category: 'magic' });
  const armored = structuredClone({ ...battle, rng: undefined }); armored.rng = () => 0.5;
  armored.enemy.stats.defense = 10000;
  actBattle(battle, '__testStrike'); actBattle(armored, '__testStrike');
  assert.equal(battle.enemy.hp, armored.enemy.hp);
});

test('missed attacks spend MP but deal no damage', t => {
  const battle = fixture(t, { accuracy: 20, cost: 10 });
  actBattle(battle, '__testStrike');
  assert.equal(battle.enemy.hp, battle.enemy.maxHp);
  assert.equal(battle.player.mp, 50);
  assert.equal(battle.turn, 2);
});

test('zero-mana combat cannot softlock: rest and fallback AI finish', t => {
  const battle = fixture(t, { cost: 10 }); battle.player.mp = 0; battle.enemy.mp = 0;
  for (let round = 0; round < 100 && !battle.result; round++) actBattle(battle, 'rest');
  assert.ok(battle.result); assert.ok(battle.turn <= 100);
});
