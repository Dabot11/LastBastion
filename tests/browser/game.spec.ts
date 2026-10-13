import { test, expect, type Page } from '@playwright/test';
import { MISSIONS } from '../../src/game/missions';
async function choosePrecision(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Construir defensas', exact: true }).click();
  await page.getByRole('button', { name: 'Construir torre Precisión, 150 oro', exact: true }).click();
  await expect(page.locator('#defenses-menu')).toBeHidden();
}
async function buildPoint(page: Page, index: number, y = 1.84): Promise<{ x: number; y: number }> {
  return page.evaluate(async ({ index, y }) => {
    // Use the production route/obstacles, and project a real world position into the canvas.
    const importModule = (url: string): Promise<any> => import(/* @vite-ignore */ url);
    const THREE = await importModule('/node_modules/three/build/three.module.js');
    const { DEFAULT_MAP, samplePath, distance } = await importModule('/src/game/path.ts');
    const candidates: { x: number; z: number }[] = [];
    for (const p of DEFAULT_MAP.pads) candidates.push(p);
    candidates.sort((a, b) => distance(a, samplePath(9)) - distance(b, samplePath(9)));
    const p = index < 0 ? samplePath(9) : candidates[index]; if (!p) throw new Error('No placement candidate');
    const { battlefield } = await importModule(document.querySelector<HTMLScriptElement>('script[src*="/src/main.ts"]')!.src);
    const canvas = document.querySelector('canvas')!, rect = canvas.getBoundingClientRect(), camera = battlefield.camera;
    const projected = new THREE.Vector3(p.x, y, p.z).project(camera);
    return { x: rect.left + (projected.x + 1) / 2 * rect.width, y: rect.top + (1 - projected.y) / 2 * rect.height };
  }, { index, y });
}
test('real gate siege shows wood, surviving attackers, exact damage numbers and responsive health', async ({ page }) => {
  test.setTimeout(120000);
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => localStorage.setItem('last-bastion-campaign-v1', JSON.stringify({ pines: { stars: 3, score: 1000 }, market: { stars: 3, score: 1000 }, citadel: { stars: 3, score: 1000 } })));
  await page.goto('/'); await page.getByRole('button', { name: 'Jugar: El último bastión', exact: true }).click();
  await page.getByRole('button', { name: 'Pausar', exact: true }).click();
  const state = await page.evaluate(async () => {
    const load = (url: string): Promise<any> => import(/* @vite-ignore */ url);
    const { simulation: sim, battlefield: view } = await load(document.querySelector<HTMLScriptElement>('script[src*="/src/main.ts"]')!.src);
    const { gateDefenceSites } = await load('/src/game/path.ts');
    // Controlled arrival fixture. Gate HP, tower damage, attacks and rewards use the production simulation.
    sim.startWave(); sim.spawnQueue = []; sim.spawned = sim.waveTotal;
    for (const kind of ['guardian', 'minion']) { const e = sim.spawn(kind); e.progress = sim.map.length - .85; }
    if (typeof sim.build('precision', gateDefenceSites(sim.map)[1]) === 'string') throw new Error('Gate flank is not buildable');
    for (let i = 0; i < 100; i++) sim.update(.02);
    return { hp: sim.castleHp, maxHp: sim.maxGateHp, gateDamage: sim.events.filter((e: any) => e.type === 'gateHit').map((e: any) => e.damage), enemyDamage: sim.events.filter((e: any) => e.type === 'damage').map((e: any) => e.damage), alive: sim.enemies.length, state: sim.enemies[0].state, door: !!view.scene.getObjectByName('castle-door'), cave: !!view.scene.getObjectByName('enemy-cave') };
  });
  expect(state.alive).toBe(2); expect(state.state).toBe('attacking'); expect(state.door && state.cave).toBe(true);
  expect(state.hp).toBe(state.maxHp - state.gateDamage.reduce((sum: number, value: number) => sum + value, 0));
  expect(state.gateDamage).toEqual([40, 8, 8]); expect(state.enemyDamage.length).toBeGreaterThan(0);
  await expect(page.locator('#hp')).toHaveText(String(state.hp)); await expect(page.locator('.gate-label')).toContainText(`${state.hp} / ${state.maxHp}`);
  await expect(page.locator('#wave-status')).toContainText('2 atacando la puerta');
  await expect(page.locator('#next-label')).toContainText('Refuerza sus flancos');
  await expect(page.locator('.damage-number.gate')).toHaveCount(state.gateDamage.length);
  expect(await page.locator('.damage-number.physical').evaluateAll(nodes => nodes.map(n => Number((n as HTMLElement).dataset.damage)))).toEqual(state.enemyDamage);
  await page.screenshot({ animations: 'disabled', path: 'test-results/siege-desktop.png' });
  await page.getByRole('button', { name: 'Acercar vista' }).click(); await page.getByRole('button', { name: 'Acercar vista' }).click();
  await page.screenshot({ animations: 'disabled', path: 'test-results/siege-closeup.png' });
  await page.getByRole('button', { name: 'Abrir campaña', exact: true }).click(); await page.getByRole('button', { name: 'Jugar: Aldea de los pinos', exact: true }).click();
  await expect(page.locator('#hp')).toHaveText('1000'); await expect(page.locator('.damage-number')).toHaveCount(0);
  expect(errors).toEqual([]);
});
test('real WebGL gameplay: foundation placement, upgrades, selling, pause, speed, help and live combat', async ({ page }) => {
  // Covers many pointer interactions plus live combat on the software WebGL renderer.
  test.setTimeout(210000);
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/'); await expect(page.getByRole('heading', { name: 'Recupera el reino.' })).toBeVisible();
  await page.getByRole('button', { name: 'Jugar: Aldea de los pinos', exact: true }).click();
  await page.getByRole('button', { name: 'Pausar', exact: true }).click();
  await expect(page.locator('canvas')).toHaveCount(1);
  await choosePrecision(page);
  const blocked = await buildPoint(page, -1, .15); await page.mouse.move(blocked.x, blocked.y);
  await expect(page.locator('#placement-hint')).toContainText('Sobre el camino');
  await page.mouse.click(blocked.x, blocked.y); await expect(page.locator('#gold')).toHaveText('300');
  const p = await buildPoint(page, 0); await page.mouse.move(p.x, p.y); await expect(page.locator('#placement-hint')).toContainText('Ubicación válida');
  await page.mouse.click(p.x, p.y); await expect(page.locator('#gold')).toHaveText('150');
  await page.keyboard.press('Escape'); const pick = await buildPoint(page, 0, 2.7); await page.mouse.click(pick.x, pick.y);
  await expect(page.locator('#tower-panel')).toBeVisible(); await expect(page.locator('#tower-panel')).toContainText('NIVEL 1 / 3');
  await page.getByRole('button', { name: /Mejorar/ }).click(); await expect(page.locator('#gold')).toHaveText('40'); await expect(page.locator('#tower-panel')).toContainText('NIVEL 2 / 3');
  await expect(page.locator('.tower-stats')).toContainText('90→120');
  await expect(page.getByRole('button', { name: /Mejorar a nivel 3/ })).toBeDisabled();
  await expect(page.locator('.upgrade-shortfall')).toHaveText('Te faltan 160 de oro');
  await page.screenshot({ animations: 'disabled', path: 'test-results/tower-upgrade-preview.png' });
  await page.getByRole('button', { name: 'Vender por 182 oro' }).click(); await expect(page.locator('#gold')).toHaveText('222');
  await choosePrecision(page); await page.mouse.click(p.x, p.y); await expect(page.locator('#gold')).toHaveText('72'); await page.keyboard.press('Escape');
  await expect(page.locator('#pause-tag')).toBeVisible();
  await page.getByRole('button', { name: 'Abrir campaña', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Continuar misión actual' })).toBeVisible();
  await page.getByRole('button', { name: 'Continuar misión actual' }).click();
  await expect(page.locator('#gold')).toHaveText('72');
  const countdown = await page.locator('#next-countdown').textContent(); await page.waitForTimeout(1100); expect(await page.locator('#next-countdown').textContent()).toBe(countdown);
  await page.getByRole('button', { name: 'Reanudar', exact: true }).click();
  await page.getByRole('button', { name: 'Cambiar velocidad a 2x' }).click(); await expect(page.locator('#speed')).toHaveText('2×');
  await page.getByRole('button', { name: 'Cómo jugar', exact: true }).click(); await expect(page.getByRole('heading', { name: 'Cada posición importa.' })).toBeVisible(); await page.getByRole('button', { name: 'Volver al valle' }).click();
  await page.getByRole('button', { name: 'Iniciar oleada 1' }).click(); await expect(page.locator('#wave-status')).toContainText('en el valle');
  // Software rendering advances fewer simulation frames while enemy/projectile shaders first compile.
  await expect.poll(async () => Number(await page.locator('#gold').textContent()), { timeout: 45000 }).toBeGreaterThan(72);
  expect(errors).toEqual([]); await page.screenshot({ animations: 'disabled', path: 'test-results/bastion-desktop.png' });
});
test('responsive interface fits small desktop and keeps controls usable', async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 700 }); await page.goto('/'); await page.getByRole('button', { name: 'Jugar: Aldea de los pinos', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Iniciar oleada 1' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ animations: 'disabled', path: 'test-results/bastion-small.png' });
});

test('preparation forecasts the actual enemies and warns about an escorted guardian before starting', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('last-bastion-campaign-v1', JSON.stringify({ pines: { stars: 3, score: 1000 }, market: { stars: 3, score: 1000 }, citadel: { stars: 3, score: 1000 } })));
  await page.goto('/'); await page.getByRole('button', { name: 'Jugar: Ciudadela real', exact: true }).click();
  await page.getByRole('button', { name: 'Pausar', exact: true }).click();
  await expect(page.locator('#wave-status')).toContainText('10 esbirros · 4 rápidos');
  const state = await page.evaluate(async () => {
    const load = (url: string): Promise<any> => import(/* @vite-ignore */ url);
    const { simulation: sim } = await load(document.querySelector<HTMLScriptElement>('script[src*="/src/main.ts"]')!.src);
    const { scenarioPlanner } = await load('/scripts/balance-scenarios.ts'); const plan = scenarioPlanner(sim.mission, 'mixed');
    // Play four entire waves with legally purchased towers and actual projectiles, then inspect preparation.
    for (let ticks = 0; ticks < 40000 && !sim.finished && !(sim.wave === 4 && sim.phase === 'preparation'); ticks++) {
      if (sim.phase === 'preparation') { plan(sim); sim.startWave(); }
      sim.update(.02); sim.events.length = 0;
    }
    return { wave: sim.wave, phase: sim.phase, hp: sim.castleHp };
  });
  expect(state).toEqual({ wave: 4, phase: 'preparation', hp: 1400 });
  await expect(page.locator('#wave')).toHaveText('Oleada 5 / 7');
  await expect(page.locator('#wave-status')).toContainText('1 guardián');
  await expect(page.locator('#challenge')).toBeVisible(); await expect(page.locator('#challenge')).toHaveText('GUARDIÁN');
  await expect(page.locator('#next-label')).toContainText('Guardián:');
  await page.screenshot({ animations: 'disabled', path: 'test-results/balance-preview.png' });
  await page.getByRole('button', { name: 'Reanudar', exact: true }).click(); await page.getByRole('button', { name: 'Iniciar oleada 5', exact: true }).click();
  await expect(page.locator('#wave-status')).toContainText('en el valle'); await expect(page.locator('#challenge')).toHaveText('HORDA DE ÉLITE');
});

