import * as T from './vendor/three.min.js';
import { MAT, part, mergeParts, rangerModel, enemyModel, dreadnoughtModel, animateModel } from './models.js';

export function seededRandom(seed = 8124) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

function plateTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d'); const r = seededRandom(42);
  x.fillStyle = '#34434a'; x.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 9500; i++) { const a = r() * .1; x.fillStyle = r() > .5 ? `rgba(156,163,147,${a})` : `rgba(0,5,12,${a})`; x.fillRect(r() * 512, r() * 512, r() * 5 + 1, r() * 2 + 1); }
  for (let j = 0; j < 4; j++) for (let i = 0; i < 3; i++) {
    const px = i * 171, py = j * 128; x.strokeStyle = '#14232b'; x.lineWidth = 4; x.strokeRect(px + 3, py + 3, 164, 121); x.strokeStyle = '#59656a'; x.lineWidth = 1; x.strokeRect(px + 6, py + 6, 158, 115);
    for (const dx of [12, 156]) for (const dy of [12, 113]) { x.fillStyle = '#111c23'; x.beginPath(); x.arc(px + dx, py + dy, 3, 0, 7); x.fill(); x.fillStyle = '#748082'; x.fillRect(px + dx - 1, py + dy - 2, 2, 1); }
    x.strokeStyle = '#77817b22'; x.lineWidth = 1;
    for (let k = 0; k < 12; k++) { const yy = py + 20 + r() * 90, xx = px + 17 + r() * 110; x.beginPath(); x.moveTo(xx, yy); x.lineTo(xx + 15 + r() * 30, yy - 7); x.stroke(); }
    if ((i + j) % 3 === 0) { x.fillStyle = '#b9a07733'; x.font = 'bold 13px monospace'; x.fillText('SF // 08', px + 26, py + 35); }
  }
  const tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace; tex.wrapS = tex.wrapT = T.RepeatWrapping; tex.repeat.set(6, 4); tex.anisotropy = 4; return tex;
}

