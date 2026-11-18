import { cpSync, mkdirSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const source = dirname(fileURLToPath(import.meta.url));
const output = resolve(process.env.MAKEFUN_OUTPUT_DIR || '/output');
mkdirSync(output, { recursive: true });
for (const folder of ['game', 'screenshots']) cpSync(join(source, folder), join(output, folder), { recursive: true });
const caps = { text_max_bytes: 163840, screenshots: { max: 4, max_bytes: 262144 }, game_max_files: 993, game_max_bytes: 50331648, game_path_max_bytes: 1000 };
const dossier = buildDossier(output, caps);
if (dossier.length >= 950000) throw new Error('Dossier exceeds the project size budget.');
writeFileSync(join(output, 'dossier.json'), dossier);
console.log(`STARFORGE dossier: ${dossier.length} bytes; ${readdirSync(join(output, 'screenshots')).length} screenshots.`);