for (const [viewport, batch] of [[{ width: 1440, height: 960 }, 0], [{ width: 1440, height: 960 }, 1], [{ width: 1920, height: 1080 }, 0], [{ width: 900, height: 700 }, 0], [{ width: 900, height: 700 }, 1], [{ width: 1280, height: 720 }, 0]] as const) test(`full-screen valley keeps routes visible at ${viewport.width}×${viewport.height}, batch ${batch + 1}`, async ({ page }) => {
  // New routes are checked against the actual canvas and persistent command strip.
  test.setTimeout(180000);
  await page.addInitScript(ids => localStorage.setItem('last-bastion-campaign-v1', JSON.stringify(Object.fromEntries(ids.map(id => [id, { stars: 3, score: 1000 }])))), MISSIONS.map(m => m.id));
  await page.goto('/');
    await page.setViewportSize(viewport);
    for (const name of (viewport.width === 1440 || viewport.width === 900 ? MISSIONS.slice(batch * 5, batch * 5 + 5) : MISSIONS.slice(0, 4)).map(m => m.name)) {
      await page.getByRole('button', { name: `Jugar: ${name}`, exact: true }).click();
      await page.getByRole('button', { name: 'Pausar', exact: true }).click();
      const result = await page.evaluate(async () => {
        const load = (url: string): Promise<any> => import(/* @vite-ignore */ url);
        const { simulation, battlefield } = await load(document.querySelector<HTMLScriptElement>('script[src*="/src/main.ts"]')!.src);
        const canvas = battlefield.renderer.domElement, rect = canvas.getBoundingClientRect();
        const missing: unknown[] = [];
        for (const point of simulation.map.path) {
          const { roadHeight } = await load('/src/game/path.ts');
          const world = battlefield.camera.position.clone().set(point.x, roadHeight(point, simulation.map), point.z).project(battlefield.camera);
          const x = rect.left + (world.x + 1) / 2 * rect.width, y = rect.top + (1 - world.y) / 2 * rect.height;
          if (document.elementFromPoint(x, y) !== canvas) missing.push({ point, x, y, element: document.elementFromPoint(x, y)?.outerHTML.slice(0, 90) });
        }
        return { width: rect.width, height: rect.height, missing };
      });
      expect(result.width).toBe(viewport.width); expect(result.height).toBe(viewport.height); expect(result.missing, `${name} at ${viewport.width}×${viewport.height}`).toEqual([]);
      if (name === 'Ciudadela real') await page.screenshot({ animations: 'disabled', path: `test-results/valley-${viewport.width}.png` });
      await page.getByRole('button', { name: 'Abrir campaña', exact: true }).click();
    }
  if (viewport.width !== 900) return;
  await page.getByRole('button', { name: 'Jugar: Aldea de los pinos', exact: true }).click();
  async function zoom(): Promise<number> { return page.evaluate(async () => { const load = (url: string): Promise<any> => import(/* @vite-ignore */ url); return (await load(document.querySelector<HTMLScriptElement>('script[src*="/src/main.ts"]')!.src)).battlefield.camera.zoom; }); }
  await page.getByRole('button', { name: 'Acercar vista', exact: true }).click(); expect(await zoom()).toBeGreaterThan(1);
  await page.getByRole('button', { name: 'Restablecer vista', exact: true }).click(); expect(await zoom()).toBe(1);
  await page.getByRole('button', { name: 'Alejar vista', exact: true }).click(); expect(await zoom()).toBeLessThan(1);
});

