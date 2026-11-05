/**
 * Regenerate the bestiary's original 3D portraits after editing src/scene.js.
 * Terminal 1: npm run dev
 * Terminal 2: node scripts/generate-thumbnails.mjs
 * Optional: --ids=m03,m08 (only these IDs), THUMBNAIL_BASE_URL=http://127.0.0.1:5173
 * Uses system Chromium when available, otherwise Playwright's installed Chromium.
 * Produces deterministic 320×300 PNG files in public/monsters using the same
 * MonsterScene geometry/materials as the interactive game; no external art assets.
 */
import { chromium } from '@playwright/test';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const selectedIds = process.argv.find(arg => arg.startsWith('--ids='))?.slice(6).split(',');
const outputDirectory = fileURLToPath(new URL('../public/monsters/', import.meta.url));
const browser = await chromium.launch({
  ...(existsSync('/usr/bin/chromium') ? { executablePath: '/usr/bin/chromium' } : {}),
  headless: true,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'],
});
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 1 });
  await page.goto(process.env.THUMBNAIL_BASE_URL || 'http://127.0.0.1:5173');
  const shots = await page.evaluate(async (ids) => {
    const { MonsterScene } = await import('/src/scene.js');
    const { MONSTERS } = await import('/src/data.js');
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'width:320px;height:300px;position:fixed;top:0;left:0';
    document.body.append(canvas);
    const scene = new MonsterScene(canvas);
    const captures = [];
    try {
      for (const monster of MONSTERS.filter(m => !ids || ids.includes(m.id))) {
        scene.setMonster(monster);
        scene.environment.visible = false;
        scene.motes.visible = false;
        scene.camera.position.set(4.5, 3.2, 7);
        scene.camera.lookAt(0, 1.8, 0);
        scene.renderer.render(scene.scene, scene.camera);
        captures.push([monster.id, canvas.toDataURL('image/png')]);
      }
    } finally {
      scene.dispose();
      canvas.remove();
    }
    return captures;
  }, selectedIds);
  if (!shots.length) throw new Error('No matching monsters were rendered.');
  await mkdir(outputDirectory, { recursive: true });
  for (const [id, dataUrl] of shots) {
    await writeFile(`${outputDirectory}/${id}.png`, Buffer.from(dataUrl.split(',')[1], 'base64'));
  }
  console.log(`Generated ${shots.length} original 3D portraits in public/monsters (320×300).`);
} finally {
  await browser.close();
}
