import sharp from 'sharp';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

// User-approved deterministic upscale. No generative reconstruction or new geometry.
const directory = path.join(process.cwd(), 'public', 'assets', 'college');
const basename = process.argv[2] ?? 'exploded-reference';
if (!/^[a-z0-9-]+$/.test(basename)) throw new Error('Use a local asset basename.');
const input = await readFile(path.join(directory, basename + '.png'));
const source = await sharp(input).metadata();
const outputs = [];
for (const scale of [2, 4]) {
  const file = `${basename}-${scale}x.webp`;
  const info = await sharp(input)
    .resize(source.width * scale, source.height * scale, { kernel: 'lanczos3' })
    .sharpen({ sigma: scale * .32, m1: .65, m2: 1.8 })
    .webp({ quality: 96, effort: 6, smartSubsample: true })
    .toFile(path.join(directory, file));
  outputs.push({ file, scale, width: info.width, height: info.height, bytes: info.size });
}
const manifest = {
  original: basename + '.png',
  originalSha256: createHash('sha256').update(input).digest('hex'),
  method: 'Lanczos3 interpolation with restrained edge sharpening; no new architectural detail invented.',
  outputs,
};
await writeFile(path.join(directory, basename === 'exploded-reference' ? 'quality-manifest.json' : basename + '-quality.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify(manifest, null, 2));