test('real defeat without unlocking and restart restore the complete game', async ({ page }) => {
  await page.goto('/'); await page.getByRole('button', { name: 'Jugar: Aldea de los pinos', exact: true }).click();
  const outcome = await page.evaluate(async () => {
    const importModule = (url: string): Promise<any> => import(/* @vite-ignore */ url);
    const module = await importModule(document.querySelector<HTMLScriptElement>('script[src*="/src/main.ts"]')!.src);
    // Advance real gameplay, with no towers or invented damage, until the enemies reach the castle.
    const sim = module.simulation;
    for (let i = 0; i < 100000 && sim.phase !== 'gameover'; i++) sim.update(.02);
    return { phase: sim.phase, score: sim.score, wave: sim.wave };
  });
  expect(outcome.phase).toBe('gameover'); expect(outcome.wave).toBe(1);
  await expect(page.getByRole('heading', { name: 'El castillo ha caído.', exact: true })).toBeVisible();
  await expect(page.locator('#hp')).toHaveText('0');
  expect(await page.evaluate(() => localStorage.getItem('last-bastion-campaign-v1'))).toBeNull();
  await page.screenshot({ animations: 'disabled', path: 'test-results/bastion-gameover.png' });
  await page.getByRole('button', { name: 'Reintentar misión' }).click();
  await expect(page.locator('#gold')).toHaveText('300'); await expect(page.locator('#hp')).toHaveText('1000'); await expect(page.locator('#wave')).toHaveText('Oleada 1 / 5');
  await expect(page.getByRole('button', { name: 'Iniciar oleada 1' })).toBeEnabled();
  expect(await page.evaluate(async () => {
    const importModule = (url: string): Promise<any> => import(/* @vite-ignore */ url);
    const { simulation } = await importModule(document.querySelector<HTMLScriptElement>('script[src*="/src/main.ts"]')!.src);
    return { towers: simulation.towers.length, enemies: simulation.enemies.length, kills: simulation.kills, score: simulation.score };
  })).toEqual({ towers: 0, enemies: 0, kills: 0, score: 0 });
  await page.reload(); await expect(page.getByRole('button', { name: 'Bloqueada: Villa del mercado', exact: true })).toBeDisabled();
});


