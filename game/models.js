import * as T from './vendor/three.min.js';

export const COLORS = { cyan: 0x71efff, amber: 0xffb94e, steel: 0x2c424b, blue: 0x1c647c, copper: 0xbc7045, dark: 0x101d25, red: 0xb63c26 };
const material = (color, metalness = .5, roughness = .6, emissive = 0, intensity = 0) => new T.MeshStandardMaterial({ color, metalness, roughness, emissive, emissiveIntensity: intensity });
export const MAT = {
  steel: material(0x3e5359, .68, .55), dark: material(0x11232e, .55, .7), black: material(0x0a131b, .1, .8),
  blue: material(0x176482, .48, .4), copper: material(0xbd764d, .75, .36), gold: material(0xd3a562, .65, .4),
  red: material(0xb73e29, .35, .6), bone: material(0xb9c0ae, .45, .6),
  cyan: material(0x77eaff, .12, .2, 0x4feaff, 3.8), amber: material(0xfaca69, .25, .35, 0xff9b28, 2.8),
  danger: material(0xf97742, .3, .45, 0xff4922, 2.7), cloth: material(0x9b3026, 0, 1),
};
const geo = {
  box: new T.BoxGeometry(1, 1, 1), cylinder: new T.CylinderGeometry(.5, .5, 1, 10),
  sphere: new T.SphereGeometry(.5, 12, 8), cone: new T.ConeGeometry(.5, 1, 8),
};
export function part(group, shape, mat, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) {
  const mesh = new T.Mesh(geo[shape] || geo.box, typeof mat === 'string' ? MAT[mat] : mat);
  mesh.position.set(x, y, z); mesh.scale.set(sx, sy, sz); mesh.rotation.set(rx, ry, rz);
  mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh); return mesh;
}
export function mergeParts(group) {
  group.updateMatrixWorld(true);
  const batches = new Map();
  group.children.forEach(mesh => {
    if (!mesh.isMesh) return;
    let arr = batches.get(mesh.material); if (!arr) batches.set(mesh.material, arr = []);
    arr.push(mesh.geometry.clone().applyMatrix4(mesh.matrix));
  });
  const root = new T.Group();
  for (const [mat, geometries] of batches) {
    const attrs = { position: [], normal: [], uv: [] };
    for (let g of geometries) {
      if (g.index) { const old = g; g = g.toNonIndexed(); old.dispose(); }
      for (const key of Object.keys(attrs)) { const a = g.getAttribute(key); if (a) for (let i = 0; i < a.array.length; i++) attrs[key].push(a.array[i]); }
      g.dispose();
    }
    const g = new T.BufferGeometry();
    for (const [key, arr] of Object.entries(attrs)) g.setAttribute(key, new T.Float32BufferAttribute(arr, key === 'uv' ? 2 : 3));
    g.computeBoundingSphere(); const m = new T.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true; root.add(m);
  }
  return root;
}
function batchStaticChildren(group, excluded = []) {
  const staging = new T.Group();
  for (const child of [...group.children]) if (child.isMesh && !excluded.includes(child)) { group.remove(child); staging.add(child); }
  const result = mergeParts(staging);
  for (const child of [...result.children]) group.add(child);
}
export function rangerModel() {
  const root = new T.Group();
  const lower = new T.Group(); root.add(lower);
  part(lower, 'box', 'dark', 0, .64, 0, .63, .42, .4);
  const legs = [];
  for (const side of [-1, 1]) {
    const leg = new T.Group(); leg.position.set(side * .25, .59, 0); lower.add(leg);
    part(leg, 'box', 'blue', 0, -.13, 0, .29, .52, .34, .1);
    part(leg, 'sphere', 'copper', 0, -.34, -.14, .3, .27, .21);
    part(leg, 'box', 'dark', 0, -.47, .02, .25, .35, .29);
    part(leg, 'box', 'copper', 0, -.57, -.09, .33, .2, .51);
    legs.push(leg);
  }
  const torso = new T.Group(); torso.position.y = 1.13; root.add(torso);
  part(torso, 'box', 'blue', 0, 0, 0, .78, .69, .52, 0, 0, .04);
  part(torso, 'box', 'copper', 0, .07, -.28, .61, .43, .12, -.12);
  part(torso, 'box', 'cyan', -.14, .12, -.36, .08, .23, .06);
  part(torso, 'box', 'dark', 0, -.37, 0, .78, .13, .61);
  for (let i = -1; i <= 1; i++) part(torso, 'box', 'gold', i * .24, -.36, -.33, .14, .13, .1);
  part(torso, 'box', 'dark', 0, .04, .33, .62, .5, .32);
  for (const s of [-1, 1]) {
    part(torso, 'box', 'copper', s * .48, .18, 0, .38, .3, .65, 0, 0, s * .2);
    part(torso, 'cylinder', 'dark', s * .43, -.12, -.2, .26, .6, .26, -.8, 0, s * .2);
    part(torso, 'box', 'blue', s * .36, -.2, -.47, .3, .29, .38, -.3);
    part(torso, 'cylinder', 'amber', s * .22, .03, .55, .13, .4, .13);
  }
  part(torso, 'cylinder', 'copper', 0, .55, 0, .54, .48, .55);
  part(torso, 'box', 'dark', 0, .58, -.25, .54, .24, .19);
  part(torso, 'box', 'cyan', 0, .61, -.355, .46, .09, .06);
  part(torso, 'box', 'gold', .25, .59, 0, .13, .23, .43);
  part(torso, 'box', 'copper', 0, .82, .03, .18, .17, .46);
  const gun = new T.Group(); gun.position.set(.32, -.03, -.57); torso.add(gun);
  part(gun, 'box', 'dark', 0, 0, -.34, .27, .3, 1.17);
  part(gun, 'box', 'copper', 0, .1, -.26, .35, .13, .8);
  for (const s of [-1, 1]) { part(gun, 'box', 'cyan', s * .14, .02, -.65, .07, .1, 1.1); part(gun, 'box', 'steel', s * .2, -.02, -.64, .07, .24, 1.05); }
  part(gun, 'cylinder', 'cyan', 0, .03, -1.25, .25, .08, .25, Math.PI / 2);
  part(gun, 'box', 'amber', 0, .23, -.22, .06, .08, .25);
  const scarfGeometry = new T.PlaneGeometry(.55, 1.6, 3, 10); scarfGeometry.rotateX(-Math.PI / 2); scarfGeometry.translate(-.17, .27, .8);
  const scarfMat = MAT.cloth.clone(); scarfMat.side = T.DoubleSide;
  const scarf = new T.Mesh(scarfGeometry, scarfMat); torso.add(scarf);
  const positions = scarfGeometry.getAttribute('position'); const rest = positions.array.slice();
  root.userData = { torso, legs, gun, scarf, scarfRest: rest, type: 'ranger' };
  batchStaticChildren(torso, [scarf]); batchStaticChildren(gun); batchStaticChildren(lower);
  for (const leg of legs) batchStaticChildren(leg);
  root.scale.setScalar(1.13);
  return root;
}

