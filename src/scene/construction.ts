import * as THREE from 'three';
import { TOWERS, WORLD, type TowerKind } from '../game/config';
import { buildArea, createPlacementField, type PlacementField } from '../game/build-areas';
import type { Simulation } from '../game/simulation';
import type { Point } from '../game/path';
import { valleyHeight } from './surfaces';

function geometry(points: Point[]): THREE.BufferGeometry {
  const positions = new Float32Array(points.length * 3);
  points.forEach((p, i) => { positions[i * 3] = p.x; positions[i * 3 + 1] = valleyHeight(p.x, p.z) + .022; positions[i * 3 + 2] = p.z; });
  return new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(positions, 3));
}

export class ConstructionAreas {
  readonly group = new THREE.Group();
  readonly fill = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: 0x63dfa6, transparent: true, opacity: .23, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
  readonly border = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xc0f4c4, transparent: true, opacity: .66, depthWrite: false, toneMapped: false }));
  private field: PlacementField | null = null;
  private map: Simulation['map'] | null = null;
  private signature = '';
  constructor() {
    this.group.name = 'construction-areas'; this.fill.name = 'buildable-terrain'; this.border.name = 'buildable-boundary';
    this.fill.renderOrder = 1; this.border.renderOrder = 2; this.group.add(this.fill, this.border); this.group.visible = false;
  }
  update(sim: Simulation, kind: TowerKind | null): void {
    this.group.visible = !!kind && !sim.finished && sim.mission.towers.includes(kind) && sim.gold >= TOWERS[kind].cost;
    if (!this.group.visible) return;
    if (this.map !== sim.map) { this.map = sim.map; this.field = createPlacementField(sim.map); this.signature = ''; }
    const signature = `${kind};${sim.towers.map(t => `${t.id}:${t.x}:${t.z}`).join(';')}`;
    if (signature === this.signature) return;
    const area = buildArea(this.field!, sim.towers);
    this.fill.geometry.dispose(); this.border.geometry.dispose();
    this.fill.geometry = geometry(area.triangles); this.border.geometry = geometry(area.boundary); this.signature = signature;
  }
  hide(): void { this.group.visible = false; }
  dispose(): void { this.fill.geometry.dispose(); this.border.geometry.dispose(); this.fill.material.dispose(); this.border.material.dispose(); this.field = null; }
}

function marker(valid: boolean): THREE.Sprite {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 96;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = valid ? '#173c31' : '#5b292e'; ctx.beginPath(); ctx.arc(48, 48, 42, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = valid ? '#b3f6c8' : '#ffd2c8'; ctx.lineWidth = 5; ctx.stroke();
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 9; ctx.lineCap = ctx.lineJoin = 'round'; ctx.beginPath();
  if (valid) { ctx.moveTo(25, 48); ctx.lineTo(41, 63); ctx.lineTo(70, 33); }
  else { ctx.moveTo(32, 32); ctx.lineTo(64, 64); ctx.moveTo(64, 32); ctx.lineTo(32, 64); }
  ctx.stroke();
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false, depthWrite: false, toneMapped: false }));
  sprite.name = valid ? 'placement-confirmation' : 'placement-rejection'; sprite.scale.set(.72, .72, 1); sprite.position.set(.94, .48, .12); sprite.renderOrder = 5;
  return sprite;
}

export class PlacementFootprint {
  readonly group = new THREE.Group();
  readonly base = new THREE.Mesh(new THREE.CircleGeometry(WORLD.towerRadius, 48), new THREE.MeshBasicMaterial({ transparent: true, opacity: .38, side: THREE.DoubleSide, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  private readonly rim = new THREE.Mesh(new THREE.RingGeometry(WORLD.towerRadius - .035, WORLD.towerRadius, 48), new THREE.MeshBasicMaterial({ transparent: true, opacity: .95, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }));
  readonly confirmation = marker(true);
  readonly rejection = marker(false);
  constructor() {
    this.group.name = 'placement-footprint'; this.base.name = 'occupied-space'; this.base.rotation.x = this.rim.rotation.x = -Math.PI / 2;
    this.base.renderOrder = 3; this.rim.renderOrder = 4; this.rim.position.y = .006;
    this.group.add(this.base, this.rim, this.confirmation, this.rejection); this.group.visible = false;
  }
  update(point: Point | null, height: number, valid: boolean): void {
    this.group.visible = !!point; if (!point) return;
    this.group.position.set(point.x, height + .037, point.z);
    this.base.material.color.setHex(valid ? 0x62e69a : 0xf57f79); this.rim.material.color.setHex(valid ? 0xbdfacb : 0xffc8b9);
    this.confirmation.visible = valid; this.rejection.visible = !valid;
  }
  dispose(): void {
    this.base.geometry.dispose(); this.base.material.dispose(); this.rim.geometry.dispose(); this.rim.material.dispose();
    for (const sprite of [this.confirmation, this.rejection]) { sprite.material.map?.dispose(); sprite.material.dispose(); }
  }
}