test('campaign victory unlocks maps and weapons, preserves progress on reload and resets mission state', async ({ page }) => {
  // Includes all four complete missions, multiple WebGL terrains and a full-page reload.
  test.setTimeout(180000);
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Bloqueada: Villa del mercado', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Jugar: Aldea de los pinos', exact: true }).click();
  await expect(page.locator('[data-tower="triple"]')).toBeDisabled(); await expect(page.locator('[data-tower="poison"]')).toBeDisabled();
  await page.getByRole('button', { name: 'Pausar', exact: true }).click();
  await choosePrecision(page); const p = await buildPoint(page, 0); await page.mouse.click(p.x, p.y); await expect(page.locator('#gold')).toHaveText('150');
  await page.keyboard.press('Escape');
  // Keep the built tower shooting; deterministically defeat surviving enemies to exercise actual mission completion.
  async function win(): Promise<void> {
    await page.evaluate(async () => {
      const importModule = (url: string): Promise<any> => import(/* @vite-ignore */ url);
      const { simulation: sim } = await importModule(document.querySelector<HTMLScriptElement>('script[src*="/src/main.ts"]')!.src);
      // This fast-forward checks campaign state. Consume intermediate graphics events as normal frames do;
      // live tower damage and damage labels are covered by the dedicated gameplay/siege checks.
      for (let i = 0; i < 100000 && !sim.finished; i++) { sim.update(.02); for (const enemy of sim.enemies) sim.hit(enemy, 100000, 'physical'); sim.events.length = 0; }
    });
    await expect(page.getByRole('heading', { name: '¡Castillo defendido!', exact: true })).toBeVisible();
  }
  await win(); await expect(page.locator('.victory-stars')).toHaveAttribute('aria-label', '3 de 3 estrellas');
  await expect(page.locator('.victory-reward')).toContainText('Villa del mercado'); await page.screenshot({ animations: 'disabled', path: 'test-results/campaign-victory.png' });
  await page.getByRole('button', { name: 'Siguiente misión', exact: true }).click();
  await expect(page.locator('#mission-title')).toHaveText('VILLA DEL MERCADO'); await expect(page.locator('#gold')).toHaveText('300'); await expect(page.locator('#hp')).toHaveText('1200');
  await expect(page.locator('[data-tower="triple"]')).toBeEnabled(); await expect(page.locator('[data-tower="poison"]')).toBeDisabled();
  expect(await page.evaluate(async () => { const importModule = (url: string): Promise<any> => import(/* @vite-ignore */ url); const module = await importModule(document.querySelector<HTMLScriptElement>('script[src*="/src/main.ts"]')!.src); return { towers: module.simulation.towers.length, wave: module.simulation.wave, map: module.simulation.map.theme }; })).toEqual({ towers: 0, wave: 0, map: 'village' });
  await page.getByRole('button', { name: 'Pausar', exact: true }).click(); await page.screenshot({ animations: 'disabled', path: 'test-results/campaign-village.png' });
  await win(); await page.getByRole('button', { name: 'Siguiente misión', exact: true }).click();
  await expect(page.locator('#mission-title')).toHaveText('CIUDADELA REAL'); await expect(page.locator('[data-tower="poison"]')).not.toHaveClass(/locked/); await expect(page.locator('[data-tower="poison"]')).toContainText('Contra armaduras');
  await page.getByRole('button', { name: 'Pausar', exact: true }).click(); await page.screenshot({ animations: 'disabled', path: 'test-results/campaign-citadel.png' });
  await win(); await expect(page.locator('.victory-reward')).toContainText('El último bastión');
  await page.getByRole('button', { name: 'Siguiente misión', exact: true }).click();
  await expect(page.locator('#mission-title')).toHaveText('EL ÚLTIMO BASTIÓN');
  await expect(page.locator('[data-tower="poison"]')).toBeEnabled();
  expect(await page.locator('[data-tower]').evaluateAll(cards => cards.map(card => (card as HTMLElement).dataset.tower))).toEqual(['precision', 'triple', 'poison']);
  await page.getByRole('button', { name: 'Pausar', exact: true }).click();
  await page.screenshot({ animations: 'disabled', path: 'test-results/campaign-siege.png' });
  await win(); await expect(page.locator('.victory-reward')).toContainText('Bosque de los ecos');
  await page.getByRole('button', { name: 'Ver campaña', exact: true }).click(); await expect(page.locator('.campaign-summary')).toContainText('12 / 30');
  await page.reload(); await expect(page.locator('.campaign-summary')).toContainText('12 / 30');
  await expect(page.getByRole('button', { name: 'Jugar: Bosque de los ecos', exact: true })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Bloqueada: Villa de las caravanas', exact: true })).toBeDisabled();
  await expect(page.locator('body')).not.toContainText('CRISTAL'); expect(errors).toEqual([]);
  await page.screenshot({ animations: 'disabled', path: 'test-results/campaign-complete.png' });
});

