import { test, expect, type Page } from '@playwright/test';
import { MISSIONS } from '../../src/game/missions';

async function scene(page: Page): Promise<{ missing: unknown[]; center: number; hud: number; dock: number; castle: { top: number; left: number; right: number } }> {
  return page.evaluate(async () => {
    const load = (url: string): Promise<any> => import(/* @vite-ignore */ url);
    const { simulation: sim, battlefield: view } = await load(document.querySelector<HTMLScriptElement>('script[src*="/src/main.ts"]')!.src);
    const { roadHeight } = await load('/src/game/path.ts');
    const rect = view.renderer.domElement.getBoundingClientRect(), missing: unknown[] = [], playable: number[] = [];
    for (const point of sim.map.path) {
      const projected = view.camera.position.clone().set(point.x, roadHeight(point, sim.map), point.z).project(view.camera);
      const x = rect.left + (projected.x + 1) / 2 * rect.width, y = rect.top + (1 - projected.y) / 2 * rect.height;
      if (document.elementFromPoint(x, y) !== view.renderer.domElement) missing.push({ point, x, y, element: document.elementFromPoint(x, y)?.className });
      if (Math.abs(point.x) <= 17 && Math.abs(point.z) <= 13) playable.push(y);
    }
    const { fortressModel } = await load('/src/scene/fortress.ts');
    const fortress = fortressModel(); fortress.position.set(sim.map.path.at(-1).x, 1.7, sim.map.path.at(-1).z); fortress.rotation.y = sim.map.gateAngle; fortress.updateMatrixWorld(true);
    const castle = { top: Infinity, left: Infinity, right: -Infinity };
    fortress.traverse((object: any) => {
      if (!object.isMesh) return;
      const attribute = object.geometry.getAttribute('position');
      for (let i = 0; i < attribute.count; i++) {
        const p = view.camera.position.clone().fromBufferAttribute(attribute, i).applyMatrix4(object.matrixWorld).project(view.camera);
        const x = (p.x + 1) / 2 * innerWidth, y = (1 - p.y) / 2 * innerHeight;
        castle.top = Math.min(castle.top, y); castle.left = Math.min(castle.left, x); castle.right = Math.max(castle.right, x);
      }
    });
    return { castle, missing, center: (Math.min(...playable) + Math.max(...playable)) / 2, hud: document.querySelector('.topbar')!.getBoundingClientRect().bottom, dock: document.querySelector('.command-strip')!.getBoundingClientRect().top };
  });
}
async function camera(page: Page): Promise<number[]> {
  return page.evaluate(async () => { const { battlefield: view } = await import(document.querySelector<HTMLScriptElement>('script[src*="/src/main.ts"]')!.src); return [...view.camera.matrixWorld.elements, ...view.camera.projectionMatrix.elements]; });
}
async function point(page: Page, road = false, tower = false): Promise<{ x: number; z: number; px: number; py: number }> {
  return page.evaluate(async ({ road, tower }) => {
    const load = (url: string): Promise<any> => import(/* @vite-ignore */ url);
    const { simulation: sim, battlefield: view } = await load(document.querySelector<HTMLScriptElement>('script[src*="/src/main.ts"]')!.src);
    const { placementError, samplePath, distance, roadHeight } = await load('/src/game/path.ts');
    const target = samplePath(14, sim.map), candidates: { x: number; z: number }[] = [];
    for (const p of sim.map.pads) if (!placementError(p, [], 300, 100, sim.map)) candidates.push(p);
    candidates.sort((a, b) => distance(a, target) - distance(b, target));
    const p = road ? samplePath(sim.map.length * .55, sim.map) : tower ? sim.towers[0] : candidates[0];
    const v = view.camera.position.clone().set(p.x, road ? roadHeight(p, sim.map) : tower ? 2.7 : 1.84, p.z).project(view.camera);
    return { x: p.x, z: p.z, px: (v.x + 1) / 2 * innerWidth, py: (1 - v.y) / 2 * innerHeight };
  }, { road, tower });
}

