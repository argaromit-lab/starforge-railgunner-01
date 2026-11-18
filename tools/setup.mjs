import { mkdir, copyFile } from 'node:fs/promises';
await mkdir('game/vendor', { recursive: true });
await mkdir('vendor', { recursive: true });
await copyFile('node_modules/three/build/three.module.min.js', 'game/vendor/three.min.js');
await copyFile('node_modules/three/LICENSE', 'game/vendor/THREE-LICENSE.txt');
await copyFile('best-game-01-kit/starter/vendor/makefun-game.ts', 'vendor/makefun-game.ts');
console.log('Official Three.js and unchanged dossier library staged.');
