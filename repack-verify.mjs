// Step 3: syntax-check patched bundles, repack app.asar, verify integrity + patches.
// Usage: node repack-verify.mjs   (run from kit dir, after extract.mjs + build-claude-themes.mjs)
// env MARKTEXT_ASAR: path of the asar used as baseline (default: installed MarkText)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
const require2 = createRequire(new URL('./package.json', import.meta.url));
const asar = require2('@electron/asar');

const ORIG =
  process.env.MARKTEXT_ASAR ||
  path.join(process.env.LOCALAPPDATA, 'Programs', 'marktext', 'resources', 'app.asar');
const OUT = 'newbuild/app.asar';

// locate patched renderer bundle
const assetsDir = 'mt-extracted/out/renderer/assets';
let REN = null;
for (const f of fs.readdirSync(assetsDir)) {
  if (!f.endsWith('.js')) continue;
  const p = assetsDir + '/' + f;
  const s = fs.readFileSync(p, 'utf8');
  if (s.includes('claude_theme_default$1') && s.includes('var addThemeStyle')) { REN = p; break; }
}
if (!REN) throw new Error('patched renderer bundle not found — run build-claude-themes.mjs first');
const MAIN = 'mt-extracted/out/main/index.js';

// 1. syntax check
for (const f of [REN, MAIN]) {
  fs.copyFileSync(f, 'temp-syntax-check.mjs');
  try {
    execFileSync('node', ['--check', 'temp-syntax-check.mjs'], { stdio: 'pipe' });
    console.log('syntax OK:', f);
  } catch (e) {
    console.error('SYNTAX ERROR in', f, '\n', e.stderr?.toString?.() || e.message);
    process.exit(1);
  }
}
fs.rmSync('temp-syntax-check.mjs', { force: true });

// 2. repack. NOTE: on Windows asar matches `unpack` globs against absolute backslash
//    paths with matchBase:true, so only basename globs work — `*.{node,exe}` unpacks
//    the native modules (ced/keytar/native-keymap) and rg.exe, which is exactly what
//    must stay unpacked. Slash-style globs silently match nothing.
if (fs.existsSync('newbuild')) fs.rmSync('newbuild', { recursive: true, force: true });
fs.mkdirSync('newbuild', { recursive: true });
await asar.createPackageWithOptions('mt-extracted', OUT, { unpack: '*.{node,exe}' });
console.log('packed:', OUT, fs.statSync(OUT).size, 'bytes');

// 3. file list identical to baseline
const origList = asar.listPackage(ORIG).sort();
const newList = asar.listPackage(OUT).sort();
const o = new Set(origList), n = new Set(newList);
const missing = origList.filter((x) => !n.has(x));
const added = newList.filter((x) => !o.has(x));
console.log('file-list diff vs baseline: missing=', missing.length, 'added=', added.length);
if (missing.length || added.length) {
  if (missing.length) console.log('MISSING:', missing.slice(0, 10));
  if (added.length) console.log('ADDED:', added.slice(0, 10));
  process.exit(1);
}

// 4. all patches present in the packed file
const bs = (p) => p.replace(/\//g, '\\');
const mainOut = asar.extractFile(OUT, bs('out/main/index.js')).toString('utf8');
const renPacked = asar.extractFile(OUT, bs(path.relative('mt-extracted', REN))).toString('utf8');
const checks = [
  ['main bg map claude', mainOut.includes('["claude", "#faf9f5"]')],
  ['main bg map claude-dark', mainOut.includes('["claude-dark", "#262624"]')],
  ['main LIGHT_THEMES', mainOut.includes('["claudeLight", "claude"]')],
  ['main DARK_THEMES', mainOut.includes('["claudeDark", "claude-dark"]')],
  ['main railscasts', mainOut.includes('Object.freeze([\n\t"dark",\n\t"claude-dark",')],
  ['ren theme defs', renPacked.includes('var claude_theme_default$1 =')],
  ['ren fn claude', renPacked.includes('var claude = () =>')],
  ['ren fn claudeDark', renPacked.includes('var claudeDark = () =>')],
  ['ren switch claude', renPacked.includes('case "claude": themeStyleEle.innerHTML = patchTheme(claude());')],
  ['ren switch claude-dark', renPacked.includes('case "claude-dark": themeStyleEle.innerHTML = patchTheme(claudeDark());')],
  ['ren prefs list', renPacked.includes('{ name: "claude" },') && renPacked.includes('{ name: "claude-dark" },')],
  // content checks: catch a structurally valid but STALE (old-palette) theme
  ['theme rev is current (>=2)', Number((renPacked.match(/var claudeThemeRev = (\d+);/) || [1])[1]) >= 2],
  ['light body text is solid ink', renPacked.includes('--editorColor: rgba(20, 20, 19, 1)')],
  ['dark strong is salmon', renPacked.includes('--strongColor: #e6987d')],
  ['light prism palette applied', renPacked.includes('color: #8100c2')],
  ['light inline code rule', renPacked.includes('> code.mu-code {')],
  ['i18n en', asar.extractFile(OUT, bs('static/locales/en.json')).toString('utf8').includes('"claudeLight": "Claude"')],
  ['i18n zh-CN', asar.extractFile(OUT, bs('static/locales/zh-CN.json')).toString('utf8').includes('Claude 浅色')],
];
let bad = 0;
for (const [label, ok] of checks) { console.log(ok ? 'PASS' : 'FAIL', label); if (!ok) bad++; }
if (bad) process.exit(1);

// 5. every native module / executable that was unpacked in the baseline must be unpacked in the new asar
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(d + '/' + e.name) : [d + '/' + e.name]);
const origUnpackedDir = ORIG + '.unpacked';
const mustUnpack = fs.existsSync(origUnpackedDir)
  ? walk(origUnpackedDir).map((x) => x.split('app.asar.unpacked/')[1]).filter((p) => /\.(node|exe)$/.test(p))
  : [];
const newUnpackedDir = 'newbuild/app.asar.unpacked';
const newUnpacked = fs.existsSync(newUnpackedDir)
  ? walk(newUnpackedDir).map((x) => x.split('app.asar.unpacked/')[1])
  : [];
const nn = new Set(newUnpacked);
const miss2 = mustUnpack.filter((p) => !nn.has(p));
console.log('must-unpack natives:', mustUnpack.length, '| new unpacked:', newUnpacked.length, '| missing:', miss2.length);
if (miss2.length) { console.log('MISSING NATIVES:', miss2); process.exit(1); }
console.log('ALL VERIFICATION PASSED');
