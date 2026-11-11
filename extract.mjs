// Step 1: extract MarkText's app.asar to ./mt-extracted
// Usage: node extract.mjs [path/to/app.asar]
//   default: %LOCALAPPDATA%\Programs\marktext\resources\app.asar  (or env MARKTEXT_ASAR)
//
// If the target is ALREADY PATCHED with a previous claude theme, this script
// automatically falls back to <target>.bak-claude (the stock backup created by
// install.mjs on first install), so re-installs always start from a clean tree.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require2 = createRequire(new URL('./package.json', import.meta.url));
const asar = require2('@electron/asar');

const bs = (p) => p.replace(/\//g, '\\').replace(/^\\/, '');
const PATCH_MARKER = '["claude", "#faf9f5"]';

function listNormalized(asarPath) {
  return asar.listPackage(asarPath).map((p) => p.replace(/\\/g, '/'));
}

function isPatched(asarPath) {
  try {
    const entries = listNormalized(asarPath);
    const main = entries.find((p) => p.endsWith('/out/main/index.js'));
    if (!main) return false;
    const buf = asar.extractFile(asarPath, bs(main));
    return buf.toString('utf8').includes(PATCH_MARKER);
  } catch {
    return false;
  }
}

function patchRev(asarPath) {
  try {
    const entries = listNormalized(asarPath);
    const ren = entries.find((p) => /\/out\/renderer\/assets\/index-[^/]+\.js$/.test(p));
    if (!ren) return null;
    const s = asar.extractFile(asarPath, bs(ren)).toString('utf8');
    const m = s.match(/var claudeThemeRev = (\d+);/);
    // patched without a rev marker = original (rev 1) patch
    return m ? Number(m[1]) : 1;
  } catch {
    return null;
  }
}

let targetAsar =
  process.argv[2] ||
  process.env.MARKTEXT_ASAR ||
  path.join(process.env.LOCALAPPDATA, 'Programs', 'marktext', 'resources', 'app.asar');
let mirroredUnpacked = null;

if (!fs.existsSync(targetAsar)) {
  console.error('app.asar not found: ' + targetAsar);
  console.error('Pass the path explicitly: node extract.mjs "C:\\Program Files\\MarkText\\resources\\app.asar"');
  process.exit(1);
}

// Never extract from an already-patched asar: the build step would skip and you
// would silently repack the OLD theme. Fall back to the stock backup instead.
if (isPatched(targetAsar)) {
  const rev = patchRev(targetAsar);
  console.log(`note: target asar is already patched (claude theme rev ${rev == null ? 'unknown' : rev}).`);
  const bak = targetAsar + '.bak-claude';
  if (fs.existsSync(bak) && !isPatched(bak)) {
    console.log('using the stock backup created on first install: ' + bak);
    // asar.extractAll resolves unpacked payload from "<archive>.unpacked";
    // the backup has no sibling unpacked dir, so mirror the live one before extracting.
    const liveUnpacked = targetAsar + '.unpacked';
    const bakUnpacked = bak + '.unpacked';
    if (fs.existsSync(liveUnpacked)) {
      fs.rmSync(bakUnpacked, { recursive: true, force: true });
      fs.cpSync(liveUnpacked, bakUnpacked, { recursive: true });
      mirroredUnpacked = bakUnpacked;
    } else {
      console.warn('warning: ' + liveUnpacked + ' not found; native modules will be empty in the extracted tree.');
    }
    targetAsar = bak;
  } else if (fs.existsSync(bak)) {
    console.error('backup exists but is ALSO patched: ' + bak);
    console.error('Reinstall MarkText to restore a stock app.asar, then re-run.');
    process.exit(1);
  } else {
    console.error('no stock backup found (' + bak + ').');
    console.error('Reinstall MarkText (or restore a stock app.asar), then re-run.');
    process.exit(1);
  }
}

if (fs.existsSync('mt-extracted')) fs.rmSync('mt-extracted', { recursive: true, force: true });
console.log('extracting', targetAsar, '-> mt-extracted ...');
try {
  asar.extractAll(targetAsar, 'mt-extracted');
} finally {
  if (mirroredUnpacked) fs.rmSync(mirroredUnpacked, { recursive: true, force: true });
}
console.log('done. files:', asar.listPackage(targetAsar).length);