test('campaign and help support keyboard navigation without interacting with the battlefield underneath', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Iniciar campaña', exact: true })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'Jugar: Aldea de los pinos', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Iniciar campaña', exact: true })).toBeFocused();
  expect(await page.locator('#board').evaluate(el => (el as HTMLElement).inert)).toBe(true);
  await page.getByRole('button', { name: 'Cómo jugar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Cada posición importa.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cerrar ayuda', exact: true })).toBeFocused();
  await page.keyboard.press('Space');
  await expect(page.getByRole('heading', { name: 'Recupera el reino.' })).toBeVisible();
  await page.getByRole('button', { name: 'Cómo jugar', exact: true }).click(); await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Iniciar campaña', exact: true })).toBeFocused();
  await page.keyboard.press('Enter'); await expect(page.locator('#overlay')).toBeHidden();
  expect(await page.locator('#board').evaluate(el => (el as HTMLElement).inert)).toBe(false);
  await page.keyboard.press('Space'); await expect(page.locator('#pause-tag')).toBeVisible();
  await page.getByRole('button', { name: 'Iniciar oleada 1', exact: true }).click();
  await expect(page.locator('#pause-tag')).toBeHidden(); await expect(page.locator('#wave-status')).toContainText('en el valle');
  expect(await page.evaluate(() => localStorage.getItem('last-bastion-campaign-v1'))).toBeNull();
});

