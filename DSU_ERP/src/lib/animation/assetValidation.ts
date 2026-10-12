import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { ARCHITECTURAL_LAYERS, type ArchitecturalLayer, type AssetInventory } from '../../config/architecturalLayers';
const directory = '/assets/college/';
const safeFilename = (value: unknown): value is string => typeof value === 'string' && /^[a-zA-Z0-9_-]+\.(png|webp)$/.test(value);
export async function inspectAssets(publicRoot = path.join(process.cwd(), 'public')): Promise<AssetInventory> {
  const issues: string[] = [];
  const exists = async (name: string) => { try { await access(path.join(publicRoot, directory, name)); return true; } catch { return false; } };
  const base: AssetInventory = { mode: 'placeholder', illustration: null, illustrationKind: null, assembled: null, width: 1000, height: 800, layers: [], issues };
  // One flat image is displayed faithfully; never infer matching projections from filenames.
  for (const [name, kind] of [['grand-exploded-reference.png', 'exploded'], ['exploded-reference.png', 'exploded'], ['assembled.png', 'assembled']] as const) {
    if (!await exists(name)) continue;
    try {
      const meta = await sharp(path.join(publicRoot, directory, name)).metadata();
      if (!meta.width || !meta.height) throw new Error('Missing image dimensions');
      base.mode = 'illustration'; base.illustration = directory + name; base.illustrationKind = kind;
      base.width = meta.width; base.height = meta.height; break;
    } catch { issues.push(name + ' is not a readable image.'); }
  }
  if (base.illustrationKind === 'exploded') {
    // Optional responsive derivatives must match the original registration exactly.
    const stem = path.basename(base.illustration!, '.png');
    const medium = stem + '-2x.webp';
    const large = stem + '-4x.webp';
    if (await exists(medium) && await exists(large)) {
      try {
        const [a, b] = await Promise.all([medium, large].map(file => sharp(path.join(publicRoot, directory, file)).metadata()));
        if (a.width !== base.width * 2 || a.height !== base.height * 2 || b.width !== base.width * 4 || b.height !== base.height * 4) throw new Error('Enhanced illustration dimensions do not match the source registration.');
        base.enhancedIllustration = { src: directory + medium, largeSrc: directory + large };
      } catch { issues.push('Enhanced illustration is invalid; using the original image.'); }
    }
  }
  if (!await exists('manifest.json')) { issues.push('No reviewed layer manifest. Independent architecture animation is disabled.'); return base; }
  try {
    const manifest = JSON.parse(await readFile(path.join(publicRoot, directory, 'manifest.json'), 'utf8'));
    if (manifest.registrationReviewed !== true || manifest.referenceWidth !== 1000 || manifest.referenceHeight !== 800) throw new Error('Registration must be reviewed in the 1000 × 800 reference space.');
    if (!safeFilename(manifest.assembled)) throw new Error('A matching assembled PNG or WebP is required.');
    const assembledMeta = await sharp(path.join(publicRoot, directory, manifest.assembled)).metadata();
    if (!assembledMeta.width || !assembledMeta.height || assembledMeta.width / assembledMeta.height !== 1.25) throw new Error('Artwork canvas must share the 1000:800 reference aspect ratio.');
    if (!Array.isArray(manifest.layers) || manifest.layers.length !== ARCHITECTURAL_LAYERS.length) throw new Error('Five complete independent architectural layers are required.');
    const layers: ArchitecturalLayer[] = [];
    for (const defaults of ARCHITECTURAL_LAYERS) {
      const item = manifest.layers.find((layer: { id: string }) => layer.id === defaults.id);
      if (!item || !safeFilename(item.file)) throw new Error('Missing or invalid layer: ' + defaults.id);
      const artwork = sharp(path.join(publicRoot, directory, item.file));
      const meta = await artwork.metadata();
      if (meta.width !== assembledMeta.width || meta.height !== assembledMeta.height || !meta.hasAlpha) throw new Error(item.file + ' must have transparency and the same full-canvas dimensions as assembled.');
      const stats = await artwork.stats();
      if (stats.channels[stats.channels.length - 1].min === 255) throw new Error(item.file + ' has no transparent pixels.');
      if (!Array.isArray(item.anchors) || item.anchors.length < 2) throw new Error(item.file + ' requires at least two reviewed alignment anchors.');
      const ids = new Set<string>();
      for (const anchor of item.anchors) {
        if (typeof anchor.id !== 'string' || !/^[a-z0-9-]+$/.test(anchor.id) || ids.has(anchor.id) || !Number.isFinite(anchor.x) || !Number.isFinite(anchor.y) || anchor.x < 0 || anchor.x > 1000 || anchor.y < 0 || anchor.y > 800) throw new Error('Invalid alignment anchors in ' + item.file);
        ids.add(anchor.id);
      }
      if (!Number.isFinite(item.explodedY) || Math.abs(item.explodedY) > 250) throw new Error('Provide a reviewed explodedY between -250 and 250 for ' + item.file);
      layers.push({ ...defaults, src: directory + item.file, exploded: { x: 0, y: item.explodedY }, anchors: item.anchors });
    }
    for (let index = 1; index < layers.length; index++) {
      for (const anchor of layers[index].anchors) {
        const corresponding = layers[index - 1].anchors.find(a => a.id === anchor.id);
        if (!corresponding || Math.abs(corresponding.x - anchor.x) > .5) throw new Error('Shared vertical anchors must match across every layer.');
      }
    }
    return { ...base, mode: 'layered', assembled: directory + manifest.assembled, width: assembledMeta.width, height: assembledMeta.height, layers };
  } catch (error) { issues.push(error instanceof Error ? error.message : 'Invalid asset manifest'); return base; }
}
