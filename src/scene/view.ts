import * as THREE from 'three';
import { TOWERS, WORLD, towerStats, type TowerKind } from '../game/config';
import { placementError, type GameMap, type Point } from '../game/path';
import { type Simulation, type Tower } from '../game/simulation';
import { createTerrain } from './terrain';
import { box, circle, enemyModel, material, orb, towerModel } from './models';
interface EnemyVisual { group: THREE.Group; health: THREE.Mesh; }
interface Particle { mesh: THREE.Mesh; life: number; duration: number; velocity: THREE.Vector3; }
export class GameView {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.OrthographicCamera(-20, 20, 16, -16, .1, 160);
  readonly raycaster = new THREE.Raycaster();
  readonly pointer = new THREE.Vector2();
  readonly enemies = new Map<number, EnemyVisual>();
  readonly towers = new Map<number, THREE.Group>();
  readonly projectiles = new Map<number, THREE.Mesh>();
  readonly particles: Particle[] = [];
  surfaces: THREE.Object3D[] = [];
  private readonly terrainRoot = new THREE.Group();
  private map: GameMap;
  readonly range: THREE.Mesh;
  ghost: THREE.Group | null = null; ghostKind: TowerKind | null = null; hover: Point | null = null;
  selectedId: number | null = null; private ghostValid: boolean | null = null;
  private pan = new THREE.Vector3(); private observer: ResizeObserver;
  constructor(readonly container: HTMLElement, map: GameMap) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setClearColor(0xcbd8c8); this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.0;
    this.renderer.domElement.setAttribute('aria-label', 'Campo de batalla 3D: construye defensas en las plataformas verdes');
    container.append(this.renderer.domElement);
    this.scene.fog = new THREE.Fog(0xcbd8c8, 65, 130);
    this.scene.add(new THREE.HemisphereLight(0xe4efff, 0x728263, 1.8));
    const sun = new THREE.DirectionalLight(0xffefd2, 2.4); sun.position.set(-12, 28, 15); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.left = -25; sun.shadow.camera.right = 25;
    sun.shadow.camera.top = 25; sun.shadow.camera.bottom = -25; sun.shadow.camera.far = 80; sun.shadow.normalBias = .08; sun.shadow.bias = .00015; this.scene.add(sun); this.renderer.shadowMap.autoUpdate = false; this.renderer.shadowMap.needsUpdate = true;
    this.map = map; this.scene.add(this.terrainRoot);
    this.surfaces = createTerrain(this.terrainRoot, map).surfaces;
    const rangeMat = new THREE.MeshBasicMaterial({ color: 0xbdeaaa, transparent: true, opacity: .13, depthWrite: false, side: THREE.DoubleSide });
    this.range = new THREE.Mesh(new THREE.CircleGeometry(1, 80), rangeMat); this.range.rotation.x = -Math.PI / 2; this.range.visible = false;
    const ring = new THREE.Mesh(new THREE.RingGeometry(.982, 1, 80), new THREE.MeshBasicMaterial({ color: 0xe1fbd3, transparent: true, opacity: .85, side: THREE.DoubleSide, depthWrite: false }));
    this.range.add(ring); this.scene.add(this.range);
    this.observer = new ResizeObserver(() => this.resize()); this.observer.observe(container); this.resize();
  }
  resize(): void {
    const w = this.container.clientWidth, h = this.container.clientHeight; if (!w || !h) return;
    this.renderer.setSize(w, h); const aspect = w / h;
    const height = Math.max(29, 39 / aspect); this.camera.left = -height * aspect / 2; this.camera.right = height * aspect / 2;
    this.camera.top = height / 2; this.camera.bottom = -height / 2; this.updateCamera();
  }
  private updateCamera(): void {
    this.camera.position.set(9 + this.pan.x, 30, 24 + this.pan.z); this.camera.lookAt(this.pan.x, 0, this.pan.z); this.camera.updateProjectionMatrix(); this.camera.updateMatrixWorld();
  }
  zoom(delta: number): void { this.camera.zoom = THREE.MathUtils.clamp(this.camera.zoom * Math.exp(-delta * .001), .8, 1.65); this.camera.updateProjectionMatrix(); }
  panBy(dx: number, dy: number): void {
    this.pan.x = THREE.MathUtils.clamp(this.pan.x - dx * .025, -3, 3); this.pan.z = THREE.MathUtils.clamp(this.pan.z - dy * .025, -3, 3); this.updateCamera();
  }
  resetCamera(): void { this.pan.set(0, 0, 0); this.camera.zoom = 1; this.updateCamera(); }
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
    const shadow = new THREE.Mesh(circle(.42, 12), new THREE.MeshBasicMaterial({ color: 0x3c332f, transparent: true, opacity: .18, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = .012; group.add(shadow);
    const bg = new THREE.Mesh(box(.84, .075, .035), material(0x2c2230)); bg.position.set(0, 1.35, 0); bg.quaternion.copy(this.camera.quaternion);
    const health = new THREE.Mesh(box(.76, .045, .04), material(0xe45b67)); health.position.z = .015; bg.add(health); group.add(bg);
    this.scene.add(group); const visual = { group, health }; this.enemies.set(id, visual); return visual;
  }
  private syncTower(t: Tower): THREE.Group {
    let group = this.towers.get(t.id);
    if (!group || group.userData.level !== t.level) {
      if (group) this.scene.remove(group); group = towerModel(t.kind, t.level); group.position.set(t.x, WORLD.elevation + .07, t.z);
      group.userData = { towerId: t.id, level: t.level }; this.towers.set(t.id, group); this.scene.add(group); this.renderer.shadowMap.needsUpdate = true;
    }
    const turret = group.getObjectByName('turret'); if (turret) turret.rotation.y = t.targetAngle; return group;
  }
  private effect(x: number, z: number, color: number, count: number, y: number): void {
    for (let i = 0; i < count && this.particles.length < 160; i++) {
      const m = new THREE.Mesh(box(.08, .08, .08), material(color, color)); m.position.set(x, y, z); this.scene.add(m);
      const duration = .35 + Math.random() * .3;
      this.particles.push({ mesh: m, life: duration, duration, velocity: new THREE.Vector3((Math.random() - .5) * 3, 1 + Math.random() * 3, (Math.random() - .5) * 3) });
    }
  }
  update(sim: Simulation, visualDt: number, _time: number): void {
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
    for (const [id, g] of this.towers) if (!towerIds.has(id)) { this.scene.remove(g); this.towers.delete(id); this.renderer.shadowMap.needsUpdate = true; }
    sim.towers.forEach(t => this.syncTower(t));
    const projectileIds = new Set(sim.projectiles.map(p => p.id));
    for (const [id, m] of this.projectiles) if (!projectileIds.has(id)) { this.scene.remove(m); this.projectiles.delete(id); }
    for (const p of sim.projectiles) {
      let m = this.projectiles.get(p.id);
      if (!m) {
        const magic = p.kind === 'mage', cannon = p.kind === 'cannon';
        const geo = magic || cannon ? orb(magic ? .12 : .14) : box(.05, .05, p.kind === 'crossbow' ? .62 : .38);
        m = new THREE.Mesh(geo, material(magic ? 0x71efff : cannon ? 0x353641 : 0xe1bd73, magic ? 0x16aaff : 0));
        this.scene.add(m); this.projectiles.set(p.id, m);
      }
      const fraction = Math.min(1, p.travelled / Math.max(.01, p.travelled + Math.hypot(p.x - p.target.x, p.z - p.target.z)));
      m.position.set(p.x, THREE.MathUtils.lerp(WORLD.elevation + 2.5, .65, fraction) + (p.kind === 'cannon' ? Math.sin(fraction * Math.PI) * 1.5 : 0), p.z);
      m.lookAt(p.target.x, .65, p.target.z);
    }
    for (const event of sim.events) {
      if (event.type === 'impact') this.effect(event.x, event.z, event.kind === 'mage' ? 0x70efff : event.kind === 'cannon' ? 0xffa94c : 0xe6d09d, event.kind === 'cannon' ? 16 : 4, .6);
      if (event.type === 'kill') this.effect(event.x, event.z, 0xaa6ecc, 6, .4);
      if (event.type === 'build' || event.type === 'upgrade') this.effect(event.x, event.z, 0xfbd584, 12, 2.5);
      if (event.type === 'leak') { this.effect(event.x, event.z, 0xff7b57, 15, 2); }
    }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]; p.life -= visualDt;
      if (p.life <= 0) { this.scene.remove(p.mesh); this.particles.splice(i, 1); }
      else { p.mesh.position.addScaledVector(p.velocity, visualDt); p.velocity.y -= visualDt * 5; p.mesh.scale.setScalar(p.life / p.duration); }
    }
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
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); renderer.setSize(200, 180); renderer.setPixelRatio(1);
    renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping;
    const scene = new THREE.Scene(); scene.add(new THREE.HemisphereLight(0xffffff, 0x657b88, 3)); const light = new THREE.DirectionalLight(0xffeac5, 4); light.position.set(-3, 5, 4); scene.add(light);
    const camera = new THREE.OrthographicCamera(-1.35, 1.35, 1.4, -1.1, .1, 30); camera.position.set(3, 3.2, 5); camera.lookAt(0, 1.2, 0);
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
    for (const p of this.particles) this.scene.remove(p.mesh); this.particles.length = 0;
    // Terrain geometry and cloned materials belong to this map and can be released safely.
    const geometries = new Set<THREE.BufferGeometry>();
    this.terrainRoot.traverse(o => { if (o instanceof THREE.Mesh) { geometries.add(o.geometry); const materials = Array.isArray(o.material) ? o.material : [o.material]; materials.filter(m => m.userData.owned).forEach(m => m.dispose()); if (o instanceof THREE.InstancedMesh) o.dispose(); } });
    geometries.forEach(g => g.dispose()); this.terrainRoot.clear();
    this.map = map; this.surfaces = createTerrain(this.terrainRoot, map).surfaces;
    this.range.visible = false; this.renderer.shadowMap.needsUpdate = true; this.resetCamera();
  }
  dispose(): void { this.observer.disconnect(); this.renderer.dispose(); }
}
