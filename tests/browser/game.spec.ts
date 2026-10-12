import { test, expect, type Page } from '@playwright/test';
async function buildPoint(page: Page, index: number, y = 1.7): Promise<{ x: number; y: number }> {
  return page.evaluate(async ({ index, y }) => {
    // Use the production route/obstacles, and project a real world position into the canvas.
    const importModule = (url: string): Promise<any> => import(/* @vite-ignore */ url);
    const THREE = await importModule('/node_modules/three/build/three.module.js');
    const { placementError, PATH, distance } = await importModule('/src/game/path.ts');
    const candidates: { x: number; z: number }[] = [];
    for (let x = 7; x < 14; x += .3) for (let z = 7; z < 12; z += .3) {
      const p = { x, z }; if (!placementError(p, [], 1000, 100) && distance(p, PATH[0]) < 4.2 && (!candidates.length || distance(p, candidates[0]) > 1.9)) candidates.push(p);
    }
    const p = index < 0 ? PATH[0] : candidates[index]; if (!p) throw new Error('No placement candidate');
    const canvas = document.querySelector('canvas')!, rect = canvas.getBoundingClientRect(), aspect = rect.width / rect.height, height = Math.max(29, 39 / aspect);
    const camera = new THREE.OrthographicCamera(-height * aspect / 2, height * aspect / 2, height / 2, -height / 2, .1, 160);
    camera.position.set(9, 30, 24); camera.lookAt(0, 0, 0); camera.updateMatrixWorld(); camera.updateProjectionMatrix();
    const projected = new THREE.Vector3(p.x, y, p.z).project(camera);
    return { x: rect.left + (projected.x + 1) / 2 * rect.width, y: rect.top + (1 - projected.y) / 2 * rect.height };
  }, { index, y });
}
test('real WebGL gameplay: free placement, upgrades, selling, pause, speed, help and live combat', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/'); await expect(page.getByRole('heading', { name: 'Recupera el reino.' })).toBeVisible();
  await page.getByRole('button', { name: 'Jugar: Aldea de los pinos', exact: true }).click();
  await page.getByRole('button', { name: 'Pausar', exact: true }).click();
  await expect(page.locator('canvas')).toHaveCount(1);
  await page.getByRole('button', { name: 'Construir torre Ballesta, 150 oro' }).click();
  const blocked = await buildPoint(page, -1, .15); await page.mouse.move(blocked.x, blocked.y);
  await expect(page.locator('#placement-hint')).toContainText('El camino debe quedar libre');
  await page.mouse.click(blocked.x, blocked.y); await expect(page.locator('#gold')).toHaveText('300');
  const p = await buildPoint(page, 0); await page.mouse.move(p.x, p.y); await expect(page.locator('#placement-hint')).toContainText('Ubicación válida');
  await page.mouse.click(p.x, p.y); await expect(page.locator('#gold')).toHaveText('150');
  await page.keyboard.press('Escape'); const pick = await buildPoint(page, 0, 2.7); await page.mouse.click(pick.x, pick.y);
  await expect(page.locator('#tower-panel')).toBeVisible(); await expect(page.locator('#tower-panel')).toContainText('NIVEL 1 / 3');
  await page.getByRole('button', { name: /Mejorar/ }).click(); await expect(page.locator('#gold')).toHaveText('0'); await expect(page.locator('#tower-panel')).toContainText('NIVEL 2 / 3');
  await expect(page.getByRole('button', { name: 'Construir torre Arqueros, 100 oro' })).toBeDisabled();
  await page.getByRole('button', { name: 'Vender por 210 oro' }).click(); await expect(page.locator('#gold')).toHaveText('210');
  await page.getByRole('button', { name: 'Construir torre Arqueros, 100 oro' }).click(); await page.mouse.click(p.x, p.y); await expect(page.locator('#gold')).toHaveText('110'); await page.keyboard.press('Escape');
  await expect(page.locator('#pause-tag')).toBeVisible();
  await page.getByRole('button', { name: 'Abrir campaña', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Continuar misión actual' })).toBeVisible();
  await page.getByRole('button', { name: 'Continuar misión actual' }).click();
  await expect(page.locator('#gold')).toHaveText('110');
  const countdown = await page.locator('#next-countdown').textContent(); await page.waitForTimeout(1100); expect(await page.locator('#next-countdown').textContent()).toBe(countdown);
  await page.getByRole('button', { name: 'Reanudar', exact: true }).click();
  await page.getByRole('button', { name: 'Cambiar velocidad a 2x' }).click(); await expect(page.locator('#speed')).toHaveText('2×');
  await page.getByRole('button', { name: 'Cómo jugar', exact: true }).click(); await expect(page.getByRole('heading', { name: 'Cada posición importa.' })).toBeVisible(); await page.getByRole('button', { name: 'Volver al valle' }).click();
  await page.getByRole('button', { name: 'Iniciar oleada 1' }).click(); await expect(page.locator('#wave-status')).toContainText('en el valle');
  await expect.poll(async () => Number(await page.locator('#gold').textContent()), { timeout: 20000 }).toBeGreaterThan(110);
  expect(errors).toEqual([]); await page.screenshot({ animations: 'disabled', path: 'test-results/bastion-desktop.png' });
});
test('responsive interface fits small desktop and keeps controls usable', async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 700 }); await page.goto('/'); await page.getByRole('button', { name: 'Jugar: Aldea de los pinos', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Iniciar oleada 1' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ animations: 'disabled', path: 'test-results/bastion-small.png' });
});

