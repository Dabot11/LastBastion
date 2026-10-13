import * as THREE from 'three';

interface NumberLabel { element: HTMLSpanElement; position: THREE.Vector3; life: number; drift: number; }
// Screen-space text stays readable at every zoom. A bounded pool avoids canvas textures per hit.
export class DamageLabels {
  readonly layer = document.createElement('div');
  readonly gate = document.createElement('div');
  private labels: NumberLabel[] = [];
  private spare: HTMLSpanElement[] = [];
  private serial = 0;
  private lastHp = -1;
  private lastMaxHp = -1;
  constructor(container: HTMLElement) {
    this.layer.className = 'damage-layer'; this.layer.setAttribute('aria-hidden', 'true');
    this.gate.className = 'gate-label'; this.layer.append(this.gate); container.append(this.layer);
  }
  add(position: THREE.Vector3, damage: number, kind: 'physical' | 'poison' | 'gate'): void {
    if (this.labels.length >= 64) this.release(this.labels.shift()!);
    const element = this.spare.pop() ?? document.createElement('span'); element.className = `damage-number ${kind}`;
    element.textContent = `−${Math.round(damage) || '<1'}`; element.dataset.damage = String(damage);
    this.layer.append(element); this.labels.push({ element, position: position.clone(), life: 1.05, drift: ((this.serial++ % 3) - 1) * 18 });
  }
  update(dt: number, camera: THREE.Camera, width: number, height: number, gatePosition: THREE.Vector3, hp: number, maxHp: number): void {
    const projected = gatePosition.clone().project(camera), ratio = hp / maxHp;
    if (this.lastHp !== hp || this.lastMaxHp !== maxHp) { this.lastHp = hp; this.lastMaxHp = maxHp; this.gate.innerHTML = `<small>PUERTA DEL CASTILLO</small><b>${hp} / ${maxHp}</b><i><em style="width:${ratio * 100}%"></em></i>`; }
    this.gate.classList.toggle('under-siege', ratio < .3);
    this.gate.style.transform = `translate(${(projected.x + 1) / 2 * width}px,${(1 - projected.y) / 2 * height}px) translate(-50%,-100%)`;
    this.gate.hidden = projected.z < -1 || projected.z > 1 || Math.abs(projected.x) > 1.1 || Math.abs(projected.y) > 1.1;
    for (let i = this.labels.length - 1; i >= 0; i--) {
      const label = this.labels[i]; label.life -= dt;
      if (label.life <= 0) { this.release(label); this.labels.splice(i, 1); continue; }
      const p = label.position.clone().project(camera), elapsed = 1.05 - label.life;
      label.element.style.transform = `translate(${(p.x + 1) / 2 * width + label.drift * elapsed}px,${(1 - p.y) / 2 * height - elapsed * 49}px) translate(-50%,-50%) scale(${1 + Math.max(0, .13 - elapsed) * 1.8})`;
      label.element.style.opacity = String(Math.min(1, label.life * 3));
      label.element.hidden = p.z < -1 || p.z > 1;
    }
  }
  private release(label: NumberLabel): void { label.element.remove(); this.spare.push(label.element); }
  clear(): void { this.labels.forEach(label => this.release(label)); this.labels.length = 0; }
  dispose(): void { this.clear(); this.layer.remove(); this.spare.length = 0; }
}