function groundDecal(text, width = 512, height = 128, color = '#d9b777') {
  const c = document.createElement('canvas'); c.width = width; c.height = height; const x = c.getContext('2d');
  x.clearRect(0, 0, width, height); x.fillStyle = color; x.font = `900 ${Math.floor(height * .65)}px Arial`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, width / 2, height / 2);
  const tx = new T.CanvasTexture(c); tx.colorSpace = T.SRGBColorSpace;
  return new T.MeshBasicMaterial({ map: tx, transparent: true, opacity: .37, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
}

export class StarforgeWorld {
  constructor() {
    this.renderer = new T.WebGLRenderer({ canvas: document.querySelector('#world'), antialias: true, alpha: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = T.PCFSoftShadowMap;
    this.renderer.outputColorSpace = T.SRGBColorSpace; this.renderer.toneMapping = T.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.3;
    this.scene = new T.Scene(); this.scene.background = new T.Color(0x314659); this.scene.fog = new T.FogExp2(0x6d6660, .006);
    this.camera = new T.OrthographicCamera(-28, 28, 17.5, -17.5, .1, 180); this.baseCamera = new T.Vector3(0, 38, 31); this.camera.position.copy(this.baseCamera); this.camera.lookAt(0, 0, -1);
    this.scene.add(new T.HemisphereLight(0xbce7ff, 0x9b5834, 2.1));
    const sun = new T.DirectionalLight(0xffd8a5, 3.9); sun.position.set(-24, 31, -14); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.left = -30; sun.shadow.camera.right = 30; sun.shadow.camera.top = 26; sun.shadow.camera.bottom = -26; sun.shadow.normalBias = .035; sun.shadow.bias = -.0002; sun.shadow.camera.far = 110; this.scene.add(sun);
    const fill = new T.DirectionalLight(0x71bfff, 1.45); fill.position.set(18, 18, 12); this.scene.add(fill);
    this.buildCanyon(); this.buildViaduct();
    this.player = rangerModel(); this.scene.add(this.player);
    this.enemyMeshes = new Map(); this.boss = null;
    this.plane = new T.Plane(new T.Vector3(0, 1, 0), 0); this.raycaster = new T.Raycaster();
    this.tmpVector = new T.Vector3(); this.setupBloom();
    this.onResize = () => this.resize(); addEventListener('resize', this.onResize); this.resize();
    this.lastTime = 0;
  }
  buildCanyon() {
    const r = seededRandom(883); const canyon = new T.Group();
    const rockMats = [0x423b3e, 0x60504a, 0x95664a, 0x334652, 0x9e7454].map(color => new T.MeshStandardMaterial({ color, roughness: .93, metalness: .1 }));
    const rockGeo = new T.CylinderGeometry(1, 1.45, 1, 5, 1);
    for (let i = 0; i < 94; i++) {
      const side = i % 2 ? -1 : 1; const x = side * (21 + r() * 34), z = (r() - .5) * 110, height = 7 + r() * 18;
      const rock = new T.Mesh(rockGeo, rockMats[i % 5]); rock.position.set(x, -14 + height / 2, z); rock.scale.set(2 + r() * 5, height, 2.5 + r() * 7); rock.rotation.y = r() * 6.28; rock.castShadow = true; rock.receiveShadow = true; canyon.add(rock);
    }
    for (let i = 0; i < 18; i++) {
      const rock = new T.Mesh(rockGeo, rockMats[i % 5]); rock.position.set((r() - .5) * 120, -4 + r() * 7, -46 - r() * 40); rock.scale.set(6 + r() * 6, 7 + r() * 18, 6 + r() * 6); canyon.add(rock);
    }
    this.scene.add(mergeParts(canyon));
    this.lava = new T.ShaderMaterial({ uniforms: { uTime: { value: 0 } }, vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}', fragmentShader: `varying vec2 vUv;uniform float uTime;float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}void main(){vec2 p=vUv*vec2(45.,60.);float a=sin(p.x*.8+sin(p.y*.36+uTime*.15)*1.4);float b=sin(p.y*3.2+p.x*2.+sin(p.x*3.)-uTime*.4);float hot=smoothstep(.0,.7,a+b*.25);vec3 c=mix(vec3(.23,.075,.028),vec3(2.2,.88,.17),hot);c+=vec3(.5,.25,.06)*pow(max(0.,b),8.);gl_FragColor=vec4(c,1.);}`, side: T.DoubleSide });
    const lavaMesh = new T.Mesh(new T.PlaneGeometry(160, 170), this.lava); lavaMesh.rotation.x = -Math.PI / 2; lavaMesh.position.y = -10; this.scene.add(lavaMesh);
    const sky = new T.Mesh(new T.SphereGeometry(130, 24, 16), new T.ShaderMaterial({ side: T.BackSide, depthWrite: false, vertexShader: 'varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}', fragmentShader: 'varying vec3 vP;void main(){float h=normalize(vP).y;vec3 c=mix(vec3(.93,.57,.25),vec3(.08,.25,.46),smoothstep(-.15,.75,h));gl_FragColor=vec4(c,1.);}' }));
    this.scene.add(sky);
    const sunDisc = new T.Mesh(new T.SphereGeometry(8, 24, 16), new T.MeshBasicMaterial({ color: 0xffdf93 })); sunDisc.position.set(-56, 9, -91); this.scene.add(sunDisc);
  }
  buildViaduct() {
    const g = new T.Group();
    const floorMat = new T.MeshStandardMaterial({ color: 0x8b999b, map: plateTexture(), roughness: .85, metalness: .38 });
    part(g, 'box', MAT.dark, 0, -.75, 0, 39, 1.5, 28);
    part(g, 'box', floorMat, 0, -.12, 0, 37.5, .25, 27.5);
    const metal = new T.MeshStandardMaterial({ color: 0x637580, roughness: .66, metalness: .7 });
    for (const x of [-18.4, 18.4]) {
      part(g, 'box', MAT.copper, x, .08, 0, .52, .18, 28);
      part(g, 'box', MAT.amber, x - Math.sign(x) * .28, .13, 0, .08, .1, 28);
      for (let z = -13; z <= 13; z += 2.2) {
        part(g, 'box', metal, x, .5, z, .38, 1.0, .23);
        part(g, 'box', MAT.dark, x, .93, z + .9, .25, .17, 1.75);
        part(g, 'box', MAT.gold, x, .98, z + .85, .27, .07, 1.3);
      }
    }
    for (const x of [-9.5, 9.5]) {
      part(g, 'box', MAT.dark, x, .03, 0, 1.1, .13, 27.7);
      for (const dx of [-.37, .37]) { part(g, 'box', metal, x + dx, .17, 0, .16, .18, 27.8); part(g, 'box', MAT.amber, x + dx, .28, 0, .045, .04, 27.8); }
      for (let z = -13.5; z < 14; z += .8) part(g, 'box', MAT.copper, x, .09, z, 1.2, .13, .11);
    }
    for (let z = -14; z <= 14; z += 4.65) {
      part(g, 'box', metal, 0, -.5, z, 40.5, .9, .42);
      for (const x of [-20, 20]) {
        part(g, 'box', MAT.copper, x, -.3, z, 2.2, .5, 1.9);
        part(g, 'cylinder', MAT.dark, x, -4.2, z, 1.5, 8, 1.5);
        part(g, 'box', metal, x, -2, z, .5, 6.5, .5, 0, 0, Math.sign(x) * -.32);
        part(g, 'box', MAT.amber, x, -.02, z, 1.6, .06, .13);
      }
    }
    for (let z = -12; z <= 12; z += 3.9) {
      for (let x = -15; x <= 16; x += 6.4) {
        part(g, 'box', MAT.dark, x, .032, z, 2.9, .04, .8);
        for (let j = 0; j < 9; j++) part(g, 'box', metal, x - 1.24 + j * .31, .059, z, .085, .045, .69);
      }
    }
    for (const x of [-16.7, 16.7]) for (let z = -12; z <= 12; z += 3.3) {
      for (let i = 0; i < 4; i++) part(g, 'box', i % 2 ? MAT.dark : MAT.gold, x, .06, z + i * .25, .6, .025, .14, 0, -.5);
    }
    this.scene.add(mergeParts(g));
    this.pillars = [];
    for (const [x, z] of [[-14, -7], [13.5, -7], [-14, 7.2], [13.5, 7.2]]) {
      const p = new T.Group();
      part(p, 'cylinder', 'dark', 0, .15, 0, 2.15, .3, 2.15);
      part(p, 'cylinder', 'copper', 0, .38, 0, 1.4, .25, 1.4);
      part(p, 'cylinder', 'steel', 0, 1.9, 0, .67, 3, .67);
      for (let i = 0; i < 6; i++) { part(p, 'cylinder', 'copper', 0, 1 + i * .4, 0, 1.32, .12, 1.32); part(p, 'cylinder', 'cyan', 0, 1.09 + i * .4, 0, .85, .07, .85); }
      part(p, 'cylinder', 'dark', 0, 3.33, 0, 1.45, .3, 1.45);
      part(p, 'sphere', 'cyan', 0, 3.65, 0, .62, .75, .62);
      for (const s of [-1, 1]) part(p, 'box', 'steel', s * .6, 3.58, 0, .17, .92, .32, 0, 0, s * -.3);
      const merged = mergeParts(p); merged.position.set(x, 0, z); this.scene.add(merged); this.pillars.push({ x, z, radius: 1, mesh: merged, pillar: true, linked: false, hp: Infinity });
    }
    const decals = [['STARFORGE', 0, 9, 8, 1.2], ['08', 0, -9, 3.3, 2.5], ['HIGH VOLTAGE', -13.8, -.5, 4.7, .7]];
    for (const [text, x, z, w, h] of decals) { const d = new T.Mesh(new T.PlaneGeometry(w, h), groundDecal(text)); d.rotation.x = -Math.PI / 2; d.position.set(x, .045, z); this.scene.add(d); }
    const decor = new T.Group();
    for (const [x, z] of [[-17, 1], [17, 11], [-17, -11], [16.5, -11]]) {
      part(decor, 'box', 'dark', x, .55, z, 1.5, 1.1, 1.2); part(decor, 'box', 'copper', x, 1.13, z, 1.6, .14, 1.3);
      for (let j = 0; j < 4; j++) part(decor, 'box', 'steel', x - .52 + j * .35, .6, z - .63, .1, .6, .08);
      part(decor, 'box', 'amber', x, .87, z - .68, .62, .08, .05);
    }
    this.scene.add(mergeParts(decor));
    const r = seededRandom(398);
    const stones = new T.InstancedMesh(new T.DodecahedronGeometry(.2, 0), new T.MeshStandardMaterial({ color: 0x585453, roughness: .95 }), 150);
    const dummy = new T.Object3D();
    for (let i = 0; i < 150; i++) { dummy.position.set((r() - .5) * 35, .08, (r() - .5) * 25); dummy.rotation.set(r() * 4, r() * 4, r() * 4); dummy.scale.setScalar(.25 + r() * .8); dummy.updateMatrix(); stones.setMatrixAt(i, dummy.matrix); } stones.receiveShadow = true; this.scene.add(stones);
  }
  setupBloom() {
    this.sceneTarget = new T.WebGLRenderTarget(1280, 800, { type: T.HalfFloatType });
    this.bloomA = new T.WebGLRenderTarget(640, 400, { type: T.HalfFloatType });
    this.bloomB = new T.WebGLRenderTarget(640, 400, { type: T.HalfFloatType });
    this.postScene = new T.Scene(); this.postCamera = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const vertexShader = 'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
    this.blurMaterial = new T.ShaderMaterial({ uniforms: { tex: { value: null }, stepUV: { value: new T.Vector2(1 / 640, 0) }, threshold: { value: 1 } }, vertexShader, fragmentShader: `varying vec2 vUv;uniform sampler2D tex;uniform vec2 stepUV;uniform float threshold;vec3 sampleColor(vec2 uv){vec3 c=texture2D(tex,uv).rgb;return threshold>.5?max(c-vec3(.78),vec3(0.)):c;}void main(){vec3 c=sampleColor(vUv)*.227; c+=(sampleColor(vUv+stepUV*1.3846)+sampleColor(vUv-stepUV*1.3846))*.3162;c+=(sampleColor(vUv+stepUV*3.2307)+sampleColor(vUv-stepUV*3.2307))*.0703;gl_FragColor=vec4(c,1.);}` });
    this.composite = new T.ShaderMaterial({ uniforms: { image: { value: this.sceneTarget.texture }, bloom: { value: this.bloomA.texture } }, vertexShader, fragmentShader: `varying vec2 vUv;uniform sampler2D image;uniform sampler2D bloom;void main(){vec3 c=texture2D(image,vUv).rgb;vec3 b=texture2D(bloom,vUv).rgb;c+=b*.62;float v=1.-smoothstep(.35,.83,distance(vUv,vec2(.5)))*.22;c*=v;gl_FragColor=vec4(c,1.);#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}`.replace(';#include', ';\n#include') });
    this.quad = new T.Mesh(new T.PlaneGeometry(2, 2), this.blurMaterial); this.postScene.add(this.quad);
  }
  resize() {
    const w = innerWidth, h = innerHeight, ratio = w / h;
    this.renderer.setSize(w, h); const view = 35; this.camera.left = -view * ratio / 2; this.camera.right = view * ratio / 2; this.camera.top = view / 2; this.camera.bottom = -view / 2; this.camera.updateProjectionMatrix();
    const dpr = this.renderer.getPixelRatio(); this.sceneTarget.setSize(w * dpr, h * dpr); this.bloomA.setSize(w / 2, h / 2); this.bloomB.setSize(w / 2, h / 2);
  }
  screen(x, z, y = 1) { this.tmpVector.set(x, y, z).project(this.camera); return { x: (this.tmpVector.x + 1) * 640, y: (1 - this.tmpVector.y) * 400 }; }
  aim(clientX, clientY) {
    this.raycaster.setFromCamera(new T.Vector2(clientX / innerWidth * 2 - 1, -(clientY / innerHeight * 2 - 1)), this.camera);
    const hit = new T.Vector3(); this.raycaster.ray.intersectPlane(this.plane, hit); return { x: hit.x, z: hit.z };
  }
  sync(game, time) {
    const p = game.player; this.player.position.set(p.x, 0, p.z); this.player.rotation.y = Math.atan2(p.x - game.aim.x, p.z - game.aim.z);
    animateModel(this.player, time, p.moving, p.dashTime > 0);
    const alive = new Set();
    for (const e of game.enemies) {
      alive.add(e.id); let mesh = this.enemyMeshes.get(e.id);
      if (!mesh) { mesh = enemyModel(e.type); this.scene.add(mesh); this.enemyMeshes.set(e.id, mesh); }
      mesh.position.set(e.x, 0, e.z); mesh.rotation.y = Math.atan2(e.x - p.x, e.z - p.z);
      animateModel(mesh, time, game.mode === 'playing'); mesh.scale.setScalar(Math.min(1, e.age * 3));
    }
    for (const [id, m] of this.enemyMeshes) if (!alive.has(id)) { this.scene.remove(m); this.enemyMeshes.delete(id); }
    if (game.boss && !this.boss) { this.boss = dreadnoughtModel(); this.scene.add(this.boss); }
    if (this.boss) { this.boss.visible = !!game.boss; if (game.boss) { this.boss.position.set(game.boss.x, 0, game.boss.z); this.boss.rotation.y = Math.sin(time * .3) * .1; animateModel(this.boss, time); } }
    this.lava.uniforms.uTime.value = time;
    const shake = game.reducedMotion ? 0 : game.shake * game.shake;
    this.camera.position.copy(this.baseCamera); this.camera.position.x += Math.sin(time * 137) * shake * .42; this.camera.position.z += Math.cos(time * 101) * shake * .3; this.camera.lookAt(0, 0, -1);
  }
  render() {
    const r = this.renderer; r.info.autoReset = false; r.info.reset();
    r.setRenderTarget(this.sceneTarget); r.render(this.scene, this.camera);
    this.quad.material = this.blurMaterial; const u = this.blurMaterial.uniforms;
    u.tex.value = this.sceneTarget.texture; u.stepUV.value.set(1.7 / this.bloomA.width, 0); u.threshold.value = 1; r.setRenderTarget(this.bloomA); r.render(this.postScene, this.postCamera);
    u.tex.value = this.bloomA.texture; u.stepUV.value.set(0, 1.7 / this.bloomA.height); u.threshold.value = 0; r.setRenderTarget(this.bloomB); r.render(this.postScene, this.postCamera);
    u.tex.value = this.bloomB.texture; u.stepUV.value.set(3 / this.bloomA.width, 0); r.setRenderTarget(this.bloomA); r.render(this.postScene, this.postCamera);
    this.quad.material = this.composite; r.setRenderTarget(null); r.render(this.postScene, this.postCamera);
  }
  diagnostics() { const i = this.renderer.info; return { renderer: 'Three.js WebGL2 · custom offscreen bloom', calls: i.render.calls, triangles: i.render.triangles, geometries: i.memory.geometries, textures: i.memory.textures, postPasses: 4, shadowLights: 1, shadowMapSize: 2048, pixelRatio: this.renderer.getPixelRatio(), enemies: this.enemyMeshes.size }; }
}
