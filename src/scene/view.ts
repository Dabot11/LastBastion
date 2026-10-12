import * as THREE from 'three';
import { TOWERS, WORLD, towerStats, type TowerKind } from '../game/config';
import { placementError, type GameMap, type Point } from '../game/path';
import { type Simulation, type Tower } from '../game/simulation';
import { createTerrain } from './terrain';
import { box, circle, enemyModel, projectileModel, towerModel } from './models';
interface EnemyVisual { group: THREE.Group; health: THREE.Mesh; }
import { Effects } from './effects';
export class GameView {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.OrthographicCamera(-20, 20, 16, -16, .1, 260);
  readonly raycaster = new THREE.Raycaster();
  readonly pointer = new THREE.Vector2();
  readonly enemies = new Map<number, EnemyVisual>();
  readonly towers = new Map<number, THREE.Group>();
  readonly projectiles = new Map<number, THREE.Group>();
  private readonly effects: Effects;
  private flames: THREE.Sprite[] = [];
  surfaces: THREE.Object3D[] = [];
  private readonly terrainRoot = new THREE.Group();
  private map: GameMap;
  readonly range: THREE.Mesh;
  ghost: THREE.Group | null = null; ghostKind: TowerKind | null = null; hover: Point | null = null;
  selectedId: number | null = null; private ghostValid: boolean | null = null;
  private pan = new THREE.Vector3(); private observer: ResizeObserver; private framingY = 0;
  private readonly healthMaterial = new THREE.MeshBasicMaterial({ color: 0xf17770, toneMapped: false });
  private readonly healthBackground = new THREE.MeshBasicMaterial({ color: 0x142c3b, toneMapped: false });
  private readonly enemyShade = new THREE.MeshBasicMaterial({ color: 0x20352c, transparent: true, opacity: .22, depthWrite: false });
  constructor(readonly container: HTMLElement, map: GameMap) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setClearColor(0xb8d0db); this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1;
    this.renderer.domElement.setAttribute('aria-label', 'Campo de batalla 3D: construye defensas en las plataformas verdes');
    this.renderer.domElement.tabIndex = 0;
    container.append(this.renderer.domElement);
    this.scene.fog = new THREE.Fog(0xb7cfcc, 40, 92);
    this.scene.add(new THREE.HemisphereLight(0xc4e3ef, 0x385e39, 1.25));
    const rim = new THREE.DirectionalLight(0xb5dbe9, .8); rim.position.set(20, 15, -24); this.scene.add(rim);
    const sun = new THREE.DirectionalLight(0xffe8c0, 3.3); sun.position.set(-18, 32, 14); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.left = -25; sun.shadow.camera.right = 25;
    sun.shadow.camera.top = 25; sun.shadow.camera.bottom = -25; sun.shadow.camera.far = 80; sun.shadow.normalBias = .06; sun.shadow.bias = .00025; this.scene.add(sun); this.renderer.shadowMap.autoUpdate = false; this.renderer.shadowMap.needsUpdate = true;
    this.effects = new Effects(this.scene);
    this.map = map; this.scene.add(this.terrainRoot);
    this.surfaces = createTerrain(this.terrainRoot, map).surfaces; this.collectFlames();
    const rangeMat = new THREE.MeshBasicMaterial({ color: 0xbdeaaa, transparent: true, opacity: .13, depthWrite: false, side: THREE.DoubleSide });
    this.range = new THREE.Mesh(new THREE.CircleGeometry(1, 80), rangeMat); this.range.rotation.x = -Math.PI / 2; this.range.visible = false;
    const ring = new THREE.Mesh(new THREE.RingGeometry(.982, 1, 80), new THREE.MeshBasicMaterial({ color: 0xe1fbd3, transparent: true, opacity: .85, side: THREE.DoubleSide, depthWrite: false }));
    this.range.add(ring); this.scene.add(this.range);
    this.observer = new ResizeObserver(() => this.resize()); this.observer.observe(container); this.resize();
  }
  resize(): void {
    const w = this.container.clientWidth, h = this.container.clientHeight; if (!w || !h) return;
    this.renderer.setSize(w, h); const aspect = w / h;
    let height = Math.max(w < 700 ? 32 : 28, 40 / aspect);
    const board = this.container.getBoundingClientRect();
    const hud = this.container.parentElement?.querySelector('.topbar')?.getBoundingClientRect();
    const dock = this.container.parentElement?.querySelector('.tower-cards')?.getBoundingClientRect();
    const safeTop = (hud?.bottom ?? board.top + 110) - board.top + 16;
    const safeBottom = (dock?.top ?? board.bottom - 140) - board.top - 24;
    const safeHeight = Math.max(100, safeBottom - safeTop);
    const base = this.camera.clone(); base.zoom = 1; base.position.set(-9, 29.7, 24); base.lookAt(0, 0, 0); base.updateMatrixWorld();
    const frame = () => {
      base.left = -height * aspect / 2; base.right = height * aspect / 2; base.top = height / 2; base.bottom = -height / 2; base.updateProjectionMatrix();
      const castle = this.map.path.at(-1)!;
      const points = [...this.map.path.map(p => new THREE.Vector3(p.x, .13, p.z)), new THREE.Vector3(castle.x, 4.9, castle.z - 1), new THREE.Vector3(this.map.path[0].x, 2.5, this.map.path[0].z)];
      const ys = points.map(p => (1 - p.project(base).y) / 2 * h);
      return { min: Math.min(...ys), max: Math.max(...ys) };
    };
    let bounds = frame();
    if (bounds.max - bounds.min > safeHeight) { height *= (bounds.max - bounds.min) / safeHeight; bounds = frame(); }
    this.camera.left = base.left; this.camera.right = base.right; this.camera.top = base.top; this.camera.bottom = base.bottom;
    const shift = (bounds.min + bounds.max - safeTop - safeBottom) / 2;
    const up = new THREE.Vector3().setFromMatrixColumn(base.matrixWorld, 1);
    this.framingY = -shift * height / (h * up.y); this.updateCamera();
  }
  private updateCamera(): void {
    this.camera.position.set(-9 + this.pan.x, 29.7 + this.framingY, 24 + this.pan.z); this.camera.lookAt(this.pan.x, this.framingY, this.pan.z); this.camera.updateProjectionMatrix(); this.camera.updateMatrixWorld();
  }
  zoom(delta: number): void { this.camera.zoom = THREE.MathUtils.clamp(this.camera.zoom * Math.exp(-delta * .001), .8, 1.8); this.camera.updateProjectionMatrix(); }
  panBy(dx: number, dy: number): void {
    const worldPerPixel = (this.camera.top - this.camera.bottom) / (this.container.clientHeight * this.camera.zoom);
    const right = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 0), up = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 1);
    this.pan.addScaledVector(right, -dx * worldPerPixel).addScaledVector(up, dy * worldPerPixel / (up.x * up.x + up.z * up.z));
    this.pan.x = THREE.MathUtils.clamp(this.pan.x, -6, 6); this.pan.z = THREE.MathUtils.clamp(this.pan.z, -6, 6); this.pan.y = 0; this.updateCamera();
  }
  resetCamera(): void { this.pan.set(0, 0, 0); this.camera.zoom = 1; this.resize(); }
  setPointer(event: PointerEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect(); this.pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const intersection = this.raycaster.intersectObjects(this.surfaces, false)[0];
    this.hover = intersection ? { x: intersection.point.x, z: intersection.point.z } : null;
  }
  pickTower(event: PointerEvent): number | null {
    this.setPointer(event); const hit = this.raycaster.intersectObjects([...this.towers.values()], true)[0];
    if (!hit) return null; let object: THREE.Object3D | null = hit.object;
    while (object) { if (typeof object.userData.towerId === 'number') return object.userData.towerId as number; object = object.parent; } return null;
  }
  setGhost(kind: TowerKind | null): void {
    if (this.ghost) { this.scene.remove(this.ghost); this.ghost.traverse(o => { if (o instanceof THREE.Mesh) (o.material as THREE.Material).dispose(); }); }
    this.ghost = null; this.ghostKind = kind; this.ghostValid = null;
    if (kind) {
      this.ghost = towerModel(kind); this.ghost.traverse(o => { if (o instanceof THREE.Mesh) { o.material = (o.material as THREE.Material).clone(); const m = o.material as THREE.MeshStandardMaterial; m.transparent = true; m.opacity = .58; m.depthWrite = false; o.castShadow = false; } });
      this.scene.add(this.ghost); this.ghost.visible = false;
    }
  }
  placementMessage(sim: Simulation): string | null {
    if (!this.ghostKind) return null; if (!this.hover) return 'Apunta a una plataforma de césped';
    return placementError(this.hover, sim.towers, sim.gold, TOWERS[this.ghostKind].cost, sim.map);
  }
  private createEnemy(id: number, kind: Parameters<typeof enemyModel>[0]): EnemyVisual {
    const group = enemyModel(kind);
    group.traverse(o => { if (o instanceof THREE.Mesh) o.castShadow = false; });
    const shadow = new THREE.Mesh(circle(.42, 12), this.enemyShade);
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = .012; group.add(shadow);
    const bg = new THREE.Mesh(box(.84, .075, .035), this.healthBackground); bg.position.set(0, Number(group.userData.healthHeight ?? 1.35), 0); bg.quaternion.copy(this.camera.quaternion);
    const health = new THREE.Mesh(box(.76, .045, .04), this.healthMaterial); health.position.z = .015; bg.add(health); group.add(bg);
    this.scene.add(group); const visual = { group, health }; this.enemies.set(id, visual); return visual;
  }
  private syncTower(t: Tower): THREE.Group {
    let group = this.towers.get(t.id);
    if (!group || group.userData.level !== t.level) {
      if (group) this.scene.remove(group); group = towerModel(t.kind, t.level); group.position.set(t.x, WORLD.elevation + .07, t.z);
      group.userData = { towerId: t.id, level: t.level }; this.towers.set(t.id, group); this.scene.add(group); this.renderer.shadowMap.needsUpdate = true; this.collectFlames();
    }
    const turret = group.getObjectByName('turret'); if (turret) { turret.rotation.y = t.targetAngle; turret.position.y = Number(turret.userData.restY) + Math.sin(Number(group.userData.recoil ?? 0) * 16) * .045; const barrel = turret.getObjectByName('barrel'); if (barrel) barrel.position.z = .24 - Number(group.userData.recoil ?? 0) * .5; } return group;
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
      v.group.position.set(e.x, .22 + Math.abs(Math.sin(e.progress * 7)) * .04, e.z); v.group.rotation.y = e.angle;
      v.health.scale.x = Math.max(.001, e.hp / e.maxHp); v.health.position.x = -.38 * (1 - e.hp / e.maxHp);
      const bg = v.health.parent!; bg.quaternion.copy(v.group.quaternion).invert().multiply(this.camera.quaternion);
      const legL = v.group.getObjectByName('legL'), legR = v.group.getObjectByName('legR');
      if (legL && legR) { legL.rotation.x = Math.sin(e.progress * 6) * .5; legR.rotation.x = -legL.rotation.x; }
    }
    const towerIds = new Set(sim.towers.map(t => t.id));
    for (const [id, g] of this.towers) if (!towerIds.has(id)) { this.scene.remove(g); this.towers.delete(id); this.renderer.shadowMap.needsUpdate = true; this.collectFlames(); }
    sim.towers.forEach(t => { const g = this.syncTower(t); g.userData.recoil = Math.max(0, Number(g.userData.recoil ?? 0) - visualDt); });
    const projectileIds = new Set(sim.projectiles.map(p => p.id));
    for (const [id, m] of this.projectiles) if (!projectileIds.has(id)) { this.scene.remove(m); this.projectiles.delete(id); }
    for (const p of sim.projectiles) {
      let m = this.projectiles.get(p.id);
      if (!m) {
        m = projectileModel(p.kind); m.userData.source = this.muzzle(p.origin.x, p.origin.z);
        this.scene.add(m); this.projectiles.set(p.id, m);
      }
      const fraction = Math.min(1, p.travelled / Math.max(.01, p.travelled + Math.hypot(p.x - p.target.x, p.z - p.target.z)));
      const source = m.userData.source as THREE.Vector3;
      m.position.set(p.x + (source.x - p.origin.x) * (1 - fraction), THREE.MathUtils.lerp(source.y, .65, fraction) + (p.kind === 'cannon' ? Math.sin(fraction * Math.PI) * 1.5 : 0), p.z + (source.z - p.origin.z) * (1 - fraction));
      m.lookAt(p.target.x, .65, p.target.z);
    }
    for (const event of sim.events) {
      const position = new THREE.Vector3(event.x, .6, event.z);
      if (event.type === 'shot') {
        const muzzle = this.muzzle(event.x, event.z);
        for (const g of this.towers.values()) if (Math.abs(g.position.x - event.x) < .001 && Math.abs(g.position.z - event.z) < .001) g.userData.recoil = .20;
        if (event.kind === 'cannon' || event.kind === 'mage') this.effects.flash(muzzle, event.kind === 'mage' ? 0x72deff : 0xffc147, event.kind === 'mage' ? .65 : .85);
        this.effects.burst(muzzle, event.kind === 'mage' ? 0x9ce8ff : 0xffd487, event.kind === 'cannon' ? 5 : 2, .035);
      }
      if (event.type === 'impact') this.effects.impact(event.kind, event.x, event.z, event.radius);
      if (event.type === 'kill') { this.effects.burst(position, 0x94618f, 6); this.effects.burst(position, 0xe7b64e, 3, .05); }
      if (event.type === 'build' || event.type === 'upgrade') { position.y = WORLD.elevation + 1; this.effects.burst(position, 0xfbd584, 12); this.effects.pulse(new THREE.Vector3(event.x, WORLD.elevation + .10, event.z), 0xb6d79f, .9); }
      if (event.type === 'leak') { position.y = 2; this.effects.burst(position, 0xff7b57, 15); }
    }
    this.effects.update(visualDt);
    this.flames.forEach((flame, i) => flame.scale.setScalar(Number(flame.userData.baseSize) * (1 + .09 * Math.sin(time * 5 + i * 2.3))));
    let rangeCenter: Point | null = null, radius = 0;
    if (this.ghost && this.ghostKind) {
      this.ghost.visible = !!this.hover;
      if (this.hover) {
        const valid = !this.placementMessage(sim);
        if (valid !== this.ghostValid) { this.ghost.traverse(o => { if (o instanceof THREE.Mesh) { const m = o.material as THREE.MeshStandardMaterial; m.color.setHex(valid ? 0x83eaaa : 0xf27474); m.emissive.setHex(valid ? 0x225d3a : 0x612929); } }); this.ghostValid = valid; }
        this.ghost.position.set(this.hover.x, WORLD.elevation + .07, this.hover.z); rangeCenter = this.hover; radius = TOWERS[this.ghostKind].range;
        (this.range.material as THREE.MeshBasicMaterial).color.setHex(valid ? 0x83eaaa : 0xf27474);
      }
    } else if (this.selectedId !== null) {
      const t = sim.towers.find(t => t.id === this.selectedId); if (t) { rangeCenter = t; radius = towerStats(t.kind, t.level).range; (this.range.material as THREE.MeshBasicMaterial).color.setHex(0xa6d9f0); }
    }
    this.range.visible = !!rangeCenter;
    if (rangeCenter) { this.range.position.set(rangeCenter.x, WORLD.elevation + .13, rangeCenter.z); this.range.scale.set(radius, radius, 1); }
    this.renderer.render(this.scene, this.camera);
  }
  towerIcons(): Record<TowerKind, string> {
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); renderer.setSize(320, 288); renderer.setPixelRatio(1);
    renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping;
    const scene = new THREE.Scene(); scene.add(new THREE.HemisphereLight(0xffffff, 0x657b88, 3)); const light = new THREE.DirectionalLight(0xffeac5, 4); light.position.set(-3, 5, 4); scene.add(light);
    const camera = new THREE.OrthographicCamera(-1.8, 1.8, 1.7, -1.55, .1, 30); camera.position.set(3, 3.7, 5); camera.lookAt(0, 1.45, 0);
    const icons = {} as Record<TowerKind, string>;
    for (const kind of Object.keys(TOWERS) as TowerKind[]) { const g = towerModel(kind); scene.add(g); renderer.render(scene, camera); icons[kind] = renderer.domElement.toDataURL(); scene.remove(g); }
    renderer.dispose(); return icons;
  }
  loadMap(map: GameMap): void {
    this.setGhost(null); this.hover = null; this.selectedId = null;
    for (const v of this.enemies.values()) { v.health.parent?.removeFromParent(); this.scene.remove(v.group); }
    for (const group of this.towers.values()) this.scene.remove(group);
    for (const projectile of this.projectiles.values()) this.scene.remove(projectile);
    this.enemies.clear(); this.towers.clear(); this.projectiles.clear();
    this.effects.clear();
    // Terrain geometry and cloned materials belong to this map and can be released safely.
    const geometries = new Set<THREE.BufferGeometry>();
    this.terrainRoot.traverse(o => { if (o instanceof THREE.Mesh) { if (!o.geometry.userData.shared) geometries.add(o.geometry); const materials = Array.isArray(o.material) ? o.material : [o.material]; materials.filter(m => m.userData.owned).forEach(m => m.dispose()); if (o instanceof THREE.InstancedMesh) o.dispose(); } });
    geometries.forEach(g => g.dispose()); this.terrainRoot.clear();
    this.map = map; this.surfaces = createTerrain(this.terrainRoot, map).surfaces; this.collectFlames();
    this.range.visible = false; this.renderer.shadowMap.needsUpdate = true; this.resetCamera();
  }
  dispose(): void { this.observer.disconnect(); this.effects.dispose(); this.healthMaterial.dispose(); this.healthBackground.dispose(); this.enemyShade.dispose(); this.renderer.dispose(); }
}
