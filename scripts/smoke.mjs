import { access, readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const expected = [
  'dist/index.html',
  'dist/models/the-braider/the-braider-6in.glb',
  'dist/models/the-braider/the-braider-6in-poster.jpg',
  'dist/models/the-braider/the-braider-6in.usdz',
];

await Promise.all(expected.map((file) => access(resolve(root, file))));
const html = await readFile(resolve(root, 'dist/index.html'), 'utf8');
if (!html.includes('Collector\'s Room')) {
  throw new Error('Built index is missing the Collector\'s Room title.');
}

const model = await stat(resolve(root, 'dist/models/the-braider/the-braider-6in.glb'));
if (model.size < 100_000) {
  throw new Error('Braider GLB appears incomplete.');
}

console.log(JSON.stringify({ level: 'info', event: 'smoke_passed', files: expected.length }));
