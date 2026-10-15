import { test, expect } from '@playwright/test';

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) test(`natural scenery sample keeps construction and map revisits working at ${viewport.width}`, async ({ page }) => {
  test.setTimeout(180000); await page.setViewportSize(viewport);
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/'); await page.getByRole('button', { name: 'Iniciar campaña', exact: true }).click();
  await expect(page.locator('#mission-title')).toHaveText('ALDEA DE LOS PINOS');
  const inspect = () => page.evaluate(async () => {
    const { battlefield: view } = await import(document.querySelector<HTMLScriptElement>('script[src*="/src/main.ts"]')!.src);
    const edge = view.scene.getObjectByName('natural-road-edge');
    return { edge: !!edge, stones: !!view.scene.getObjectByName('natural-road-banks'), calls: view.renderer.info.render.calls, triangles: view.renderer.info.render.triangles };
  });
  await expect.poll(async () => (await inspect()).calls).toBeLessThan(125);
  const initial = await inspect(); expect(initial.edge).toBe(true); expect(initial.stones).toBe(false); expect(initial.triangles).toBeLessThan(600000);
  await page.keyboard.press('1');
  const point = await page.evaluate(async () => {
    const { simulation: sim, battlefield: view } = await import(document.querySelector<HTMLScriptElement>('script[src*="/src/main.ts"]')!.src);
    const pad = sim.map.pads.find((p: { progress: number }) => p.progress === sim.map.length - 1)!;
    const at = view.camera.position.clone().set(pad.x, 1.84, pad.z).project(view.camera);
    return { x: (at.x + 1) / 2 * innerWidth, y: (1 - at.y) / 2 * innerHeight };
  });
  await page.mouse.click(point.x, point.y); await expect(page.locator('#gold')).toHaveText('150');
  await page.keyboard.press('Escape');
  await page.screenshot({ path: `test-results/natural-scenery-${viewport.width}.png`, animations: 'disabled' });
  await page.getByRole('button', { name: 'Acercar vista', exact: true }).click();
  await page.getByRole('button', { name: 'Acercar vista', exact: true }).click();
  await page.screenshot({ path: `test-results/natural-scenery-zoom-${viewport.width}.png`, animations: 'disabled' });
  await page.getByRole('button', { name: 'Abrir campaña', exact: true }).click();
  await page.getByRole('button', { name: 'Jugar: Aldea de los pinos', exact: true }).click();
  await expect(page.locator('#gold')).toHaveText('300'); expect((await inspect()).edge).toBe(true); expect((await inspect()).stones).toBe(false);
  await page.locator('#next-wave').click(); await expect(page.locator('#wave-status')).toContainText('en el valle');
  expect(errors).toEqual([]);
});