test('portrait menus, tower actions and battle results fit a phone viewport', async ({ page }) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto('/');
  async function fits(): Promise<void> {
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const dialog = await page.locator('#dialog').boundingBox();
    if (await page.locator('#overlay').isVisible()) { expect(dialog!.x).toBeGreaterThanOrEqual(0); expect(dialog!.x + dialog!.width).toBeLessThanOrEqual(390); expect(Math.round(dialog!.height)).toBeLessThanOrEqual(820); }
  }
  await fits(); await page.screenshot({ path: 'test-results/ui-campaign-phone.png', animations: 'disabled' });
  await page.getByRole('button', { name: 'Cómo jugar', exact: true }).click(); await fits();
  await page.getByRole('button', { name: 'Volver a la campaña', exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'test-results/ui-help-phone.png', animations: 'disabled' });
  await page.getByRole('button', { name: 'Volver a la campaña', exact: true }).click();
  await page.getByRole('button', { name: 'Iniciar campaña', exact: true }).click(); await page.keyboard.press('Space');
  await expect(page.locator('#pause-tag')).toBeVisible(); await fits();
  await page.getByRole('button', { name: 'Cómo jugar', exact: true }).click();
  await page.getByRole('button', { name: 'Volver al valle', exact: true }).click();
  // Exercise visible upgrade actions with real legal purchases; victory/defeat fixtures only advance the results UI.
  const p = await page.evaluate(async () => {
    const load = (url: string): Promise<any> => import(/* @vite-ignore */ url);
    const { simulation: sim, battlefield: view } = await load(document.querySelector<HTMLScriptElement>('script[src*="/src/main.ts"]')!.src);
    const { placementError } = await load('/src/game/path.ts');
    for (const { x, z } of sim.map.pads) if (!placementError({ x, z }, [], sim.gold, 100, sim.map)) {
      sim.build('precision', { x, z }); const v = view.camera.position.clone().set(x, 2.7, z).project(view.camera); return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight };
    }
    throw new Error('No legal build point');
  });
  await expect(page.locator('#gold')).toHaveText('150'); await page.mouse.click(p.x, p.y);
  await expect(page.locator('#tower-panel')).toBeVisible();
  const upgrade = await page.locator('#upgrade').boundingBox(), dock = await page.locator('.command-strip').boundingBox();
  expect(upgrade!.y + upgrade!.height).toBeLessThan(dock!.y);
  await page.locator('#upgrade').click(); await expect(page.locator('#gold')).toHaveText('40');
  const notice = await page.locator('#toast').boundingBox(), details = await page.locator('#tower-panel').boundingBox();
  expect(details!.y).toBeGreaterThan(notice!.y + notice!.height);
  await page.screenshot({ path: 'test-results/ui-upgrade-phone.png', animations: 'disabled' });
  await page.evaluate(async () => { const { simulation: sim } = await import(document.querySelector<HTMLScriptElement>('script[src*="/src/main.ts"]')!.src); sim.towers = []; for (let i = 0; i < 100000 && !sim.finished; i++) sim.update(.02); });
  await expect(page.getByRole('heading', { name: 'El castillo ha caído.', exact: true })).toBeVisible(); await fits();
  await page.screenshot({ path: 'test-results/ui-defeat-phone.png', animations: 'disabled' });
  await page.getByRole('button', { name: 'Reintentar misión', exact: true }).click();
  await page.evaluate(async () => { const { simulation: sim } = await import(document.querySelector<HTMLScriptElement>('script[src*="/src/main.ts"]')!.src); for (let i = 0; i < 100000 && !sim.finished; i++) { sim.update(.02); for (const e of sim.enemies) sim.hit(e, 100000, 'physical'); } });
  await expect(page.getByRole('heading', { name: '¡Castillo defendido!', exact: true })).toBeVisible(); await fits();
  await page.getByRole('button', { name: 'Siguiente misión', exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'test-results/ui-victory-phone.png', animations: 'disabled' });
});

