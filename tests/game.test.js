import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { loadGame, saveGame, getMonster, feed, train, rest, explore, breed, claimDaily, selectMonster, pet, buySupplies } from '../src/game.js';

const storage = new Map();
globalThis.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) };
beforeEach(() => storage.clear());
test('training spends energy, grows stats, and survives save/load', () => {
 const s = loadGame();
 const attack = getMonster(s).stats.attack;
 train(s, 'attack');
 assert.equal(s.energy, 62);
 assert.ok(getMonster(s).stats.attack > attack);
 assert.equal(loadGame().training.attack, 2);
});
test('insufficient resources never charge or unlock monsters', () => {
 const s = loadGame(); s.energy = 0; s.food = 0; s.crystals = 0;
 const snapshot = JSON.stringify(s);
 train(s, 'attack'); feed(s); explore(s, 'meadow'); breed(s);
 assert.equal(JSON.stringify(s), snapshot);
});
test('daily gift cannot be claimed twice until a new day', () => {
 const s = loadGame(); claimDaily(s); const gold = s.gold;
 claimDaily(s); assert.equal(s.gold, gold);
 rest(s); claimDaily(s); assert.equal(s.gold, gold + 200);
 assert.equal(s.day, 2);
});
test('star binding always unlocks a unique monster and spends six crystals', () => {
 const s = loadGame(); const original = [...s.owned]; breed(s);
 assert.equal(s.owned.length, original.length + 1);
 assert.equal(new Set(s.owned).size, s.owned.length);
 assert.equal(s.crystals, 6);
 assert.ok(original.every(id => s.owned.includes(id)));
});
test('third exploration guarantees a new encounter and advances story', () => {
 const s = loadGame(); s.questProgress.explorations = 2;
 const owned = s.owned.length; explore(s, 'tide');
 assert.equal(s.owned.length, owned + 1);
 assert.equal(s.storyChapter, 1);
 assert.equal(s.questProgress.restored, 1);
});
test('corrupt and foreign saves safely reset, saved numbers are bounded', () => {
 storage.set('starweave-sanctuary-v1', '{invalid'); assert.equal(loadGame().day, 1);
 storage.set('starweave-sanctuary-v1', JSON.stringify({version: 99})); assert.equal(loadGame().gold, 1200);
 const s = loadGame(); s.energy = 999; s.gold = -12; s.owned = ['invalid']; saveGame(s);
 const restored = loadGame(); assert.equal(restored.energy, 100); assert.equal(restored.gold, 0);
 assert.deepEqual(restored.owned, ['m01', 'm06', 'm11']);
});
test('invalid training and exploration choices preserve state', () => {
 const s = loadGame(); const before = JSON.stringify(s);
 train(s, 'unknown'); train(s, '__proto__'); explore(s, 'unknown');
 assert.equal(JSON.stringify(s), before);
});

test('training, experience and bond are individual and preserved across selections', () => {
 const s = loadGame(); train(s, 'attack'); feed(s);
 const first = { level:s.level, xp:s.xp, bond:s.bond, attack:s.training.attack };
 const energy = s.energy;
 selectMonster(s, 'm06');
 assert.equal(s.level, 1); assert.equal(s.xp, 0); assert.equal(s.bond, 35); assert.equal(s.training.attack, 0);
 assert.equal(s.energy, energy);
 train(s, 'defense'); selectMonster(s, 'm01');
 assert.deepEqual({ level:s.level, xp:s.xp, bond:s.bond, attack:s.training.attack }, first);
 assert.equal(s.training.defense, 0);
 const loaded = loadGame(); selectMonster(loaded, 'm06');
 assert.equal(loaded.training.defense, 2); assert.equal(loaded.training.attack, 0);
});
test('old v1 saves migrate active progress without duplicating it onto every monster', () => {
 const s = loadGame(); s.level = 7; s.xp = 42; s.bond = 65; s.training.attack = 14;
 delete s.profiles;
 storage.set('starweave-sanctuary-v1', JSON.stringify(s));
 const migrated = loadGame(); assert.equal(migrated.level, 7); assert.equal(migrated.training.attack, 14);
 selectMonster(migrated, 'm06'); assert.equal(migrated.level, 1); assert.equal(migrated.bond, 35);
 selectMonster(migrated, 'm01'); assert.equal(migrated.level, 7); assert.equal(migrated.xp, 42);
});
test('petting grants bond once per day per individual and survives reload', () => {
 const s = loadGame(); pet(s); assert.equal(s.bond, 36); pet(s); assert.equal(s.bond, 36);
 const loaded = loadGame(); pet(loaded); assert.equal(loaded.bond, 36);
 selectMonster(loaded, 'm06'); pet(loaded); assert.equal(loaded.bond, 36);
 selectMonster(loaded, 'm01'); rest(loaded); pet(loaded); assert.equal(loaded.bond, 37);
});
test('selecting an unowned monster cannot change the current individual', () => {
 const s = loadGame(); selectMonster(s, 'm50'); assert.equal(s.selectedId, 'm01');
});

test('shop purchases spend gold and persist their exact supplies', () => {
 const s = loadGame(); buySupplies(s, 'food');
 assert.equal(s.gold, 1080); assert.equal(s.food, 25);
 buySupplies(s, 'crystal'); assert.equal(s.gold, 780); assert.equal(s.crystals, 15);
 assert.equal(loadGame().crystals, 15); assert.equal(loadGame().gold, 780);
});
test('shop rejects insufficient gold and unknown items atomically', () => {
 const s = loadGame(); s.gold = 119; const before = JSON.stringify(s);
 buySupplies(s, 'food'); buySupplies(s, 'crystal'); buySupplies(s, 'unknown'); buySupplies(s, '__proto__');
 assert.equal(JSON.stringify(s), before);
});
test('star binding rejects self or unowned partners without spending', () => {
 const s = loadGame(); const before = JSON.stringify(s);
 breed(s, 'm01'); breed(s, 'm50');
 assert.equal(JSON.stringify(s), before);
});
test('star binding considers both chosen parents and keeps them', () => {
 const s = loadGame(); const originalRandom = Math.random;
 Math.random = () => 0.5;
 try {
  const message = breed(s, 'm06');
  assert.match(message, /コハルビ/);
  assert.equal(s.owned.length, 4);
  assert.ok(s.owned.includes('m01') && s.owned.includes('m06'));
  const childId = s.owned.at(-1); selectMonster(s, childId);
  assert.ok(['neutral', 'fire'].includes(getMonster(s).element));
 } finally { Math.random = originalRandom; }
});