test('real defeat without unlocking and restart restore the complete game', async ({ page }) => {
  await page.goto('/'); await page.getByRole('button', { name: 'Jugar: Aldea de los pinos', exact: true }).click();
  const outcome = await page.evaluate(async () => {
    const importModule = (url: string): Promise<any> => import(/* @vite-ignore */ url);
    const module = await importModule('/src/main.ts');
    // Advance real gameplay, with no towers or invented damage, until the enemies reach the castle.
    const sim = module.simulation;
    for (let i = 0; i < 100000 && sim.phase !== 'gameover'; i++) sim.update(.02);
    return { phase: sim.phase, score: sim.score, wave: sim.wave };
  });
  expect(outcome.phase).toBe('gameover'); expect(outcome.wave).toBeGreaterThan(1);
  await expect(page.getByRole('heading', { name: 'Game Over', exact: true })).toBeVisible();
  await expect(page.locator('#hp')).toHaveText('0');
  expect(await page.evaluate(() => localStorage.getItem('last-bastion-campaign-v1'))).toBeNull();
  await page.screenshot({ animations: 'disabled', path: 'test-results/bastion-gameover.png' });
  await page.getByRole('button', { name: 'Reintentar misión' }).click();
  await expect(page.locator('#gold')).toHaveText('300'); await expect(page.locator('#hp')).toHaveText('1000'); await expect(page.locator('#wave')).toHaveText('Oleada 1 / 5');
  await expect(page.getByRole('button', { name: 'Iniciar oleada 1' })).toBeEnabled();
  expect(await page.evaluate(async () => {
    const importModule = (url: string): Promise<any> => import(/* @vite-ignore */ url);
    const { simulation } = await importModule('/src/main.ts');
    return { towers: simulation.towers.length, enemies: simulation.enemies.length, kills: simulation.kills, score: simulation.score };
  })).toEqual({ towers: 0, enemies: 0, kills: 0, score: 0 });
  await page.reload(); await expect(page.getByRole('button', { name: 'Bloqueada: Villa del mercado', exact: true })).toBeDisabled();
});


test('campaign victory unlocks maps and weapons, preserves progress on reload and resets mission state', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Bloqueada: Villa del mercado', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Jugar: Aldea de los pinos', exact: true }).click();
  await expect(page.locator('[data-tower="cannon"]')).toBeDisabled(); await expect(page.locator('[data-tower="mage"]')).toBeDisabled();
  await page.getByRole('button', { name: 'Pausar', exact: true }).click();
  await page.getByRole('button', { name: 'Construir torre Arqueros, 100 oro' }).click(); const p = await buildPoint(page, 0); await page.mouse.click(p.x, p.y); await expect(page.locator('#gold')).toHaveText('200');
  await page.keyboard.press('Escape');
  // Keep the built tower shooting; deterministically defeat surviving enemies to exercise actual mission completion.
  async function win(): Promise<void> {
    await page.evaluate(async () => {
      const importModule = (url: string): Promise<any> => import(/* @vite-ignore */ url);
      const { simulation: sim } = await importModule('/src/main.ts');
      for (let i = 0; i < 100000 && !sim.finished; i++) { sim.update(.02); for (const enemy of sim.enemies) sim.hit(enemy, 100000, 'magic'); }
    });
    await expect(page.getByRole('heading', { name: '¡Castillo defendido!', exact: true })).toBeVisible();
  }
  await win(); await expect(page.locator('.victory-stars')).toHaveAttribute('aria-label', '3 de 3 estrellas');
  await expect(page.locator('.victory-reward')).toContainText('Villa del mercado'); await page.screenshot({ animations: 'disabled', path: 'test-results/campaign-victory.png' });
  await page.getByRole('button', { name: 'Siguiente misión', exact: true }).click();
  await expect(page.locator('#mission-title')).toHaveText('VILLA DEL MERCADO'); await expect(page.locator('#gold')).toHaveText('300'); await expect(page.locator('#hp')).toHaveText('1000');
  await expect(page.locator('[data-tower="cannon"]')).toBeEnabled(); await expect(page.locator('[data-tower="mage"]')).toBeDisabled();
  expect(await page.evaluate(async () => { const importModule = (url: string): Promise<any> => import(/* @vite-ignore */ url); const module = await importModule('/src/main.ts'); return { towers: module.simulation.towers.length, wave: module.simulation.wave, map: module.simulation.map.theme }; })).toEqual({ towers: 0, wave: 0, map: 'village' });
  await page.getByRole('button', { name: 'Pausar', exact: true }).click(); await page.screenshot({ animations: 'disabled', path: 'test-results/campaign-village.png' });
  await win(); await page.getByRole('button', { name: 'Siguiente misión', exact: true }).click();
  await expect(page.locator('#mission-title')).toHaveText('CIUDADELA REAL'); await expect(page.locator('[data-tower="mage"]')).toBeEnabled();
  await page.getByRole('button', { name: 'Pausar', exact: true }).click(); await page.screenshot({ animations: 'disabled', path: 'test-results/campaign-citadel.png' });
  await win(); await expect(page.locator('.victory-reward')).toContainText('Campaña completada');
  await page.getByRole('button', { name: 'Volver a la campaña', exact: true }).click(); await expect(page.locator('.campaign-summary')).toContainText('9 / 9');
  await page.reload(); await expect(page.locator('.campaign-summary')).toContainText('9 / 9'); await expect(page.getByRole('button', { name: 'Jugar: Ciudadela real', exact: true })).toBeEnabled();
  await expect(page.locator('body')).not.toContainText('CRISTAL'); expect(errors).toEqual([]);
  await page.screenshot({ animations: 'disabled', path: 'test-results/campaign-complete.png' });
});
