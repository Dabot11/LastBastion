import * as THREE from 'three';
import { WORLD } from '../game/config';

let grain: THREE.DataTexture | undefined;
let shadow: THREE.MeshBasicMaterial | undefined;
export function contactShadowMaterial(): THREE.MeshBasicMaterial {
  if (!shadow) {
    const pixels = new Uint8Array(32 * 32 * 4);
    for (let z = 0; z < 32; z++) for (let x = 0; x < 32; x++) {
      const i = (z * 32 + x) * 4, radius = Math.hypot((x - 15.5) / 15.5, (z - 15.5) / 15.5);
      pixels[i] = pixels[i + 1] = pixels[i + 2] = 255; pixels[i + 3] = Math.round(Math.max(0, 1 - radius) ** 2 * 120);
    }
    const texture = new THREE.DataTexture(pixels, 32, 32); texture.magFilter = THREE.LinearFilter; texture.needsUpdate = true;
    shadow = new THREE.MeshBasicMaterial({ color: 0x25392a, map: texture, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 });
  }
  return shadow;
}
// A small, seamless pigment texture adds detail without downloading artwork.
export function groundMaterial(color: number, vertexColors = false): THREE.MeshStandardMaterial {
  if (!grain) {
    const pixels = new Uint8Array(128 * 128 * 4); let seed = 711;
    for (let i = 0; i < pixels.length; i += 4) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const shade = 233 + (seed >>> 24) % 23;
      pixels[i] = pixels[i + 1] = pixels[i + 2] = shade; pixels[i + 3] = 255;
    }
    grain = new THREE.DataTexture(pixels, 128, 128); grain.wrapS = grain.wrapT = THREE.RepeatWrapping;
    grain.magFilter = THREE.LinearFilter; grain.minFilter = THREE.LinearMipmapLinearFilter;
    grain.generateMipmaps = true; grain.needsUpdate = true;
  }
  const material = new THREE.MeshStandardMaterial({ color, map: grain, vertexColors, roughness: 1 });
  material.userData.owned = true; return material;
}

// The playable ground stays perfectly level. Only the surrounding world rises into hills.
export function valleyHeight(x: number, z: number): number {
  const outside = Math.max(Math.abs(x) - 16, Math.abs(z) - 14, 0);
  const blend = THREE.MathUtils.smoothstep(outside, 0, 12);
  const hills = 1.7 + 1.4 * Math.sin(x * .15 + z * .11) + .9 * Math.cos(z * .21 - x * .06);
  return WORLD.elevation + .05 + blend * Math.max(.4, hills);
}
