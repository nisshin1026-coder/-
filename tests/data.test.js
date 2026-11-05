import test from 'node:test';
import assert from 'node:assert/strict';
import { ELEMENTS, MONSTERS, SKILLS, STATUS_LABELS } from '../src/data.js';
import { actBattle, createBattle } from '../src/battle.js';

const elements = ['neutral', 'fire', 'water', 'wind', 'earth', 'ice', 'thunder', 'light', 'dark', 'poison'];
const statuses = ['burn', 'petrify', 'freeze', 'paralysis', 'sleep', 'poison', 'weaken', 'confusion', 'stun', 'seal'];
const shapes = ['fox', 'dragon', 'slime', 'bird', 'golem', 'cat', 'rabbit', 'deer', 'turtle', 'serpent'];
const stats = ['hp', 'mp', 'attack', 'defense', 'agility', 'accuracy', 'evasion', 'magicAttack', 'magicDefense'];

test('the bestiary has exactly 50 unique identities and five monsters per requested element', () => {
  assert.deepEqual(Object.keys(ELEMENTS).sort(), [...elements].sort());
  assert.equal(MONSTERS.length, 50);
  assert.equal(new Set(MONSTERS.map(monster => monster.id)).size, 50);
  assert.equal(new Set(MONSTERS.map(monster => monster.name)).size, 50);
  for (const element of elements) {
    assert.equal(MONSTERS.filter(monster => monster.element === element).length, 5, element);
    assert.ok(ELEMENTS[element].label);
    assert.match(ELEMENTS[element].color, /^#[\da-f]{6}$/i);
  }
});

test('every monster can render and supplies complete finite combat statistics', () => {
  for (const monster of MONSTERS) {
    assert.ok(shapes.includes(monster.shape), `${monster.id} has a renderer-supported body`);
    assert.match(monster.color, /^#[\da-f]{6}$/i, monster.id);
    assert.match(monster.accent, /^#[\da-f]{6}$/i, monster.id);
    assert.ok(Number.isInteger(monster.seed), monster.id);
    assert.ok(Number.isInteger(monster.rarity) && monster.rarity >= 1 && monster.rarity <= 5, monster.id);
    for (const field of ['name', 'species', 'personality', 'description']) {
      assert.ok(typeof monster[field] === 'string' && monster[field].trim().length, `${monster.id}.${field}`);
    }
    assert.deepEqual(Object.keys(monster.stats).sort(), [...stats].sort(), monster.id);
    for (const [key, value] of Object.entries(monster.stats)) {
      assert.ok(Number.isFinite(value) && value >= 0, `${monster.id}.${key}`);
      if (!['mp', 'evasion'].includes(key)) assert.ok(value > 0, `${monster.id}.${key}`);
      if (['accuracy', 'evasion'].includes(key)) assert.ok(value <= 100, `${monster.id}.${key} is a percentage`);
    }
  }
});

test('all loadouts resolve, have an affordable attack, and include their own element', () => {
  for (const monster of MONSTERS) {
    assert.equal(monster.skills.length, 4, monster.id);
    assert.equal(new Set(monster.skills).size, monster.skills.length, monster.id);
    assert.ok(monster.skills.every(id => SKILLS[id]), monster.id);
    const skills = monster.skills.map(id => SKILLS[id]);
    assert.ok(skills.some(skill => skill.category === 'physical' && skill.cost === 0), `${monster.id} can act at zero mana or while sealed`);
    assert.ok(skills.some(skill => skill.element === monster.element && ['magic', 'physical'].includes(skill.category)), `${monster.id} has elemental offense`);
    assert.ok(skills.every(skill => skill.cost <= monster.stats.mp), `${monster.id} can afford its entire individual move set`);
    assert.ok(!monster.skills.includes('guard') && !monster.skills.includes('rest'), 'skills cannot shadow built-in actions');
  }
});

test('skill definitions use supported combat categories, valid rates, and cover all ten statuses', () => {
  assert.deepEqual(Object.keys(STATUS_LABELS).sort(), [...statuses].sort());
  const representedStatuses = new Set();
  for (const [id, skill] of Object.entries(SKILLS)) {
    assert.equal(skill.id, id);
    assert.ok(skill.name && skill.description, id);
    assert.ok(elements.includes(skill.element), id);
    assert.ok(['physical', 'magic', 'heal', 'buff'].includes(skill.category), id);
    assert.ok(Number.isFinite(skill.cost) && skill.cost >= 0, id);
    assert.ok(Number.isFinite(skill.power) && skill.power >= 0, id);
    assert.ok(Number.isFinite(skill.accuracy) && skill.accuracy > 0 && skill.accuracy <= 100, id);
    if (['physical', 'magic'].includes(skill.category)) assert.ok(skill.power > 0, id);
    if (skill.status) {
      const statusId = typeof skill.status === 'string' ? skill.status : skill.status.id;
      assert.ok(statuses.includes(statusId), id);
      representedStatuses.add(statusId);
      if (typeof skill.status === 'object' && skill.status.chance !== undefined) {
        assert.ok(Number.isFinite(skill.status.chance) && skill.status.chance >= 0 && skill.status.chance <= 100, id);
      }
    }
  }
  assert.deepEqual([...representedStatuses].sort(), [...statuses].sort());
  for (const status of statuses) {
    assert.ok(MONSTERS.some(monster => monster.skills.some(id => {
      const effect = SKILLS[id].status;
      return (typeof effect === 'string' ? effect : effect?.id) === status;
    })), `${status} is reachable from an actual playable monster`);
  }
});

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

test('all 2,500 bestiary matchups finish with finite bounded HP/MP and a valid outcome', () => {
  const usedSkills = new Set();
  for (const [playerIndex, player] of MONSTERS.entries()) {
    for (const [enemyIndex, enemy] of MONSTERS.entries()) {
      const label = `${player.id} vs ${enemy.id}`;
      const battle = createBattle(player, enemy, 1 + (playerIndex + enemyIndex) % 15);
      battle.rng = seededRandom(17011 + playerIndex * 101 + enemyIndex);
      const policyRandom = seededRandom(7727 + enemyIndex * 71 + playerIndex);
      for (let round = 0; round < 100 && !battle.result; round++) {
        const sealed = battle.player.statuses.some(status => status.id === 'seal');
        const available = player.skills.filter(id => {
          const skill = SKILLS[id];
          return skill.cost <= battle.player.mp && (!sealed || skill.category === 'physical');
        });
        const selected = available[Math.floor(policyRandom() * available.length)];
        assert.ok(selected, `${label} always has a legal move`);
        usedSkills.add(selected);
        const previousTurn = battle.turn;
        actBattle(battle, selected);
        assert.ok(battle.result || battle.turn > previousTurn, `${label} cannot softlock on a valid move`);
        for (const unit of [battle.player, battle.enemy]) {
          assert.ok(Number.isFinite(unit.hp) && unit.hp >= 0 && unit.hp <= unit.maxHp, `${label} HP`);
          assert.ok(Number.isFinite(unit.mp) && unit.mp >= 0 && unit.mp <= unit.maxMp, `${label} MP`);
          assert.ok(unit.statuses.every(status => statuses.includes(status.id) && status.turns > 0), `${label} status state`);
        }
      }
      assert.ok(['win', 'lose'].includes(battle.result), `${label} terminates within 100 rounds`);
      assert.ok(battle.player.hp === 0 || battle.enemy.hp === 0, `${label} ends on a knockout`);
    }
  }
  for (const id of new Set(MONSTERS.flatMap(monster => monster.skills))) {
    assert.ok(usedSkills.has(id), `${id} was exercised by the matchups`);
  }
});