for (const viewport of [{ width: 1536, height: 844 }, { width: 1920, height: 1080 }]) test(`compact battlefield layout keeps the route and cursor usable at ${viewport.width}×${viewport.height}`, async ({ page }) => {
  test.setTimeout(210000); await page.setViewportSize(viewport);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(ids => localStorage.setItem('last-bastion-campaign-v1', JSON.stringify(Object.fromEntries(ids.map(id => [id, { stars: 3, score: 1000 }])))), MISSIONS.map(m => m.id));
  await page.goto('/'); await page.getByRole('button', { name: 'Jugar: El último bastión', exact: true }).click(); await page.getByRole('button', { name: 'Pausar', exact: true }).click();
  await page.screenshot({ path: `test-results/layout-preparation-${viewport.width}.png`, animations: 'disabled' });
  const hud = await page.locator('.topbar').boundingBox(), dock = await page.locator('.command-strip').boundingBox();
  expect(hud!.height).toBeLessThanOrEqual(100); expect(dock!.width).toBeLessThanOrEqual(390); expect(dock!.height).toBeLessThanOrEqual(52);
  await expect(page.locator('.wave-panel #next-wave')).toBeVisible(); await expect(page.locator('.bottom-bar #next-wave')).toHaveCount(0);
  await expect(page.locator('#preparation-progress')).toBeVisible(); await expect(page.locator('#wave-progress')).toBeHidden();
  const initial = await camera(page), framing = await scene(page);
  expect(framing.castle.top).toBeGreaterThan(framing.hud + 10); expect(framing.castle.left).toBeGreaterThanOrEqual(20); expect(framing.castle.right).toBeLessThan(viewport.width - 20);
  expect(framing.missing).toEqual([]); expect(framing.center).toBeLessThan(viewport.height * .63); expect(framing.center).toBeGreaterThan((framing.hud + 12 + framing.dock - 14) / 2);
  const rectangles = await page.locator('.brand, .wave-panel, .resources, .toolbar').evaluateAll(nodes => nodes.map(node => { const r = node.getBoundingClientRect(); return { left: r.left, right: r.right }; }));
  for (let i = 1; i < rectangles.length; i++) expect(rectangles[i].left).toBeGreaterThanOrEqual(rectangles[i - 1].right);

  await page.keyboard.press('1'); const blocked = await point(page, true); await page.mouse.move(blocked.px, blocked.py);
  await expect(page.locator('#placement-hint')).toBeVisible(); await expect(page.locator('#placement-hint')).toContainText('Sobre el camino');
  const warning = await page.locator('#placement-hint').boundingBox(); expect(warning!.y).toBeGreaterThan(hud!.y + hud!.height); expect(warning!.y + warning!.height).toBeLessThan(hud!.y + hud!.height + 60);
  expect(await page.locator('.notification-lane').evaluate(node => getComputedStyle(node).pointerEvents)).toBe('none');
  expect(await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.tagName, { x: warning!.x + warning!.width / 2, y: warning!.y + warning!.height / 2 })).toBe('CANVAS');
  await page.screenshot({ path: `test-results/layout-building-${viewport.width}.png`, animations: 'disabled' });
  await page.keyboard.press('Escape'); await page.keyboard.press('3'); await expect(page.locator('#toast')).toHaveText('No tienes suficiente oro');
  const notice = await page.locator('#toast').boundingBox(); expect(notice).toEqual(warning);
  await page.keyboard.press('1'); const build = await point(page); await page.mouse.move(build.px, build.py);
  await expect(page.locator('#placement-hint')).toContainText('Ubicación válida'); await page.mouse.click(build.px, build.py); await expect(page.locator('#gold')).toHaveText('200');
  const placed = await page.evaluate(async () => { const { simulation: sim } = await import(document.querySelector<HTMLScriptElement>('script[src*="/src/main.ts"]')!.src); return { x: sim.towers[0].x, z: sim.towers[0].z }; });
  expect(placed.x).toBeCloseTo(build.x, 2); expect(placed.z).toBeCloseTo(build.z, 2);
  await page.keyboard.press('Escape'); const pick = await point(page, false, true); await page.mouse.click(pick.px, pick.py); await expect(page.locator('#tower-panel')).toBeVisible();
  expect((await scene(page)).missing).toEqual([]);
  await page.screenshot({ path: `test-results/layout-selection-${viewport.width}.png`, animations: 'disabled' });
  await page.locator('#upgrade').click(); await expect(page.locator('#gold')).toHaveText('120');
  await page.getByRole('button', { name: 'Acercar vista', exact: true }).click();
  await page.evaluate(async () => { const { battlefield: view } = await import(document.querySelector<HTMLScriptElement>('script[src*="/src/main.ts"]')!.src); view.panBy(80, 50); });
  await page.getByRole('button', { name: 'Restablecer vista', exact: true }).click(); expect(await camera(page)).toEqual(initial);
  await page.keyboard.press('Escape'); await page.getByRole('button', { name: 'Cambiar velocidad a 2x', exact: true }).click(); await page.getByRole('button', { name: 'Iniciar oleada 1', exact: true }).click();
  await expect(page.locator('#wave-status')).toContainText('en el valle'); await expect(page.locator('#wave-progress')).toHaveJSProperty('hidden', false); await expect(page.locator('#preparation-progress')).toBeHidden();
  await expect.poll(async () => Number(await page.locator('#gold').textContent()), { timeout: 45000 }).toBeGreaterThan(120);
  expect((await scene(page)).missing).toEqual([]);
  await page.screenshot({ path: `test-results/layout-combat-${viewport.width}.png`, animations: 'disabled' });
  expect(errors).toEqual([]);
});