const enemyTemplates = new Map();
export function enemyModel(type) {
  if (!enemyTemplates.has(type)) {
    const g = new T.Group();
    if (type === 'drone') {
      part(g, 'sphere', 'dark', 0, .84, 0, 1.15, .62, .91);
      part(g, 'box', 'copper', 0, 1, .03, .77, .24, .7, 0, 0, .1);
      part(g, 'box', 'danger', 0, .87, -.43, .54, .13, .12);
      for (const s of [-1, 1]) {
        part(g, 'box', 'steel', s * .72, .91, .05, .51, .15, .87, 0, 0, s * .28);
        part(g, 'box', 'copper', s * .78, .94, .23, .32, .19, .56);
        part(g, 'cylinder', 'dark', s * .65, .72, .12, .36, .33, .36);
        part(g, 'cylinder', 'amber', s * .65, .52, .12, .17, .12, .17);
        part(g, 'cone', 'steel', s * .43, .8, -.65, .24, .7, .24, -Math.PI / 2, 0, -.2 * s);
      }
      part(g, 'box', 'gold', 0, 1.17, .08, .11, .2, .47);
    } else if (type === 'walker') {
      for (const s of [-1, 1]) {
        part(g, 'box', 'dark', s * .53, .3, 0, .43, .61, .56, .1, 0, s * -.18);
        part(g, 'box', 'steel', s * .64, .11, -.12, .6, .22, .9);
        part(g, 'cylinder', 'copper', s * .53, .53, -.24, .35, .25, .35, Math.PI / 2);
      }
      part(g, 'box', 'dark', 0, 1.07, 0, 1.2, .87, .79);
      part(g, 'box', 'bone', 0, 1.18, -.42, 1.38, .65, .24, -.15);
      part(g, 'box', 'copper', 0, 1.45, -.49, 1.28, .17, .28);
      part(g, 'box', 'danger', 0, 1.7, -.11, .7, .15, .47);
      part(g, 'box', 'dark', 0, 1.68, .01, .9, .31, .55);
      part(g, 'box', 'danger', 0, 1.69, -.3, .52, .085, .06);
      for (const x of [-.4, 0, .4]) part(g, 'box', 'copper', x, 1.1, -.6, .08, .45, .08);
      part(g, 'box', 'steel', .91, 1.18, -.07, .41, .44, .96);
      part(g, 'cylinder', 'dark', .91, 1.15, -.7, .25, .72, .25, Math.PI / 2);
      part(g, 'cylinder', 'danger', .91, 1.15, -1.07, .21, .06, .21, Math.PI / 2);
    } else {
      part(g, 'cylinder', 'dark', 0, .32, 0, 1.85, .5, 1.85);
      part(g, 'box', 'copper', 0, .87, 0, 1.27, .65, .95);
      part(g, 'sphere', 'dark', 0, 1.25, -.12, 1, .7, .8);
      for (const s of [-1, 1]) {
        part(g, 'box', 'steel', s * .77, .5, 0, .4, .7, 1.4);
        part(g, 'cylinder', 'dark', s * .41, 1.33, -.67, .3, 1.2, .3, Math.PI / 2);
        part(g, 'cylinder', 'danger', s * .41, 1.33, -1.29, .22, .06, .22, Math.PI / 2);
      }
      part(g, 'sphere', 'danger', 0, 1.5, -.47, .31, .31, .17);
      part(g, 'box', 'gold', 0, 1.18, .62, .64, .25, .33);
    }
    const merged = mergeParts(g); merged.userData.type = type; enemyTemplates.set(type, merged);
  }
  const model = enemyTemplates.get(type).clone();
  model.traverse(mesh => { if (mesh.isMesh) mesh.castShadow = false; });
  return model;
}

