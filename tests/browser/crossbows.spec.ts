import { test, expect } from '@playwright/test';

test('three crossbow models, target controls, split volleys and visible poison work in the real battlefield', async ({ page }) => {
  test.setTimeout(240000); await page.setViewportSize({ width: 1536, height: 844 });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => localStorage.setItem('last-bastion-campaign-v1', JSON.stringify(Object.fromEntries(['pines', 'market', 'citadel', 'siege', 'woodland'].map(id => [id, { stars: 3, score: 1000 }])))));
  await page.goto('/');
  for (const [kind, price, expectedShots] of [['precision', 150, 1], ['triple', 200, 2], ['poison', 250, 1]] as const) {
    await page.getByRole('button', { name: 'Jugar: Villa de las caravanas', exact: true }).click(); await page.getByRole('button', { name: 'Pausar', exact: true }).click();
    await page.locator('#defenses-toggle').click();
    expect(await page.locator('[data-tower]').evaluateAll(cards => cards.map(card => (card as HTMLElement).dataset.tower))).toEqual(['precision', 'triple', 'poison']);
    await expect(page.locator(`[data-tower="${kind}"]`)).toContainText(String(price));
    await page.locator(`[data-tower="${kind}"]`).click();
    const point = await page.evaluate(async () => {
      const { simulation: sim, battlefield: view } = await import(document.querySelector<HTMLScriptElement>('script[src*="/src/main.ts"]')!.src);
      const pad = sim.map.pads[5], at = view.camera.position.clone().set(pad.x, 1.84, pad.z).project(view.camera);
      return { ...pad, xScreen: (at.x + 1) / 2 * innerWidth, yScreen: (1 - at.y) / 2 * innerHeight };
    });
    await page.mouse.click(point.xScreen, point.yScreen); await expect(page.locator('#gold')).toHaveText(String(300 - price)); await page.keyboard.press('Escape');
    const pick = await page.evaluate(async point => { const { battlefield: view } = await import(document.querySelector<HTMLScriptElement>('script[src*="/src/main.ts"]')!.src); const v = view.camera.position.clone().set(point.x, 2.7, point.z).project(view.camera); return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight }; }, point);
    await page.mouse.click(pick.x, pick.y); await expect(page.locator('#tower-panel')).toBeVisible();
    await page.locator('#target-priority').selectOption('gate');
    await expect.poll(() => page.evaluate(async () => { const { simulation: sim } = await import(document.querySelector<HTMLScriptElement>('script[src*="/src/main.ts"]')!.src); return sim.towers[0].priority; })).toBe('gate');
    await page.locator('#target-priority').selectOption('strongest');
    if (kind === 'poison') await expect(page.locator('.tower-stats')).toContainText('Veneno por segundo');
    if (kind === 'triple') await expect(page.locator('.tower-stats')).toContainText('Enemigos por descarga');
    const volley = await page.evaluate(async point => {
      const { simulation: sim } = await import(document.querySelector<HTMLScriptElement>('script[src*="/src/main.ts"]')!.src);
      const pathUrl = '/src/game/path.ts'; const { samplePath } = await import(/* @vite-ignore */ pathUrl);
      // Controlled combat fixture; damage, poison, reload and rewards use production rules.
      sim.wave = 1; sim.phase = 'wave'; sim.spawnQueue = []; sim.events.length = 0;
      for (let i = 0; i < 3; i++) { const e = sim.spawn('guardian'); e.progress = point.progress + i * .4; Object.assign(e, samplePath(e.progress, sim.map)); }
      sim.update(.02); sim.towers[0].cooldown = 100;
      return { projectiles: sim.projectiles.length, targets: new Set(sim.projectiles.map((p: any) => p.targetId)).size, shots: sim.events.filter((e: any) => e.type === 'shot').length };
    }, point);
    expect(volley).toEqual({ projectiles: expectedShots, targets: expectedShots, shots: 1 });
    await page.evaluate(async () => { const { simulation: sim } = await import(document.querySelector<HTMLScriptElement>('script[src*="/src/main.ts"]')!.src); for (let i = 0; i < 100; i++) sim.update(.02); });
    if (kind === 'poison') {
      await expect(page.locator('.damage-number.poison')).not.toHaveCount(0);
      expect(await page.evaluate(async () => { const { simulation: sim, battlefield: view } = await import(document.querySelector<HTMLScriptElement>('script[src*="/src/main.ts"]')!.src); return sim.enemies.some((e: any) => e.poisonRemaining > 0 && (view as any).enemies.get(e.id)?.poison.visible); })).toBe(true);
    }
    expect(await page.evaluate(async () => { const { battlefield: view } = await import(document.querySelector<HTMLScriptElement>('script[src*="/src/main.ts"]')!.src); return [...(view as any).towers.values()][0].userData.variant; })).toBe(kind);
    await page.screenshot({ path: `test-results/crossbow-${kind}.png`, animations: 'disabled' });
    await page.getByRole('button', { name: 'Abrir campaña', exact: true }).click();
  }
  expect(errors).toEqual([]);
});
