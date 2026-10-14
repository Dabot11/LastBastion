import * as THREE from 'three';
import { TOWERS, type TowerKind } from '../game/config';
import { recommendedGatePad } from '../game/guidance';
import type { Simulation } from '../game/simulation';
import { PAD_HEIGHT, PAD_RADIUS, placementIssue, type Point, type GameMap } from '../game/path';
import { valleyHeight } from './surfaces';

export class ConstructionPads {
  readonly group = new THREE.Group();
  readonly foundations = new THREE.InstancedMesh(new THREE.CylinderGeometry(PAD_RADIUS * .94, PAD_RADIUS, PAD_HEIGHT, 6, 1, false, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xc6c0a7, roughness: .92 }), 18);
  readonly rims = new THREE.InstancedMesh(new THREE.RingGeometry(PAD_RADIUS * .82, PAD_RADIUS * .92, 6), new THREE.MeshBasicMaterial({ transparent: true, opacity: .72, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }), 18);
  private readonly engravings = new THREE.InstancedMesh(new THREE.BoxGeometry(.32, .008, .058), new THREE.MeshStandardMaterial({ color: 0x8f805e, roughness: .75 }), 36);
  private readonly recommendation = new THREE.Mesh(new THREE.RingGeometry(PAD_RADIUS * 1.08, PAD_RADIUS * 1.25, 6), new THREE.MeshBasicMaterial({ color: 0x8af6d4, transparent: true, opacity: .9, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }));
  private map: GameMap | null = null;
  private readonly transform = new THREE.Object3D();
  private readonly color = new THREE.Color();
  constructor() {
    this.group.name = 'construction-pads'; this.foundations.name = 'hexagonal-foundations'; this.rims.name = 'foundation-rims';
    this.foundations.castShadow = this.foundations.receiveShadow = true; this.rims.renderOrder = 1;
    this.recommendation.name = 'recommended-gate-base'; this.recommendation.rotation.x = -Math.PI / 2; this.recommendation.visible = false;
    this.group.add(this.foundations, this.rims, this.engravings, this.recommendation);
  }
  load(map: GameMap): void {
    this.map = map; this.foundations.count = this.rims.count = map.pads.length; this.engravings.count = map.pads.length * 2;
    map.pads.forEach((pad, i) => {
      const ground = valleyHeight(pad.x, pad.z);
      this.transform.position.set(pad.x, ground + PAD_HEIGHT / 2, pad.z); this.transform.rotation.set(0, 0, 0); this.transform.updateMatrix(); this.foundations.setMatrixAt(i, this.transform.matrix);
      this.transform.position.y = ground + PAD_HEIGHT + .006; this.transform.rotation.x = -Math.PI / 2; this.transform.updateMatrix(); this.rims.setMatrixAt(i, this.transform.matrix);
      for (let j = 0; j < 2; j++) { this.transform.rotation.set(0, j * Math.PI / 2, 0); this.transform.updateMatrix(); this.engravings.setMatrixAt(i * 2 + j, this.transform.matrix); }
      this.rims.setColorAt(i, this.color.setHex(0xbda46f));
    });
    for (const mesh of [this.foundations, this.rims, this.engravings]) { mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere(); }
    if (this.rims.instanceColor) this.rims.instanceColor.needsUpdate = true;
  }
  update(sim: Simulation, kind: TowerKind | null, hover: Point | null, guidanceEnabled = true, time = 0): void {
    if (this.map !== sim.map) this.load(sim.map);
    const suggested = guidanceEnabled ? recommendedGatePad(sim) : null;
    this.recommendation.visible = !!suggested;
    if (suggested) {
      this.recommendation.position.set(suggested.x, valleyHeight(suggested.x, suggested.z) + PAD_HEIGHT + .02, suggested.z);
      const pulse = 1 + Math.sin(time * 3) * .06;
      this.recommendation.scale.setScalar(pulse);
      this.recommendation.material.opacity = .7 + Math.sin(time * 3) * .2;
    }
    sim.map.pads.forEach((pad, i) => {
      const occupied = sim.towers.some(t => t.padId === pad.id);
      const ready = kind && !sim.finished && sim.mission.towers.includes(kind) && !placementIssue(pad, sim.towers, sim.gold, TOWERS[kind].cost, sim.map);
      const focused = hover && Math.hypot(hover.x - pad.x, hover.z - pad.z) < .1;
      this.rims.setColorAt(i, this.color.setHex(occupied ? 0x74817b : ready && focused ? 0x92e8b4 : ready ? 0xffd281 : 0xbda46f));
    });
    if (this.rims.instanceColor) this.rims.instanceColor.needsUpdate = true;
  }
  dispose(): void { this.recommendation.geometry.dispose(); this.recommendation.material.dispose(); for (const mesh of [this.foundations, this.rims, this.engravings]) { mesh.geometry.dispose(); mesh.material.dispose(); mesh.dispose(); } }
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
  readonly base = new THREE.Mesh(new THREE.CircleGeometry(PAD_RADIUS * .91, 6), new THREE.MeshBasicMaterial({ transparent: true, opacity: .22, side: THREE.DoubleSide, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  private readonly rim = new THREE.Mesh(new THREE.RingGeometry(PAD_RADIUS * .90, PAD_RADIUS * .94, 6), new THREE.MeshBasicMaterial({ transparent: true, opacity: .95, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }));
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
