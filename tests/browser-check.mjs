import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { MONSTERS } from '../src/data.js';

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1080 }, deviceScaleFactor: 1 });
page.setDefaultTimeout(45000);
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') errors.push(`${message.text()} ${message.location().url || ''}`.trim()); });
const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('starweave-sanctuary-v1')));
const navigate = async target => page.locator(`.nav-list [data-page="${target}"]`).click();
const action = async target => page.locator(`[data-action="${target}"]`).first().click();
const assertCanvas = async selector => {
  assert.equal(await page.locator(selector).count(), 1, `${selector} exists`);
  const dimensions = await page.locator(selector).evaluate(canvas => ({ width: canvas.width, height: canvas.height, clientWidth: canvas.clientWidth, clientHeight: canvas.clientHeight }));
  assert.ok(dimensions.width > 100 && dimensions.height > 100 && dimensions.clientWidth > 100 && dimensions.clientHeight > 100, `${selector} has a usable rendered size`);
  assert.equal(await page.locator('.empty-state').count(), 0, 'No WebGL fallback error');
};
const assertNoOverflow = async label => {
  const layout = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, viewport: innerWidth }));
  assert.ok(layout.scroll <= layout.viewport, `${label}: horizontal overflow ${layout.scroll} > ${layout.viewport}`);
};
try {
  await page.goto(process.env.APP_URL || 'http://127.0.0.1:4173');
  await page.waitForTimeout(1500);
  if (process.env.FINAL_ASSETS_ONLY === '1') {
    await assertCanvas('.scene-canvas');
    await navigate('collection');
    assert.equal(await page.locator('.creature-card').count(), 50);
    assert.equal(await page.locator('img.creature-thumbnail').count(), 50);
    await page.locator('img.creature-thumbnail').evaluateAll(images => images.forEach(image => { image.loading = 'eager'; }));
    await page.waitForFunction(() => [...document.querySelectorAll('img.creature-thumbnail')].every(image => image.complete && image.naturalWidth > 0));
    const imageSources = await page.locator('img.creature-thumbnail').evaluateAll(images => images.map(image => image.src));
    assert.equal(new Set(imageSources).size, 50, '50 distinct creature image assets');
    await assertNoOverflow('Final desktop collection');
    await page.screenshot({ path: '/tmp/starweave-collection-final.png', fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await assertNoOverflow('Final mobile collection');
    await navigate('home');
    await assertCanvas('.scene-canvas');
    await assertNoOverflow('Final mobile home');
    await page.waitForTimeout(500);
    assert.deepEqual(errors, [], 'Final build has no runtime or console errors');
    console.log('PASS: final build home WebGL, 50 distinct fully loaded creature thumbnails, desktop/mobile collection and mobile home overflow, no runtime/console errors.');
  } else {
  assert.match(await page.title(), /星織り/);
  await assertCanvas('.scene-canvas');
  await assertNoOverflow('Desktop home');
  await page.screenshot({ path: '/tmp/starweave-home.png', fullPage: true });
  console.log('PASS: home, 3D canvas, desktop layout');

  await action('feed');
  let state = await saved();
  assert.equal(state.food, 19, 'Feeding consumes one food');
  assert.equal(state.bond, 42, 'Feeding raises active monster bond');
  assert.equal(state.energy, 89, 'Feeding restores energy');
  await action('training');
  await action('train:attack');
  state = await saved();
  assert.equal(state.training.attack, 2, 'Training improves attack');
  assert.equal(state.energy, 71, 'Training spends 18 energy');
  assert.equal(await page.locator('[role="dialog"]').count(), 0, 'Training modal closes');
  console.log('PASS: feeding and training change saved resources and abilities');

  await action('shop');
  assert.match(await page.locator('[role="dialog"]').innerText(), /風の小さな商店/);
  const beforeShop = await saved();
  await action('buy:food');
  state = await saved();
  assert.equal(state.gold, beforeShop.gold - 120, 'Shop charges 120 coins');
  assert.equal(state.food, beforeShop.food + 5, 'Shop grants five food');
  assert.equal(await page.locator('[role="dialog"]').count(), 0);
  console.log('PASS: shop purchase and modal dismissal');

  await navigate('collection');
  assert.equal(await page.locator('.creature-card').count(), 50, 'Exactly 50 creature cards');
  await page.screenshot({ path: '/tmp/starweave-collection.png', fullPage: true });
  const locked = page.locator('.creature-card.undiscovered').first();
  const lockedId = await locked.getAttribute('data-monster');
  await locked.click();
  await assertCanvas('.preview-canvas');
  assert.match(await page.locator('[role="dialog"]').innerText(), /まだ仲間になっていません/);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('[role="dialog"]').count(), 0);
  assert.equal(await page.evaluate(() => document.activeElement?.dataset.monster), lockedId, 'Closing preview restores focus to its card');
  await page.locator('[data-monster="m06"]').click();
  state = await saved();
  assert.equal(state.selectedId, 'm06');
  assert.equal(state.training.attack, 0, 'New partner does not inherit previous monster training');
  assert.equal(state.profiles.m01.training.attack, 2, 'Original monster retains training');
  await page.reload();
  assert.match(await page.locator('.monster-name h2').textContent(), new RegExp(MONSTERS.find(monster => monster.id === 'm06').name));
  assert.equal((await saved()).selectedId, 'm06', 'Partner selection survives reload');
  await navigate('collection');
  await page.locator('[data-monster="m01"]').click();
  assert.equal((await saved()).training.attack, 2, 'Returning to first monster restores its training');
  console.log('PASS: 50-creature collection, locked 3D preview, focus restoration, individual persistence');

  await navigate('explore');
  const beforeExplore = await saved();
  await action('explore:meadow');
  state = await saved();
  assert.equal(state.energy, beforeExplore.energy - 20, 'Exploration spends region energy');
  assert.equal(state.gold, beforeExplore.gold + 150, 'Exploration grants coins');
  assert.equal(state.questProgress.explorations, beforeExplore.questProgress.explorations + 1);
  assert.match(await page.locator('.main-stack .log-entry').first().innerText(), /こもれびの浮島/);
  console.log('PASS: exploration costs, rewards, and history');

  await navigate('breed');
  await page.locator('#partner-select').selectOption('m11');
  assert.equal(await page.locator('#partner-select').inputValue(), 'm11', 'Second parent is selectable');
  const beforeBreed = await saved();
  await action('breed');
  state = await saved();
  assert.equal(state.owned.length, beforeBreed.owned.length + 1, 'Breeding grants one new monster');
  assert.equal(state.crystals, beforeBreed.crystals - 6, 'Breeding costs six crystals');
  assert.ok(beforeBreed.owned.every(id => state.owned.includes(id)), 'Parents and prior companions remain owned');
  assert.match(state.history.at(-1), new RegExp(MONSTERS.find(monster => monster.id === 'm11').name), 'Selected second parent is used');
  console.log('PASS: chosen breeding partner, new companion, exact cost, parent preservation');

  await navigate('battle');
  const announcedOpponent = await page.locator('.opponent-preview strong').innerText();
  await action('start-battle');
  await assertCanvas('.battle-center .scene-canvas');
  const opponentName = (await page.locator('.combatant').nth(1).locator('h2').innerText()).split(/\s/)[0];
  assert.ok(announcedOpponent.includes(opponentName), 'Battle uses announced opponent');
  const startTurn = Number(await page.locator('.turn-display strong').textContent());
  const hitPoints = () => page.locator('.combatant').evaluateAll(units => units.map(unit => Number(unit.querySelector('.stat-row strong').textContent.split('/')[0].trim())));
  const beforeHp = await hitPoints();
  let afterHp = beforeHp;
  for (let attempt = 0; attempt < 3 && afterHp.every((hp, index) => hp === beforeHp[index]); attempt++) {
    const usableSkill = page.locator('[data-skill]:not(:disabled)').first();
    if (!await usableSkill.count()) break;
    await usableSkill.click();
    afterHp = await hitPoints();
  }
  assert.ok(Number(await page.locator('.turn-display strong').textContent()) > startTurn, 'Battle advances turn');
  assert.ok(afterHp.some((hp, index) => hp < beforeHp[index]), 'Combat deals HP damage');
  assert.ok(await page.locator('.battle-log .log-entry').count() > 2, 'Battle records actions');
  await page.screenshot({ path: '/tmp/starweave-battle.png', fullPage: true });
  console.log('PASS: announced opponent, two-creature 3D canvas, turn progression, HP damage, log');

  await page.setViewportSize({ width: 390, height: 844 });
  await assertNoOverflow('Mobile battle');
  await navigate('collection');
  await assertNoOverflow('Mobile collection');
  await navigate('home');
  await page.waitForTimeout(300);
  await assertNoOverflow('Mobile home with three resources');
  assert.equal(await page.locator('.resources .resource').count(), 3);
  await page.screenshot({ path: '/tmp/starweave-mobile.png', fullPage: true });
  assert.deepEqual(errors, [], 'No browser runtime or console errors');
  console.log('PASS: mobile battle/collection/home, three resources, no browser errors');
  console.log('Browser functional checks completed successfully.');
  }
} finally {
  await browser.close();
}
