import * as THREE from 'three';
import { ENEMIES, TOWERS, WORLD, towerStats, type TowerKind } from '../game/config';
import { PAD_HEIGHT, gatePoint, padAt, placementIssue, roadHeight, type GameMap, type Point } from '../game/path';
import { type Simulation, type Tower } from '../game/simulation';
import { createTerrain } from './terrain';
import { box, circle, cone, enemyModel, orb, projectileModel, towerModel } from './models';
import { DamageLabels } from './damage-labels';
interface EnemyVisual { group: THREE.Group; health: THREE.Mesh; hit: THREE.Mesh; poison: THREE.Group; }
import { Effects } from './effects';
import { battlefieldFraming, CAMERA_OFFSET } from './framing';
import { ConstructionPads, PlacementFootprint } from './construction';
export class GameView {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.OrthographicCamera(-20, 20, 16, -16, .1, 260);
  readonly raycaster = new THREE.Raycaster();
  readonly pointer = new THREE.Vector2();
  private pointerClient: { x: number; y: number } | null = null;
  readonly enemies = new Map<number, EnemyVisual>();
  readonly towers = new Map<number, THREE.Group>();
  readonly projectiles = new Map<number, THREE.Group>();
  private readonly effects: Effects;
  private readonly upgradeEffects: Effects;
  private lastVisualTime = 0;
  private readonly damageLabels: DamageLabels;
  private door: THREE.Group; private gateRecoil = 0;
  private castleFraming: THREE.Vector3[] = [];
  private flames: THREE.Sprite[] = [];
  surfaces: THREE.Object3D[] = [];
  private readonly terrainRoot = new THREE.Group();
  private map: GameMap;
  readonly range: THREE.Mesh;
  readonly constructionPads = new ConstructionPads();
  readonly footprint = new PlacementFootprint();
  ghost: THREE.Group | null = null; ghostKind: TowerKind | null = null; hover: Point | null = null;
  private hoverHeight = WORLD.elevation + .05;
  guidanceEnabled = true;
  selectedId: number | null = null; private ghostValid: boolean | null = null;
  private pan = new THREE.Vector3(); private observer: ResizeObserver; private framing = new THREE.Vector3();
  private readonly healthMaterial = new THREE.MeshBasicMaterial({ color: 0xf17770, toneMapped: false });
  private readonly healthBackground = new THREE.MeshBasicMaterial({ color: 0x142c3b, toneMapped: false });
  private readonly enemyShade = new THREE.MeshBasicMaterial({ color: 0x20352c, transparent: true, opacity: .22, depthWrite: false });
  private readonly hitMaterial = new THREE.MeshBasicMaterial({ color: 0xffefbd, transparent: true, opacity: .36, depthWrite: false, toneMapped: false });
  private readonly poisonMaterial = new THREE.MeshBasicMaterial({ color: 0xb1ee72, toneMapped: false });
  constructor(readonly container: HTMLElement, map: GameMap) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setClearColor(0xb8d0db); this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1;
    this.renderer.domElement.setAttribute('aria-label', 'Campo de batalla 3D: construye defensas en las bases hexagonales junto al camino');
    this.renderer.domElement.tabIndex = 0;
    container.append(this.renderer.domElement);
    this.scene.fog = new THREE.Fog(0xb7cfcc, 40, 92);
    this.scene.add(new THREE.HemisphereLight(0xc4e3ef, 0x779465, 1.45));
    const rim = new THREE.DirectionalLight(0xb5dbe9, .8); rim.position.set(20, 15, -24); this.scene.add(rim);
    const sun = new THREE.DirectionalLight(0xffe8c9, 2.8); sun.position.set(-18, 32, 14); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.left = -25; sun.shadow.camera.right = 25;
    sun.shadow.camera.top = 25; sun.shadow.camera.bottom = -25; sun.shadow.camera.far = 80; sun.shadow.normalBias = .06; sun.shadow.bias = .00025; this.scene.add(sun); this.renderer.shadowMap.autoUpdate = false; this.renderer.shadowMap.needsUpdate = true;
    this.effects = new Effects(this.scene);
    this.upgradeEffects = new Effects(this.scene);
    this.map = map; this.scene.add(this.terrainRoot);
    const terrain = createTerrain(this.terrainRoot, map); this.constructionPads.load(map); this.surfaces = [...terrain.surfaces, this.constructionPads.foundations]; this.door = terrain.door; this.castleFraming = terrain.castleFraming; this.collectFlames();
    this.damageLabels = new DamageLabels(container);
    const rangeMat = new THREE.MeshBasicMaterial({ color: 0x9edcf3, transparent: true, opacity: .045, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
    this.range = new THREE.Mesh(new THREE.CircleGeometry(1, 80), rangeMat); this.range.rotation.x = -Math.PI / 2; this.range.visible = false;
    this.range.name = 'attack-range';
    const ringPoints = Array.from({ length: 97 }, (_, i) => new THREE.Vector3(Math.cos(i / 96 * Math.PI * 2), Math.sin(i / 96 * Math.PI * 2), 0));
    const ring = new THREE.Line(new THREE.BufferGeometry().setFromPoints(ringPoints), new THREE.LineDashedMaterial({ color: 0xc4e6f6, transparent: true, opacity: .55, dashSize: .045, gapSize: .028, depthWrite: false, toneMapped: false }));
    ring.computeLineDistances(); this.range.add(ring); this.scene.add(this.range, this.constructionPads.group, this.footprint.group);
    this.observer = new ResizeObserver(() => this.resize()); this.observer.observe(container);
    for (const selector of ['.topbar', '.command-strip']) { const element = container.parentElement?.querySelector(selector); if (element) this.observer.observe(element); }
    this.resize();
  }
  resize(): void {
    const w = this.container.clientWidth, h = this.container.clientHeight; if (!w || !h) return;
    this.renderer.setSize(w, h); const aspect = w / h;
    const board = this.container.getBoundingClientRect();
    const shell = this.container.parentElement;
    const hud = shell?.querySelector('.topbar')?.getBoundingClientRect();
    const dock = shell?.querySelector('.command-strip')?.getBoundingClientRect();
    const hudBottom = (hud?.bottom ?? board.top + 80) - board.top;
    shell?.style.setProperty('--hud-bottom', `${hudBottom}px`);
    const fit = battlefieldFraming(this.map, { width: w, height: h, top: hudBottom + 12, bottom: (dock?.top ?? board.bottom - 75) - board.top - 14, left: 24, right: w - 24 }, this.castleFraming);
    this.camera.left = -fit.height * aspect / 2; this.camera.right = fit.height * aspect / 2;
    this.camera.top = fit.height / 2; this.camera.bottom = -fit.height / 2;
    this.framing.copy(fit.focus); this.updateCamera();
  }

  private updateCamera(): void {
    this.camera.position.set(...CAMERA_OFFSET).add(this.pan).add(this.framing); this.camera.lookAt(this.pan.clone().add(this.framing)); this.camera.updateProjectionMatrix(); this.camera.updateMatrixWorld();
    if (this.hover) this.refreshPointer();
  }
  zoom(delta: number): void { this.camera.zoom = THREE.MathUtils.clamp(this.camera.zoom * Math.exp(-delta * .001), .8, 1.8); this.camera.updateProjectionMatrix(); if (this.hover) this.refreshPointer(); }
  panBy(dx: number, dy: number): void {
    const worldPerPixel = (this.camera.top - this.camera.bottom) / (this.container.clientHeight * this.camera.zoom);
    const right = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 0), up = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 1);
    this.pan.addScaledVector(right, -dx * worldPerPixel).addScaledVector(up, dy * worldPerPixel / (up.x * up.x + up.z * up.z));
    this.pan.x = THREE.MathUtils.clamp(this.pan.x, -6, 6); this.pan.z = THREE.MathUtils.clamp(this.pan.z, -6, 6); this.pan.y = 0; this.updateCamera();
  }
  resetCamera(): void { this.pan.set(0, 0, 0); this.camera.zoom = 1; this.resize(); }
  setPointer(event: PointerEvent): void {
    this.pointerClient = { x: event.clientX, y: event.clientY }; this.refreshPointer();
  }
  private refreshPointer(): void {
    if (!this.pointerClient) return;
    const rect = this.renderer.domElement.getBoundingClientRect(), { x, y } = this.pointerClient;
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) { this.hover = null; return; }
    this.pointer.set((x - rect.left) / rect.width * 2 - 1, -(y - rect.top) / rect.height * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const intersection = this.raycaster.intersectObjects(this.surfaces, false)[0];
    this.hover = intersection ? { x: intersection.point.x, z: intersection.point.z } : null;
    if (intersection) this.hoverHeight = intersection.point.y;
  }
  pickTower(event: PointerEvent): number | null {
    this.setPointer(event); const hit = this.raycaster.intersectObjects([...this.towers.values()], true)[0];
    if (!hit) return null; let object: THREE.Object3D | null = hit.object;
    while (object) { if (typeof object.userData.towerId === 'number') return object.userData.towerId as number; object = object.parent; } return null;
  }
  setGhost(kind: TowerKind | null): void {
    if (this.ghost) { this.scene.remove(this.ghost); this.ghost.traverse(o => { if (o instanceof THREE.Mesh || o instanceof THREE.Sprite) (o.material as THREE.Material).dispose(); }); }
    this.ghost = null; this.ghostKind = kind; this.ghostValid = null;
    this.footprint.group.visible = false; this.range.visible = false;
    if (kind) {
      this.ghost = towerModel(kind); this.ghost.traverse(o => { if (o.name === 'tower-level-shield') o.visible = false; if (o instanceof THREE.Mesh || o instanceof THREE.Sprite) { o.material = (o.material as THREE.Material).clone(); const m = o.material; m.transparent = true; m.opacity = .60; m.depthWrite = false; o.castShadow = false; } });
      this.scene.add(this.ghost); this.ghost.visible = false;
    }
  }
  placementMessage(sim: Simulation): string | null {
    if (!this.ghostKind) return null;
    if (sim.finished) return 'La partida ha terminado';
    if (!sim.mission.towers.includes(this.ghostKind)) return 'Defensa bloqueada en esta misión';
    if (!this.hover) return sim.gold < TOWERS[this.ghostKind].cost ? 'No tienes suficiente oro' : 'Elige una base hexagonal junto al camino';
    return placementIssue(this.hover, sim.towers, sim.gold, TOWERS[this.ghostKind].cost, sim.map)?.brief ?? null;
  }
  private createEnemy(id: number, kind: Parameters<typeof enemyModel>[0]): EnemyVisual {
    const group = enemyModel(kind);
    group.traverse(o => { if (o instanceof THREE.Mesh) o.castShadow = false; });
    const shadow = new THREE.Mesh(circle(.42, 12), this.enemyShade);
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = .012; group.add(shadow);
    const bg = new THREE.Mesh(box(.84, .075, .035), this.healthBackground); bg.position.set(0, Number(group.userData.healthHeight ?? 1.35), 0); bg.quaternion.copy(this.camera.quaternion);
    const health = new THREE.Mesh(box(.76, .045, .04), this.healthMaterial); health.position.z = .015; bg.add(health); group.add(bg);
    const hit = new THREE.Mesh(orb(.38), this.hitMaterial); hit.position.y = .56; hit.scale.set(1, 1.08, .86); hit.visible = false; group.add(hit);
    const poison = new THREE.Group(); poison.name = 'poison-status'; poison.position.set(.53, Number(group.userData.healthHeight ?? 1.35), 0); poison.add(new THREE.Mesh(orb(.085), this.poisonMaterial)); poison.add(new THREE.Mesh(cone(.07, .13, 4), this.poisonMaterial)); poison.children[1].position.y = .10; poison.visible = false; group.add(poison);
    this.scene.add(group); const visual = { group, health, hit, poison }; this.enemies.set(id, visual); return visual;
  }
  private syncTower(t: Tower, time: number): THREE.Group {
    let group = this.towers.get(t.id);
    if (!group || group.userData.level !== t.level) {
      const upgrading = !!group; if (group) this.scene.remove(group); group = towerModel(t.kind, t.level); group.position.set(t.x, WORLD.elevation + .07 + PAD_HEIGHT, t.z);
      group.userData = { ...group.userData, towerId: t.id, level: t.level, upgradePulse: upgrading ? .8 : 0, upgradeEndsAt: upgrading ? time + .8 : time }; this.towers.set(t.id, group); this.scene.add(group); this.renderer.shadowMap.needsUpdate = true; this.collectFlames();
    }
    const turret = group.getObjectByName('turret'); if (turret) { turret.rotation.y = t.targetAngle; turret.position.y = Number(turret.userData.restY) + Math.sin(Number(group.userData.recoil ?? 0) * 16) * .045; const string = turret.getObjectByName('bow-string'); if (string) string.position.z = .34 - Number(group.userData.recoil ?? 0) * .35; const bolts = turret.getObjectByName('loaded-bolts'); if (bolts) bolts.visible = t.cooldown <= towerStats(t.kind, t.level).interval * .35; } return group;
  }
  private collectFlames(): void {
    this.flames = []; for (const root of [this.terrainRoot, ...this.towers.values()]) root.traverse(o => { if (o instanceof THREE.Sprite && o.userData.flame) this.flames.push(o); });
  }
  private muzzle(x: number, z: number): THREE.Vector3 {
    for (const group of this.towers.values()) if (Math.abs(group.position.x - x) < .001 && Math.abs(group.position.z - z) < .001) {
      group.updateMatrixWorld(true); const muzzle = group.getObjectByName('muzzle'); if (muzzle) return muzzle.getWorldPosition(new THREE.Vector3());
    }
    return new THREE.Vector3(x, WORLD.elevation + 2.5, z);
  }
  update(sim: Simulation, visualDt: number, time: number): void {
    if (sim.map !== this.map) this.loadMap(sim.map);
    const enemyIds = new Set(sim.enemies.filter(e => e.hp > 0).map(e => e.id));
    for (const [id, v] of this.enemies) if (!enemyIds.has(id)) { this.scene.remove(v.group); this.enemies.delete(id); }
    for (const e of sim.enemies) {
      if (e.hp <= 0) continue; const v = this.enemies.get(e.id) ?? this.createEnemy(e.id, e.kind);
      const attacking = e.state === 'attacking', walking = e.state === 'marching';
      const recoil = e.hitFlash / .24, windup = attacking ? Math.max(0, 1 - e.attackCooldown / .36) : 0;
      v.group.position.set(e.x - Math.sin(e.angle) * recoil * .035, roadHeight(e, this.map) + .02 + (walking ? Math.abs(Math.sin(e.progress * 7)) * .035 : 0), e.z - Math.cos(e.angle) * recoil * .035);
      v.group.rotation.set(-recoil * .12 + e.attackPulse * .24, e.angle, 0); v.hit.visible = e.hitFlash > .13; v.poison.visible = e.poisonRemaining > 0; v.poison.scale.setScalar(.90 + Math.sin(time * 6) * .10);
      v.health.scale.x = Math.max(.001, e.hp / e.maxHp); v.health.position.x = -.38 * (1 - e.hp / e.maxHp);
      const bg = v.health.parent!; bg.quaternion.copy(v.group.quaternion).invert().multiply(this.camera.quaternion);
      const legL = v.group.getObjectByName('legL'), legR = v.group.getObjectByName('legR');
      if (legL && legR) { legL.rotation.x = walking ? Math.sin(e.progress * 6) * .5 : 0; legR.rotation.x = -legL.rotation.x; }
      const armL = v.group.getObjectByName('armL'), armR = v.group.getObjectByName('armR');
      if (armL && armR) { armL.rotation.x = walking ? -Math.sin(e.progress * 6) * .35 : -.24; armR.rotation.x = attacking ? -windup * 2.25 - e.attackPulse * 2.2 : walking ? Math.sin(e.progress * 6) * .35 : -.1; }
    }
    const towerIds = new Set(sim.towers.map(t => t.id));
    for (const [id, g] of this.towers) if (!towerIds.has(id)) { this.scene.remove(g); this.towers.delete(id); this.renderer.shadowMap.needsUpdate = true; this.collectFlames(); }
    sim.towers.forEach(t => { const g = this.syncTower(t, time); g.userData.recoil = Math.max(0, Number(g.userData.recoil ?? 0) - visualDt); g.userData.upgradePulse = Math.max(0, Number(g.userData.upgradeEndsAt) - time); const pulse = Math.sin((1 - Number(g.userData.upgradePulse) / .8) * Math.PI) * .08; g.scale.set(1 + pulse * .3, 1 + pulse, 1 + pulse * .3); });
    const projectileIds = new Set(sim.projectiles.map(p => p.id));
    for (const [id, m] of this.projectiles) if (!projectileIds.has(id)) { this.scene.remove(m); this.projectiles.delete(id); }
    for (const p of sim.projectiles) {
      let m = this.projectiles.get(p.id);
      if (!m) {
        m = projectileModel(p.kind); m.userData.source = this.muzzle(p.origin.x, p.origin.z); const angle = Math.atan2(p.target.x - p.origin.x, p.target.z - p.origin.z); m.userData.source.x += Math.cos(angle) * p.lane; m.userData.source.z -= Math.sin(angle) * p.lane;
        this.scene.add(m); this.projectiles.set(p.id, m);
      }
      const fraction = Math.min(1, p.travelled / Math.max(.01, p.travelled + Math.hypot(p.x - p.target.x, p.z - p.target.z)));
      const source = m.userData.source as THREE.Vector3;
      const targetEnemy = sim.enemies.find(e => e.id === p.targetId), targetY = roadHeight(p.target, this.map) + .7 * (targetEnemy ? ENEMIES[targetEnemy.kind].scale * 1.35 : 1);
      m.position.set(p.x + (source.x - p.origin.x) * (1 - fraction), THREE.MathUtils.lerp(source.y, targetY, fraction), p.z + (source.z - p.origin.z) * (1 - fraction));
      m.lookAt(p.target.x, targetY, p.target.z);
    }
    for (const event of sim.events) {
      const position = new THREE.Vector3(event.x, roadHeight(event, this.map) + .6, event.z);
      if (event.type === 'shot') {
        const muzzle = this.muzzle(event.x, event.z);
        for (const g of this.towers.values()) if (Math.abs(g.position.x - event.x) < .001 && Math.abs(g.position.z - event.z) < .001) g.userData.recoil = .20;
        if (event.kind === 'poison') this.effects.burst(muzzle, 0x99d76b, 2, .025);
      }
      if (event.type === 'impact') this.effects.impact(event.kind, event.x, event.z, event.radius, roadHeight(event, this.map));
      if (event.type === 'damage' && event.damage) {
        const enemy = sim.enemies.find(e => e.id === event.enemyId);
        position.y = roadHeight(event, this.map) + (enemy ? ENEMIES[enemy.kind].scale * 1.35 * 1.35 : 1.3);
        this.damageLabels.add(position, event.damage, event.damageKind ?? 'physical');
      }
      if (event.type === 'kill') { this.effects.burst(position, 0x94618f, 6); this.effects.burst(position, 0xe7b64e, 3, .05); }
      if (event.type === 'build' || event.type === 'upgrade') {
        const effects = event.type === 'upgrade' ? this.upgradeEffects : this.effects;
        position.y = WORLD.elevation + 1 + PAD_HEIGHT; effects.burst(position, 0xfbd584, event.type === 'upgrade' ? 24 : 12);
        effects.pulse(new THREE.Vector3(event.x, WORLD.elevation + .10 + PAD_HEIGHT, event.z), event.type === 'upgrade' ? 0xffd16f : 0xb6d79f, event.type === 'upgrade' ? 1.4 : .9, event.type === 'upgrade' ? .8 : .42);
        if (event.type === 'upgrade') effects.flash(position, 0xffe0a0, 1.3, .6);
      }
      if (event.type === 'gateHit') {
        const attacker = sim.enemies.find(e => e.id === event.enemyId);
        this.gateRecoil = .24; position.y = WORLD.elevation + (attacker ? ENEMIES[attacker.kind].scale * 1.35 * .7 : 1.2);
        this.effects.burst(position, 0xc89d64, 12, .045); this.effects.flash(position, 0xffdfb2, .65, .12);
        this.damageLabels.add(position.clone().add(new THREE.Vector3(0, 1.4, 0)), event.damage!, 'gate');
      }
    }
    this.gateRecoil = Math.max(0, this.gateRecoil - visualDt);
    this.door.position.z = Math.sin(this.gateRecoil * 65) * this.gateRecoil * .16;
    this.door.rotation.z = Math.sin(this.gateRecoil * 50) * this.gateRecoil * .014;
    this.door.rotation.x = sim.castleHp ? 0 : -1.4;
    this.door.getObjectByName('gate-damage-1')!.visible = sim.castleHp < sim.maxGateHp * .65;
    this.door.getObjectByName('gate-damage-2')!.visible = sim.castleHp < sim.maxGateHp * .3;
    const gateLabel = gatePoint(0, .6, this.map);
    this.damageLabels.update(visualDt, this.camera, this.container.clientWidth, this.container.clientHeight, new THREE.Vector3(gateLabel.x, WORLD.elevation + 4.8, gateLabel.z), sim.castleHp, sim.maxGateHp);
    this.effects.update(visualDt);
    this.upgradeEffects.update(Math.max(0, Math.min(.1, time - this.lastVisualTime))); this.lastVisualTime = time;
    this.flames.forEach((flame, i) => flame.scale.setScalar(Number(flame.userData.baseSize) * (1 + .09 * Math.sin(time * 5 + i * 2.3))));
    let rangeCenter: Point | null = null, radius = 0;
    const hoveredPad = this.hover ? padAt(this.hover, this.map) : null;
    const previewPoint = hoveredPad ?? this.hover, previewHeight = hoveredPad ? WORLD.elevation + .05 + PAD_HEIGHT : this.hoverHeight;
    this.constructionPads.update(sim, this.ghostKind, hoveredPad, this.guidanceEnabled, time);
    if (this.ghost && this.ghostKind) {
      this.ghost.visible = !!this.hover;
      this.footprint.update(previewPoint, previewHeight, !this.placementMessage(sim));
      if (this.hover) {
        const valid = !this.placementMessage(sim);
        if (valid !== this.ghostValid) { this.ghost.traverse(o => { if (o instanceof THREE.Mesh) { const m = o.material as THREE.MeshStandardMaterial; m.opacity = valid ? .60 : .40; m.emissive.setHex(valid ? 0x141e28 : 0x572525); } }); this.ghostValid = valid; }
        this.ghost.position.set(previewPoint!.x, previewHeight + .02, previewPoint!.z); rangeCenter = previewPoint; radius = TOWERS[this.ghostKind].range;
        (this.range.material as THREE.MeshBasicMaterial).color.setHex(0x9edcf3);
      }
    } else if (this.selectedId !== null) {
      const t = sim.towers.find(t => t.id === this.selectedId); if (t) { rangeCenter = t; radius = towerStats(t.kind, t.level).range; (this.range.material as THREE.MeshBasicMaterial).color.setHex(0xa6d9f0); }
    }
    this.range.visible = !!rangeCenter;
    if (rangeCenter) { this.range.position.set(rangeCenter.x, WORLD.elevation + .13 + PAD_HEIGHT, rangeCenter.z); this.range.scale.set(radius, radius, 1); }
    this.renderer.render(this.scene, this.camera);
  }
  towerIcons(): Record<string, string> {
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); renderer.setSize(320, 288); renderer.setPixelRatio(1);
    renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping;
    const scene = new THREE.Scene(); scene.add(new THREE.HemisphereLight(0xffffff, 0x657b88, 3)); const light = new THREE.DirectionalLight(0xffeac5, 4); light.position.set(-3, 5, 4); scene.add(light);
    const camera = new THREE.OrthographicCamera(-1.05, 1.05, .945, -.945, .1, 30);
    const icons: Record<string, string> = {};
    // Frame the weapon and its parapet, rather than shrinking an entire tower into a card.
    const centers: Record<TowerKind, number> = { precision: 2.25, triple: 2.25, poison: 2.25 };
    for (const kind of Object.keys(TOWERS) as TowerKind[]) for (const level of [1, 2, 3]) {
      camera.position.set(3, centers[kind] + 2.1, 5); camera.lookAt(0, centers[kind], 0);
      const g = towerModel(kind, level); g.getObjectByName('tower-level-shield')!.visible = false; scene.add(g); renderer.render(scene, camera); icons[`${kind}-${level}`] = renderer.domElement.toDataURL(); if (level === 1) icons[kind] = icons[`${kind}-${level}`]; scene.remove(g);
    }
    renderer.dispose(); return icons;
  }
  loadMap(map: GameMap): void {
    this.setGhost(null); this.hover = null; this.selectedId = null;
    for (const v of this.enemies.values()) { v.health.parent?.removeFromParent(); this.scene.remove(v.group); }
    for (const group of this.towers.values()) this.scene.remove(group);
    for (const projectile of this.projectiles.values()) this.scene.remove(projectile);
    this.enemies.clear(); this.towers.clear(); this.projectiles.clear();
    this.effects.clear(); this.upgradeEffects.clear(); this.damageLabels.clear(); this.gateRecoil = 0;
    // Terrain geometry and cloned materials belong to this map and can be released safely.
    const geometries = new Set<THREE.BufferGeometry>();
    this.terrainRoot.traverse(o => { if (o instanceof THREE.Mesh) { if (!o.geometry.userData.shared) geometries.add(o.geometry); const materials = Array.isArray(o.material) ? o.material : [o.material]; materials.filter(m => m.userData.owned).forEach(m => m.dispose()); if (o instanceof THREE.InstancedMesh) o.dispose(); } });
    geometries.forEach(g => g.dispose()); this.terrainRoot.clear();
    this.map = map; const terrain = createTerrain(this.terrainRoot, map); this.constructionPads.load(map); this.surfaces = [...terrain.surfaces, this.constructionPads.foundations]; this.door = terrain.door; this.castleFraming = terrain.castleFraming; this.collectFlames();
    this.range.visible = false; this.renderer.shadowMap.needsUpdate = true; this.resetCamera();
  }
  dispose(): void { this.observer.disconnect(); this.setGhost(null); this.constructionPads.dispose(); this.footprint.dispose(); this.range.geometry.dispose(); (this.range.material as THREE.Material).dispose(); this.range.children.forEach(o => { if (o instanceof THREE.Line) { o.geometry.dispose(); (o.material as THREE.Material).dispose(); } }); this.effects.dispose(); this.upgradeEffects.dispose(); this.damageLabels.dispose(); this.hitMaterial.dispose(); this.poisonMaterial.dispose(); this.healthMaterial.dispose(); this.healthBackground.dispose(); this.enemyShade.dispose(); this.renderer.dispose(); }
}