for (const viewport of [{ width: 1536, height: 844 }, { width: 1920, height: 1080 }]) test(`all ten maps preserve their route with tower details open at ${viewport.width}`, async ({ page }) => {
  test.setTimeout(240000); await page.setViewportSize(viewport);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(ids => localStorage.setItem('last-bastion-campaign-v1', JSON.stringify(Object.fromEntries(ids.map(id => [id, { stars: 3, score: 1000 }])))), MISSIONS.map(m => m.id));
  await page.goto('/');
  for (const [index, mission] of MISSIONS.entries()) {
    // Dispatch the existing menu actions directly; pointer placement is checked in the layout cases above.
    await page.evaluate(i => { document.querySelector<HTMLButtonElement>(`[data-mission="${i}"]`)!.click(); document.querySelector<HTMLButtonElement>('#pause')!.click(); }, index);
    await expect(page.locator('#mission-title')).toHaveText(mission.name.toUpperCase());
    const framing = await scene(page); expect(framing.missing, mission.name).toEqual([]); expect(framing.castle.top).toBeGreaterThan(framing.hud + 10);
    const pick = await page.evaluate(async () => {
      const load = (url: string): Promise<any> => import(/* @vite-ignore */ url);
      const { simulation: sim, battlefield: view } = await load(document.querySelector<HTMLScriptElement>('script[src*="/src/main.ts"]')!.src);
      const { gateDefenceSites } = await load('/src/game/path.ts'); const p = gateDefenceSites(sim.map)[1];
      if (typeof sim.build('archer', p) === 'string') throw new Error('The castle flank must remain buildable');
      const screen = view.camera.position.clone().set(p.x, 2.7, p.z).project(view.camera); return { x: (screen.x + 1) / 2 * innerWidth, y: (1 - screen.y) / 2 * innerHeight };
    });
    await expect(page.locator('#gold')).toHaveText('200'); await page.mouse.click(pick.x, pick.y); await expect(page.locator('#tower-panel')).toBeVisible();
    expect((await scene(page)).missing, `${mission.name}: selection must not cover the road`).toEqual([]);
    await page.evaluate(() => document.querySelector<HTMLButtonElement>('#campaign')!.click());
  }
  expect(errors).toEqual([]);
});