test('a completed campaign recognizes the victory and recommends replaying a mission with fewer stars', async ({ page }) => {
  await page.addInitScript(missions => {
    if (!localStorage.getItem('last-bastion-campaign-v1')) localStorage.setItem('last-bastion-campaign-v1', JSON.stringify(Object.fromEntries(missions.map((id, i) => [id, { stars: i === 1 ? 1 : i === 2 ? 2 : 3, score: 1000 }]))));
  }, MISSIONS.map(m => m.id));
  await page.goto('/'); await expect(page.getByRole('heading', { name: 'Reino recuperado.' })).toBeVisible();
  await expect(page.locator('.hero-goal')).toContainText('Villa del mercado'); await expect(page.locator('.campaign-summary')).toContainText('27 / 30');
  await page.getByRole('button', { name: 'Conseguir más estrellas', exact: true }).click();
  await expect(page.locator('#mission-title')).toHaveText('VILLA DEL MERCADO'); await expect(page.locator('#gold')).toHaveText('300');
  await page.evaluate(ids => localStorage.setItem('last-bastion-campaign-v1', JSON.stringify(Object.fromEntries(ids.map(id => [id, { stars: 3, score: 1000 }])))), MISSIONS.map(m => m.id));
  await page.reload(); await expect(page.locator('.campaign-summary')).toContainText('30 / 30');
  await expect(page.getByRole('button', { name: 'Repetir campaña', exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/ui-completed-campaign-desktop.png', animations: 'disabled' });
});

for (const viewport of [{ width: 1440, height: 960 }, { width: 390, height: 844 }]) test(`construction drawer frees real build space without moving the camera at ${viewport.width}`, async ({ page }) => {
  test.setTimeout(90000); await page.setViewportSize(viewport); await page.goto('/');
  await page.getByRole('button', { name: 'Iniciar campaña', exact: true }).click(); await page.keyboard.press('Space');
  await expect(page.locator('#defenses-toggle')).toHaveAttribute('aria-expanded', 'false');
  const camera = () => page.evaluate(async () => { const { battlefield: view } = await import(document.querySelector<HTMLScriptElement>('script[src*="/src/main.ts"]')!.src); return [...view.camera.matrixWorld.elements, ...view.camera.projectionMatrix.elements]; });
  const before = await camera(); await page.keyboard.press('b');
  await expect(page.locator('#defenses-toggle')).toHaveAttribute('aria-expanded', 'true');
  const drawer = await page.locator('#defenses-menu').boundingBox(); expect(drawer!.height).toBeGreaterThan(130);
  await page.screenshot({ path: `test-results/defenses-open-${viewport.width}.png`, animations: 'disabled' });
  await page.locator('[data-tower="precision"]').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#defenses-menu')).toBeHidden(); await expect(page.locator('#defenses-toggle')).toBeFocused();
  expect(await camera()).toEqual(before); await expect(page.locator('#cancel')).toBeVisible();
  const point = await page.evaluate(async rect => {
    const { simulation: sim, battlefield: view } = await import(document.querySelector<HTMLScriptElement>('script[src*="/src/main.ts"]')!.src);
    const load = (url: string): Promise<any> => import(/* @vite-ignore */ url);
    const { placementError } = await load('/src/game/path.ts');
    let visible: { x: number; y: number } | undefined;
    for (const { x, z } of sim.map.pads) {
      if (placementError({ x, z }, sim.towers, sim.gold, 100, sim.map)) continue;
      const p = view.camera.position.clone().set(x, 1.84, z).project(view.camera);
      const px = (p.x + 1) / 2 * innerWidth, py = (1 - p.y) / 2 * innerHeight;
      if (!visible && document.elementFromPoint(px, py) === view.renderer.domElement) visible = { x: px, y: py };
      if (px > rect.x + 10 && px < rect.x + rect.width - 10 && py > rect.y + 10 && py < rect.y + rect.height - 10 && document.elementFromPoint(px, py) === view.renderer.domElement) return { x: px, y: py };
    }
    // The smaller drawer can sit entirely below the playable area. Still exercise real placement.
    if (visible) return visible;
    throw new Error('There must be a clear buildable position after choosing a defense');
  }, drawer!);
  await page.mouse.move(point.x, point.y); await expect(page.locator('#placement-hint')).toContainText('Ubicación válida');
  await page.mouse.click(point.x, point.y); await expect(page.locator('#gold')).toHaveText('150');
  await page.keyboard.press('Escape'); await expect(page.locator('#cancel')).toBeHidden();
  await page.keyboard.press('b'); await page.locator('[data-tower="precision"]').focus(); await page.keyboard.press('b');
  await expect(page.locator('#defenses-toggle')).toBeFocused(); await expect(page.locator('#defenses-menu')).toBeHidden();
  await page.keyboard.press('1'); await expect(page.locator('#cancel')).toBeVisible(); await expect(page.locator('#defenses-menu')).toBeHidden();
  await page.keyboard.press('Escape'); await page.getByRole('button', { name: 'Iniciar oleada 1', exact: true }).click();
  await expect(page.locator('#wave-status')).toContainText('en el valle');
  await page.screenshot({ path: `test-results/defenses-closed-${viewport.width}.png`, animations: 'disabled' });
});

for (const start of [4, 7]) test(`saved campaign continues through missions ${start + 1}–${start + 3} with correct gate health`, async ({ page }) => {
  test.setTimeout(150000);
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(ids => {
    if (!localStorage.getItem('last-bastion-campaign-v1')) localStorage.setItem('last-bastion-campaign-v1', JSON.stringify(Object.fromEntries(ids.map(id => [id, { stars: 3, score: 1000 }]))));
  }, MISSIONS.slice(0, start).map(m => m.id));
  await page.goto('/'); await expect(page.locator('.campaign-summary')).toContainText(`${start} / 10`);
  await page.getByRole('button', { name: 'Continuar campaña', exact: true }).click();
  for (let i = start; i < start + 3; i++) {
    const mission = MISSIONS[i]; await expect(page.locator('#mission-title')).toHaveText(mission.name.toUpperCase());
    await page.getByRole('button', { name: 'Pausar', exact: true }).click();
    await expect(page.locator('#hp')).toHaveText(String(mission.gateHp)); await expect(page.locator('#hp-max')).toHaveText(String(mission.gateHp));
    await expect(page.locator('.gate-label')).toContainText(`${mission.gateHp} / ${mission.gateHp}`);
    await expect(page.locator('#gold')).toHaveText('300'); await expect(page.locator('#defenses-menu')).toBeHidden();
    await page.evaluate(async () => { const { simulation: sim } = await import(document.querySelector<HTMLScriptElement>('script[src*="/src/main.ts"]')!.src); for (let ticks = 0; ticks < 100000 && !sim.finished; ticks++) { sim.update(.02); for (const enemy of sim.enemies) sim.hit(enemy, 100000, 'physical'); sim.events.length = 0; } });
    await expect(page.locator('.victory-stars')).toHaveAttribute('aria-label', '3 de 3 estrellas');
    await expect(page.locator('.results')).toContainText('100%');
    if (i < start + 2) await page.getByRole('button', { name: 'Siguiente misión', exact: true }).click();
  }
  if (start === 7) await expect(page.locator('.victory-reward')).toContainText('30 estrellas');
  await page.getByRole('button', { name: start === 7 ? 'Volver a la campaña' : 'Ver campaña', exact: true }).click();
  await expect(page.locator('.campaign-summary')).toContainText(`${(start + 3) * 3} / 30`);
  await page.reload(); await expect(page.locator('.campaign-summary')).toContainText(`${(start + 3) * 3} / 30`);
  await expect(page.getByRole('heading', { name: start === 7 ? 'Reino recuperado.' : 'Recupera el reino.' })).toBeVisible();
  expect(errors).toEqual([]); await page.screenshot({ path: `test-results/campaign-continued-${start}.png`, animations: 'disabled' });
});