export function dreadnoughtModel() {
  const root = new T.Group(); const body = new T.Group();
  part(body, 'box', 'dark', 0, 1.6, 0, 4.9, 2.1, 3.1);
  part(body, 'box', 'copper', 0, 2.7, .15, 3.7, .48, 2.95, -.06);
  part(body, 'box', 'steel', 0, 2, -1.55, 3.86, 1.1, .45, -.23);
  part(body, 'box', 'copper', 0, 1.3, -1.73, 2.65, .34, .32);
  part(body, 'box', 'dark', 0, 2.6, -.65, 2.1, 1.1, 1.3);
  part(body, 'box', 'danger', 0, 2.67, -1.33, 1.45, .2, .14);
  part(body, 'box', 'gold', 0, 3.2, -.42, .35, .37, 1.38);
  for (let i = -3; i <= 3; i++) {
    part(body, 'box', 'dark', i * .46, 2.98, .65, .24, .11, 1.12);
    part(body, 'box', 'amber', i * .46, 3.05, .65, .07, .06, .65);
  }
  for (const s of [-1, 1]) {
    part(body, 'box', 'copper', s * 2.7, 2.23, .02, 1.54, 1.35, 3.2, 0, 0, s * -.12);
    part(body, 'box', 'dark', s * 3.23, 2.2, -.6, .24, .72, 1.32);
    for (let i = 0; i < 5; i++) part(body, 'box', 'gold', s * 3.35, 2.19, -.99 + i * .23, .11, .48, .08);
    part(body, 'cylinder', 'steel', s * 2.7, 2.87, .23, 1.27, .15, 1.27);
    part(body, 'cylinder', 'danger', s * 2.7, 2.98, .23, .47, .12, .47);
    for (const z of [-.98, 1.1]) {
      part(body, 'cylinder', 'dark', s * 2.48, .8, z, .64, 1.7, .64, 0, 0, s * .45);
      part(body, 'box', 'steel', s * 2.83, .49, z, 1.0, .78, .92, 0, 0, s * .14);
      part(body, 'box', 'copper', s * 3.08, .14, z - .2, 1.21, .34, 1.47);
      part(body, 'box', 'danger', s * 3.08, .36, z - .8, .68, .11, .12);
    }
    part(body, 'cylinder', 'steel', s * 1.3, 1.9, 1.9, .53, 1.51, .53);
    part(body, 'cylinder', 'amber', s * 1.3, 2.77, 1.9, .32, .24, .32);
    part(body, 'box', 'bone', s * 2.7, 2.15, -1.62, .81, .61, .12);
    for (let i = 0; i < 3; i++) part(body, 'box', 'dark', s * 2.7 + (i - 1) * .2, 2.15, -1.7, .08, .42, .04, 0, 0, -.3);
  }
  const hull = mergeParts(body); root.add(hull);
  const cannons = [];
  for (const s of [-1, 1]) {
    const cannon = new T.Group(); cannon.position.set(s * 1.65, 1.75, -1.6);
    part(cannon, 'cylinder', 'dark', 0, 0, -.2, 1.05, 1.2, 1.05, Math.PI / 2);
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; part(cannon, 'cylinder', 'steel', Math.sin(a) * .32, Math.cos(a) * .32, -.9, .23, 1.8, .23, Math.PI / 2); part(cannon, 'cylinder', 'danger', Math.sin(a) * .32, Math.cos(a) * .32, -1.82, .17, .08, .17, Math.PI / 2); }
    batchStaticChildren(cannon); root.add(cannon); cannons.push(cannon);
  }
  const core = part(root, 'sphere', 'amber', 0, 1.96, -1.9, .85, .85, .4);
  root.userData = { cannons, core, hull, type: 'boss' }; root.scale.setScalar(1.3);
  return root;
}

