import * as THREE from 'three';
import type { TowerKind } from '../game/config';
import { glow } from './models';
interface Spark { position: THREE.Vector3; velocity: THREE.Vector3; color: THREE.Color; life: number; duration: number; size: number; }
interface Pulse { object: THREE.Mesh | THREE.Sprite; material: THREE.Material; life: number; duration: number; size: number; expansion: number; }
export class Effects {
  private sparks: Spark[] = [];
  private pulses: Pulse[] = [];
  private readonly cloud: THREE.InstancedMesh;
  private readonly ring = new THREE.RingGeometry(.86, 1, 40);
  private readonly transform = new THREE.Object3D();
  constructor(private scene: THREE.Scene) {
    this.cloud = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), 200);
    this.cloud.count = 0; this.cloud.frustumCulled = false; this.cloud.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(this.cloud);
  }
  burst(position: THREE.Vector3, tint: number, count: number, size = .065): void {
    for (let i = 0; i < count && this.sparks.length < 200; i++) {
      const duration = .32 + Math.random() * .36;
      this.sparks.push({ position: position.clone(), velocity: new THREE.Vector3((Math.random() - .5) * 3, .8 + Math.random() * 2.4, (Math.random() - .5) * 3), color: new THREE.Color(tint), life: duration, duration, size });
    }
  }
  flash(position: THREE.Vector3, color: number, size: number, duration = .18): void {
    if (this.pulses.length > 40) return;
    const sprite = glow(color, size); sprite.material = sprite.material.clone(); sprite.position.copy(position); this.scene.add(sprite);
    this.pulses.push({ object: sprite, material: sprite.material, life: duration, duration, size, expansion: .3 });
  }
  pulse(position: THREE.Vector3, color: number, radius: number, duration = .42): void {
    if (this.pulses.length > 40) return;
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .8, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
    const ring = new THREE.Mesh(this.ring, mat); ring.rotation.x = -Math.PI / 2; ring.position.copy(position); this.scene.add(ring);
    this.pulses.push({ object: ring, material: mat, life: duration, duration, size: radius, expansion: 1 });
  }
  impact(kind: TowerKind | undefined, x: number, z: number, radius = 1.8, ground = .13): void {
    const position = new THREE.Vector3(x, ground + .4, z);
    if (kind === 'cannon') { this.flash(position, 0xffad3b, 1.25, .28); this.burst(position, 0xffb953, 20, .08); this.pulse(new THREE.Vector3(x, ground + .03, z), 0xeeb277, radius); }
    else if (kind === 'mage') { this.flash(position, 0x57d5ff, .78); this.burst(position, 0x8de9fa, 7, .045); this.pulse(new THREE.Vector3(x, ground + .03, z), 0x7acbee, .5, .25); }
    else this.burst(position, 0xe8c78e, 3, .04);
  }
  update(dt: number): void {
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const p = this.sparks[i]; p.life -= dt; if (p.life <= 0) this.sparks.splice(i, 1);
      else { p.position.addScaledVector(p.velocity, dt); p.velocity.y -= dt * 5; }
    }
    this.sparks.forEach((p, i) => { this.transform.position.copy(p.position); this.transform.scale.setScalar(p.size * p.life / p.duration); this.transform.rotation.set(p.life * 3, p.life * 4, 0); this.transform.updateMatrix(); this.cloud.setMatrixAt(i, this.transform.matrix); this.cloud.setColorAt(i, p.color); });
    this.cloud.count = this.sparks.length; this.cloud.instanceMatrix.needsUpdate = true; if (this.cloud.instanceColor) this.cloud.instanceColor.needsUpdate = true;
    for (let i = this.pulses.length - 1; i >= 0; i--) {
      const p = this.pulses[i]; p.life -= dt;
      if (p.life <= 0) { this.scene.remove(p.object); p.material.dispose(); this.pulses.splice(i, 1); }
      else { const elapsed = 1 - p.life / p.duration; p.object.scale.setScalar(p.size * (p.object instanceof THREE.Sprite ? 1 + elapsed * p.expansion : .28 + elapsed * .72)); (p.material as THREE.MeshBasicMaterial | THREE.SpriteMaterial).opacity = (1 - elapsed) * .8; }
    }
  }
  clear(): void { this.sparks.length = 0; this.cloud.count = 0; for (const p of this.pulses) { this.scene.remove(p.object); p.material.dispose(); } this.pulses.length = 0; }
  dispose(): void { this.clear(); this.scene.remove(this.cloud); this.cloud.geometry.dispose(); (this.cloud.material as THREE.Material).dispose(); this.ring.dispose(); }
}
