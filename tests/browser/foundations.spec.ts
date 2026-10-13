import { test, expect, type Page } from '@playwright/test';

async function padPoint(page: Page, pick = false): Promise<{ id: string; x: number; z: number; px: number; py: number }> {
  return page.evaluate(async pick => {
    const { simulation: sim, battlefield: view } = await import(document.querySelector<HTMLScriptElement>('script[src*="/src/main.ts"]')!.src);
    const pad = pick ? sim.map.pads.find((p: any) => p.id === sim.towers[0].padId) : sim.map.pads.find((p: any) => !sim.towers.some((t: any) => t.padId === p.id));
    const v = view.camera.position.clone().set(pad.x, pick ? 2.7 : 1.84, pad.z).project(view.camera);
    return { ...pad, px: (v.x + 1) / 2 * innerWidth, py: (1 - v.y) / 2 * innerHeight };
  }, pick);
}
async function model(page: Page): Promise<{ level: number; shield: number; pulse: number; footprint: number }> {
  return page.evaluate(async () => {
    const { simulation: sim, battlefield: view } = await import(document.querySelector<HTMLScriptElement>('script[src*="/src/main.ts"]')!.src);
    const g = view.towers.get(sim.towers[0].id); let footprint = 0;
    g.traverse((o: any) => { if (o.isMesh) { const p = o.geometry.getAttribute('position'); for (let i = 0; i < p.count; i++) if (p.getY(i) < .26) footprint = Math.max(footprint, Math.hypot(p.getX(i), p.getZ(i))); } });
    return { level: g.userData.level, shield: g.getObjectByName('tower-level-shield').userData.level, pulse: g.userData.upgradePulse, footprint };
  });
}
for (const viewport of [{ width: 1536, height: 844 }, { width: 1920, height: 1080 }]) test(`visible hexagonal bases, precise purchases, evolving levels and reuse at ${viewport.width}×${viewport.height}`, async ({ page }) => {
  test.setTimeout(210000); await page.setViewportSize(viewport);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/'); await page.getByRole('button', { name: 'Iniciar campaña', exact: true }).click(); await page.getByRole('button', { name: 'Pausar', exact: true }).click();
  const count = await page.evaluate(async () => { const { simulation: sim, battlefield: view } = await import(document.querySelector<HTMLScriptElement>('script[src*="/src/main.ts"]')!.src); return { pads: sim.map.pads.length, stones: view.constructionPads.foundations.count, overlay: !!view.scene.getObjectByName('buildable-terrain') }; });
  expect(count.pads).toBe(14); expect(count.stones).toBe(14); expect(count.overlay).toBe(false);
  await page.screenshot({ path: `test-results/hexagonal-bases-${viewport.width}.png`, animations: 'disabled' });
  const pad = await padPoint(page); await page.mouse.click(pad.px, pad.py); await expect(page.locator('#defenses-menu')).toBeVisible();
  await page.locator('[data-tower="archer"]').click(); await expect(page.locator('#defenses-menu')).toBeHidden();
  await page.mouse.move(pad.px, pad.py); await expect(page.locator('#placement-hint')).toContainText('✓ Ubicación válida');
  await page.screenshot({ path: `test-results/hexagonal-preview-${viewport.width}.png`, animations: 'disabled' });
  // Clicking inside the stone, away from its center, still selects the same foundation.
  const offset = await page.evaluate(async pad => { const { battlefield: view } = await import(document.querySelector<HTMLScriptElement>('script[src*="/src/main.ts"]')!.src); const v = view.camera.position.clone().set(pad.x + .3, 1.84, pad.z + .15).project(view.camera); return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight }; }, pad);
  await page.mouse.click(offset.x, offset.y); await expect(page.locator('#gold')).toHaveText('200');
  await expect(page.locator('#placement-hint')).toContainText('Base ocupada');
  await page.mouse.click(pad.px, pad.py); await expect(page.locator('#gold')).toHaveText('200');
  const actual = await page.evaluate(async () => { const { simulation: sim } = await import(document.querySelector<HTMLScriptElement>('script[src*="/src/main.ts"]')!.src); return { x: sim.towers[0].x, z: sim.towers[0].z, pad: sim.towers[0].padId }; });
  expect(actual).toEqual({ x: pad.x, z: pad.z, pad: pad.id });
  await page.keyboard.press('Escape'); const pick = await padPoint(page, true); await page.mouse.click(pick.px, pick.py);
  await expect(page.locator('#tower-panel')).toBeVisible(); const first = await model(page); expect(first.shield).toBe(1);
  const initialIcon = await page.locator('#tower-panel img').getAttribute('src');
  await page.locator('#upgrade').click(); await expect(page.locator('#gold')).toHaveText('120');
  await expect.poll(async () => (await model(page)).level).toBe(2);
  const second = await model(page); expect(second.pulse).toBeGreaterThan(0); expect(second.shield).toBe(2); expect(second.footprint).toBeGreaterThan(first.footprint);
  expect(await page.locator('#tower-panel img').getAttribute('src')).not.toBe(initialIcon);
  // Graphics fixture: fund the last upgrade while leaving its real price and UI purchase intact.
  await page.evaluate(async () => { const { simulation: sim } = await import(document.querySelector<HTMLScriptElement>('script[src*="/src/main.ts"]')!.src); sim.gold += 100; });
  await expect(page.locator('#upgrade')).toBeEnabled(); await page.locator('#upgrade').click(); await expect(page.locator('#gold')).toHaveText('80');
  await expect.poll(async () => (await model(page)).shield).toBe(3);
  await expect.poll(async () => (await model(page)).pulse).toBe(0);
  expect((await model(page)).footprint).toBeGreaterThan(second.footprint);
  await page.screenshot({ path: `test-results/tower-level-three-${viewport.width}.png`, animations: 'disabled' });
  await page.locator('#sell').click(); await expect(page.locator('#gold')).toHaveText('304');
  await page.keyboard.press('1'); await page.mouse.move(pad.px, pad.py); await expect(page.locator('#placement-hint')).toContainText('✓ Ubicación válida');
  await page.mouse.click(pad.px, pad.py); await expect(page.locator('#gold')).toHaveText('204');
  expect((await model(page)).shield).toBe(1);
  await page.keyboard.press('Escape'); await page.getByRole('button', { name: 'Acercar vista', exact: true }).click(); await page.getByRole('button', { name: 'Restablecer vista', exact: true }).click();
  expect(errors).toEqual([]);
});