export function animateModel(model, t, moving = false, dash = false) {
  const d = model.userData;
  if (d.type === 'ranger') {
    const speed = moving ? 13 : 2;
    d.legs.forEach((leg, i) => { leg.rotation.x = moving ? Math.sin(t * speed + i * Math.PI) * .56 : 0; });
    d.torso.position.y = 1.13 + Math.sin(t * speed * 2) * (moving ? .045 : .025);
    d.torso.rotation.x = dash ? -.35 : moving ? -.09 : 0;
    const p = d.scarf.geometry.getAttribute('position');
    for (let i = 0; i < p.count; i++) { const z = d.scarfRest[i * 3 + 2]; p.setY(i, d.scarfRest[i * 3 + 1] + Math.sin(t * 9 + z * 5) * .15 * z); p.setX(i, d.scarfRest[i * 3] + Math.cos(t * 7 + z * 3) * .17 * z); }
    p.needsUpdate = true;
  } else if (d.type === 'boss') {
    d.cannons.forEach((c, i) => c.rotation.z = t * (i ? -1 : 1) * 1.7);
    d.hull.position.y = Math.sin(t * 2) * .045;
    d.core.scale.setScalar(1 + Math.sin(t * 5) * .06);
  } else if (d.type === 'drone') model.position.y = Math.sin(t * 4 + model.id) * .12;
  else model.rotation.z = Math.sin(t * (moving ? 9 : 2) + model.id) * .035;
}
