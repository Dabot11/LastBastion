import { test, expect } from '@playwright/test';

for (const viewport of [{ width: 1440, height: 960 }, { width: 390, height: 844 }]) test(`optional gate guide is playable without a preparation timer at ${viewport.width}`, async ({ page }) => {
  test.setTimeout(120000); await page.setViewportSize(viewport);
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/'); await page.getByRole('button', { name: 'Iniciar campaña', exact: true }).click();
  await expect(page.locator('#guide-text')).toContainText('junto a la puerta');
  await expect(page.locator('#defenses-toggle')).toHaveClass(/guide-target/);
  await expect(page.locator('#next-countdown')).toContainText('Sin prisa');
  await expect(page.locator('#preparation-progress')).toBeHidden();
  const pad = await page.evaluate(async () => {
    const { simulation: sim, battlefield: view } = await import(document.querySelector<HTMLScriptElement>('script[src*="/src/main.ts"]')!.src);
    sim.update(120);
    if (sim.wave !== 0) throw new Error('The tutorial started automatically');
    const marker = view.scene.getObjectByName('recommended-gate-base');
    if (!marker?.visible) throw new Error('The optional gate marker is missing');
    const site = sim.map.pads.find((p: any) => p.progress === sim.map.length - 1);
    const v = view.camera.position.clone().set(site.x, 1.84, site.z).project(view.camera);
    return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight, id: site.id };
  });
  await page.screenshot({ path: `test-results/progression-guide-${viewport.width}.png`, animations: 'disabled' });
  await page.locator('#defenses-toggle').click(); await expect(page.locator('[data-tower="precision"]')).toHaveClass(/guide-target/);
  await page.locator('[data-tower="precision"]').click(); await expect(page.locator('#guide-text')).toContainText('base iluminada');
  // Drawer and guide change the framing; project the actual base after choosing the defense.
  const at = await page.evaluate(async id => {
    const { simulation: sim, battlefield: view } = await import(document.querySelector<HTMLScriptElement>('script[src*="/src/main.ts"]')!.src);
    const site = sim.map.pads.find((p: any) => p.id === id); const v = view.camera.position.clone().set(site.x, 1.84, site.z).project(view.camera);
    return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight };
  }, pad.id);
  await page.mouse.click(at.x, at.y); await expect(page.locator('#gold')).toHaveText('150');
  await expect(page.locator('#guide-text')).toContainText('¡Listo!'); await expect(page.locator('#next-wave')).toHaveClass(/guide-target/);
  await expect.poll(() => page.evaluate(async () => {
    const { battlefield: view } = await import(document.querySelector<HTMLScriptElement>('script[src*="/src/main.ts"]')!.src); return view.scene.getObjectByName('recommended-gate-base')?.visible;
  })).toBe(false);
  await page.keyboard.press('Escape'); await page.locator('#next-wave').click(); await expect(page.locator('#mission-guide')).toBeHidden();
  await expect(page.locator('#wave')).toHaveText('Oleada 1 / 3');
  expect(errors).toEqual([]);
});

test('guide can be skipped and completed missions replay without onboarding', async ({ page }) => {
  await page.goto('/'); await page.getByRole('button', { name: 'Iniciar campaña', exact: true }).click();
  await page.getByRole('button', { name: 'Omitir ayuda de esta misión' }).click(); await expect(page.locator('#mission-guide')).toBeHidden();
  await expect(page.locator('#defenses-toggle')).not.toHaveClass(/guide-target/);
  await page.locator('#defenses-toggle').click(); await expect(page.locator('#mission-guide')).toBeHidden();
  await page.evaluate(() => localStorage.setItem('last-bastion-campaign-v1', JSON.stringify({ pines: { stars: 3, score: 1000 } })));
  await page.reload(); await page.getByRole('button', { name: 'Jugar: Aldea de los pinos', exact: true }).click();
  await expect(page.locator('#mission-guide')).toBeHidden(); await expect(page.locator('#next-countdown')).toContainText('Sin prisa');
});
