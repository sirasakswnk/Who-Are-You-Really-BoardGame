import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

const root = fileURLToPath(new URL('../', import.meta.url));
const sourcePath = path.join(root, 'assets/roles/hidden-identities-original.png');
const outputPath = path.join(root, 'public/images/roles');
const source = await readFile(sourcePath);
const metadata = await sharp(source).metadata();
if (metadata.width !== 1536 || metadata.height !== 1024) {
  throw new Error('The role sheet must be the original 1536 × 1024 PNG.');
}

// Bounds stop above the English captions and retain the umbrella and ghost glow.
const crops = {
  alien: { left: 0, top: 4, width: 512, height: 448 },
  spy: { left: 512, top: 4, width: 512, height: 448 },
  vampire: { left: 1024, top: 4, width: 512, height: 448 },
  time_traveler: { left: 0, top: 492, width: 528, height: 464 },
  thief: { left: 528, top: 492, width: 496, height: 464 },
  ghost: { left: 1024, top: 492, width: 512, height: 464 },
};
const background = '#FCF8EE';
await mkdir(outputPath, { recursive: true });
for (const [role, bounds] of Object.entries(crops)) {
  await sharp(source)
    .extract(bounds)
    .resize(480, 480, { fit: 'contain', background })
    .extend({ top: 16, bottom: 16, left: 16, right: 16, background })
    .webp({ lossless: true })
    .toFile(path.join(outputPath, `${role}.webp`));
}
await writeFile(path.join(root, 'assets/roles/crops.json'), `${JSON.stringify({
  source: 'hidden-identities-original.png',
  sha256: createHash('sha256').update(source).digest('hex'),
  sourceSize: [1536, 1024],
  outputSize: [512, 512],
  contentBox: [480, 480],
  padding: 16,
  background,
  crops,
}, null, 2)}\n`);
console.log(`Prepared ${Object.keys(crops).length} role portraits at 512 × 512.`);
