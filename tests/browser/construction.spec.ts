import { test, expect, type Page } from '@playwright/test';

async function state(page: Page): Promise<{ visible: boolean; area: number; valid: boolean; invalid: boolean; base: boolean; range: number; kind: string | null; towers: number }> {
  return page.evaluate(async () => {
    const { simulation: sim, battlefield: view } = await import(document.querySelector<HTMLScriptElement>('script[src*="/src/main.ts"]')!.src);
    const positions = view.constructionAreas.fill.geometry.getAttribute('position'); let area = 0;
    if (positions) for (let i = 0; i < positions.count; i += 3) area += Math.abs((positions.getX(i + 1) - positions.getX(i)) * (positions.getZ(i + 2) - positions.getZ(i)) - (positions.getZ(i + 1) - positions.getZ(i)) * (positions.getX(i + 2) - positions.getX(i))) / 2;
    return { visible: view.constructionAreas.group.visible, area, valid: view.footprint.confirmation.visible, invalid: view.footprint.rejection.visible, base: view.footprint.group.visible, range: view.range.visible ? view.range.scale.x : 0, kind: view.ghostKind, towers: sim.towers.length };
  });
}
async function point(page: Page, type: 'green' | 'road' | 'rock' | 'tower'): Promise<{ x: number; z: number; px: number; py: number }> {
  return page.evaluate(async type => {
    const load = (url: string): Promise<any> => import(/* @vite-ignore */ url);
    const { simulation: sim, battlefield: view } = await load(document.querySelector<HTMLScriptElement>('script[src*="/src/main.ts"]')!.src);
    const { samplePath, roadHeight, distance, placementError } = await load('/src/game/path.ts');
    let p: { x: number; z: number }, height = 1.7;
    if (type === 'green') {
      const positions = view.constructionAreas.fill.geometry.getAttribute('position'), candidates: { x: number; z: number }[] = [];
      for (let i = 0; i < positions.count; i += 21) candidates.push({ x: (positions.getX(i) + positions.getX(i + 1) + positions.getX(i + 2)) / 3, z: (positions.getZ(i) + positions.getZ(i + 1) + positions.getZ(i + 2)) / 3 });
      const target = samplePath(14, sim.map); candidates.sort((a, b) => distance(a, target) - distance(b, target));
      p = candidates.find(c => { if (placementError(c, sim.towers, 10000, 100, sim.map)) return false; const v = view.camera.position.clone().set(c.x, height, c.z).project(view.camera); return document.elementFromPoint((v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight)?.tagName === 'CANVAS'; })!;
      if (!p) throw new Error('No visible green construction area');
    } else if (type === 'road') { p = samplePath(sim.map.length * .55, sim.map); height = roadHeight(p, sim.map); }
    else if (type === 'rock') p = sim.map.obstacles.find((o: any) => o.type === 'rock' && Math.abs(o.x) < 9 && Math.abs(o.z) < 9)!;
    else { p = sim.towers[0]; height = 2.7; }
    const v = view.camera.position.clone().set(p.x, height, p.z).project(view.camera);
    return { ...p, px: (v.x + 1) / 2 * innerWidth, py: (1 - v.y) / 2 * innerHeight };
  }, type);
}

for (const viewport of [{ width: 1536, height: 844 }, { width: 1920, height: 1080 }]) test(`construction shows valid terrain before hovering and tracks free placement at ${viewport.width}×${viewport.height}`, async ({ page }) => {
  test.setTimeout(210000); await page.setViewportSize(viewport);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => localStorage.setItem('last-bastion-campaign-v1', JSON.stringify({ pines: { stars: 3, score: 1000 }, market: { stars: 3, score: 1000 }, citadel: { stars: 3, score: 1000 } })));
  await page.goto('/'); await page.getByRole('button', { name: 'Jugar: El último bastión', exact: true }).click(); await page.getByRole('button', { name: 'Pausar', exact: true }).click();
  await page.keyboard.press('1');
  await expect.poll(async () => (await state(page)).visible).toBe(true);
  // Availability appears without probing terrain with the pointer.
  const initial = await state(page); expect(initial.area).toBeGreaterThan(30); expect(initial.base).toBe(false);
  await expect(page.locator('#placement-hint')).toContainText('Zonas verdes');
  await page.screenshot({ path: `test-results/construction-areas-${viewport.width}.png`, animations: 'disabled' });

  const road = await point(page, 'road'); await page.mouse.move(road.px, road.py);
  await expect(page.locator('#placement-hint')).toContainText('✕ Sobre el camino');
  await expect.poll(async () => (await state(page)).invalid).toBe(true);
  await page.mouse.click(road.px, road.py); await expect(page.locator('#gold')).toHaveText('300');
  const rock = await point(page, 'rock'); await page.mouse.move(rock.px, rock.py);
  await expect(page.locator('#placement-hint')).toContainText('✕ Obstáculo');
  await page.screenshot({ path: `test-results/construction-obstacle-${viewport.width}.png`, animations: 'disabled' });

  const green = await point(page, 'green'); await page.mouse.move(green.px, green.py);
  await expect(page.locator('#placement-hint')).toContainText('✓ Ubicación válida');
  await expect.poll(async () => (await state(page)).valid).toBe(true);
  expect((await state(page)).range).toBe(4.5);
  await page.screenshot({ path: `test-results/construction-preview-${viewport.width}.png`, animations: 'disabled' });
  await page.mouse.wheel(0, -60);
  await expect.poll(async () => page.evaluate(async ({ px, py }) => {
    const { battlefield: view } = await import(document.querySelector<HTMLScriptElement>('script[src*="/src/main.ts"]')!.src);
    const v = view.ghost.position.clone(); v.y -= .02; v.project(view.camera);
    return Math.hypot((v.x + 1) / 2 * innerWidth - px, (1 - v.y) / 2 * innerHeight - py);
  }, green)).toBeLessThan(.01);
  await page.mouse.wheel(0, 60); await expect(page.locator('#placement-hint')).toContainText('✓ Ubicación válida');
  await page.mouse.click(green.px, green.py); await expect(page.locator('#gold')).toHaveText('200');
  await expect(page.locator('#placement-hint')).toContainText('Demasiado cerca de otra defensa');
  await expect.poll(async () => (await state(page)).area).toBeLessThan(initial.area - .1);
  const placed = await page.evaluate(async () => { const { simulation: sim } = await import(document.querySelector<HTMLScriptElement>('script[src*="/src/main.ts"]')!.src); return { x: sim.towers[0].x, z: sim.towers[0].z }; });
  expect(placed.x).toBeCloseTo(green.x, 3); expect(placed.z).toBeCloseTo(green.z, 3);
  await page.screenshot({ path: `test-results/construction-spacing-${viewport.width}.png`, animations: 'disabled' });

  await page.keyboard.press('Escape'); expect((await state(page)).visible).toBe(false); expect((await state(page)).base).toBe(false);
  const tower = await point(page, 'tower'); await page.mouse.click(tower.px, tower.py); await expect(page.locator('#tower-panel')).toBeVisible();
  await page.locator('#sell').click(); await expect(page.locator('#gold')).toHaveText('270'); await page.keyboard.press('1');
  await expect.poll(async () => (await state(page)).visible).toBe(true); expect((await state(page)).area).toBeCloseTo(initial.area, 4);
  await page.keyboard.press('2'); await expect.poll(async () => (await state(page)).kind).toBe('crossbow');
  const restored = await point(page, 'green'); await page.mouse.move(restored.px, restored.py); await expect(page.locator('#placement-hint')).toContainText('✓ Ubicación válida');
  expect((await state(page)).range).toBe(6);
  await page.mouse.click(restored.px, restored.py); await expect(page.locator('#gold')).toHaveText('70');
  await expect.poll(async () => (await state(page)).visible).toBe(false);
  // Keep the pointer on clear terrain: lack of gold must never look like a valid preview.
  const clear = await point(page, 'green'); await page.mouse.move(clear.px, clear.py);
  await expect(page.locator('#placement-hint')).toContainText('✕ No tienes suficiente oro');
  await expect.poll(async () => (await state(page)).valid).toBe(false);
  await page.keyboard.press('Escape'); expect((await state(page)).visible).toBe(false); expect((await state(page)).range).toBe(0);
  if (viewport.width === 1536) {
    // Fund the two expensive, unlocked models to isolate their preview and range from early-wave income.
    await page.evaluate(async () => { const { simulation: sim } = await import(document.querySelector<HTMLScriptElement>('script[src*="/src/main.ts"]')!.src); sim.gold = 1000; });
    for (const defense of [{ key: '3', kind: 'mage', range: 4.8, gold: '650' }, { key: '4', kind: 'cannon', range: 4.6, gold: '150' }]) {
      await page.keyboard.press(defense.key); await expect.poll(async () => (await state(page)).kind).toBe(defense.kind);
      await expect.poll(async () => (await state(page)).visible).toBe(true);
      const spot = await point(page, 'green'); await page.mouse.move(spot.px, spot.py); await expect(page.locator('#placement-hint')).toContainText('✓ Ubicación válida');
      expect((await state(page)).range).toBe(defense.range);
      await page.screenshot({ path: `test-results/construction-${defense.kind}.png`, animations: 'disabled' });
      await page.mouse.click(spot.px, spot.py); await expect(page.locator('#gold')).toHaveText(defense.gold);
    }
  }
  expect(errors).toEqual([]);
});