test('original audio unlocks on a gesture, has distinct weapon buffers, and exposes persistent music and volume controls', async ({ page }) => {
  test.setTimeout(150000); const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/'); await page.getByRole('button', { name: 'Cómo jugar', exact: true }).click();
  await page.locator('#audio-toggle').click();
  await expect.poll(async () => page.evaluate(async () => { const { gameAudio: audio } = await import(document.querySelector<HTMLScriptElement>('script[src*="/src/main.ts"]')!.src); return audio.state; })).toBe('running');
  const get = () => page.evaluate(async () => { const { gameAudio: audio } = await import(document.querySelector<HTMLScriptElement>('script[src*="/src/main.ts"]')!.src); return { music: audio.playingMusic, muted: audio.muted, volume: audio.volume, enabled: audio.musicEnabled }; });
  expect((await get()).music).toBe(true); await page.locator('#music-enabled').uncheck(); expect((await get()).music).toBe(false);
  const waveforms = await page.evaluate(async () => {
    const { gameAudio: audio } = await import(document.querySelector<HTMLScriptElement>('script[src*="/src/main.ts"]')!.src);
    for (const kind of ['archer', 'crossbow', 'mage', 'cannon']) audio.play({ type: 'shot', kind, x: 0, z: 0 });
    audio.play({ type: 'gateHit', enemyKind: 'beast', x: -10, z: -10 });
    return [...audio.buffers.entries()].map(([name, buffer]: any) => { const pcm = buffer.getChannelData(0); return { name, seconds: buffer.duration, energy: pcm.reduce((a: number, b: number) => a + b * b, 0) }; });
  });
  for (const name of ['arrow', 'crossbow', 'magic', 'cannon', 'gate', 'voice-beast']) expect(waveforms.find(p => p.name === name)?.energy).toBeGreaterThan(.1);
  await page.locator('#audio-volume').focus(); await page.keyboard.press('Home'); for (let i = 0; i < 7; i++) await page.keyboard.press('ArrowRight');
  await expect(page.locator('#volume-value')).toHaveText('35%'); expect((await get()).volume).toBe(.35);
  await page.locator('#music-enabled').check(); expect((await get()).music).toBe(true);
  await page.screenshot({ path: 'test-results/audio-settings.png', animations: 'disabled' });
  await page.locator('#audio-toggle').click(); expect((await get()).muted).toBe(true); expect((await get()).music).toBe(false);
  const noSound = await page.evaluate(async () => { const { gameAudio: audio } = await import(document.querySelector<HTMLScriptElement>('script[src*="/src/main.ts"]')!.src); audio.play({ type: 'victory', x: 0, z: 0 }); return audio.buffers.has('victory'); }); expect(noSound).toBe(false);
  await page.reload(); await page.getByRole('button', { name: 'Cómo jugar', exact: true }).click();
  await expect(page.locator('#music-enabled')).toBeChecked(); await expect(page.locator('#audio-volume')).toHaveValue('35'); expect((await get()).muted).toBe(true);
  expect(errors).toEqual([]);
});
