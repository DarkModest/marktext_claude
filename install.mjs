// Step 4: install the packed theme into MarkText (with backup).
// Usage: node install.mjs [path/to/app.asar]   (default: installed MarkText, or env MARKTEXT_ASAR)
// - Creates <asar>.bak-claude next to the original on first run (never overwrites a backup).
// - Copies newbuild/app.asar, then all unpacked natives; busy files are hash-checked instead.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
const require2 = createRequire(new URL('./package.json', import.meta.url));
const asar = require2('@electron/asar');

const TARGET =
  process.argv[2] ||
  process.env.MARKTEXT_ASAR ||
  path.join(process.env.LOCALAPPDATA, 'Programs', 'marktext', 'resources', 'app.asar');
const SRC = 'newbuild/app.asar';

if (!fs.existsSync(SRC)) { console.error('missing ' + SRC + ' — run repack-verify.mjs first'); process.exit(1); }

// refuse to install while MarkText is running (override for testing: ALLOW_RUNNING=1)
if (process.env.ALLOW_RUNNING !== '1') {
  try {
    const out = execFileSync('tasklist', { encoding: 'utf8' });
    if (/marktext\.exe/i.test(out)) {
      console.error('MarkText is running. Close it first (save your documents).');
      process.exit(1);
    }
  } catch (e) {
    if (e.status !== undefined && !e.stderr) { /* tasklist missing on non-windows: ignore */ }
  }
}

// 1. backup (first run only; never back up an already-patched asar as "original")
const bak = TARGET + '.bak-claude';
if (fs.existsSync(bak)) {
  console.log('backup exists, keeping it:', bak);
} else {
  let alreadyPatched = false;
  try {
    const entries = asar.listPackage(TARGET)
      .map((p) => p.replace(/\\/g, '/'))
      .filter((p) => p.endsWith('out/main/index.js'));
    if (entries.length) {
      const buf = asar.extractFile(TARGET, entries[0].replace(/^\//, '').replace(/\//g, '\\'));
      alreadyPatched = buf.toString('utf8').includes('["claude", "#faf9f5"]');
    }
  } catch {}
  if (alreadyPatched) {
    console.log('target asar already contains the claude patch and no original backup exists — skip backup creation.');
  } else {
    fs.copyFileSync(TARGET, bak);
    console.log('backup created:', bak);
  }
}

// 2. swap asar
fs.copyFileSync(SRC, TARGET);
console.log('installed:', TARGET);

// 3. unpacked natives
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(d + '/' + e.name) : [d + '/' + e.name]);
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
let copied = 0, skipped = 0, conflicts = 0;
for (const src of walk('newbuild/app.asar.unpacked')) {
  const rel = src.split('app.asar.unpacked/')[1];
  const dst = path.join(TARGET + '.unpacked', rel);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  try {
    fs.copyFileSync(src, dst);
    copied++;
  } catch (e) {
    // busy (still loaded by a running app): fine if identical
    if (fs.existsSync(dst) && sha(src) === sha(dst)) { skipped++; continue; }
    console.error('CONFLICT (busy AND differs — resolve manually):', rel, e.message);
    conflicts++;
  }
}
console.log(`natives: copied=${copied} identical-skip=${skipped} conflicts=${conflicts}`);
if (conflicts) process.exit(1);
console.log('INSTALL OK — start MarkText and pick Theme -> Claude (menu) or Preferences -> Theme.');
console.log('Rollback: copy "' + bak + '" over "' + TARGET + '".');
