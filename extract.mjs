// Step 1: extract MarkText's app.asar to ./mt-extracted
// Usage: node extract.mjs [path/to/app.asar]
//   default: %LOCALAPPDATA%\Programs\marktext\resources\app.asar  (or env MARKTEXT_ASAR)
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require2 = createRequire(new URL('./package.json', import.meta.url));
const asar = require2('@electron/asar');

export const targetAsar =
  process.argv[2] ||
  process.env.MARKTEXT_ASAR ||
  path.join(process.env.LOCALAPPDATA, 'Programs', 'marktext', 'resources', 'app.asar');

if (!fs.existsSync(targetAsar)) {
  console.error('app.asar not found: ' + targetAsar);
  console.error('Pass the path explicitly: node extract.mjs "C:\\Program Files\\MarkText\\resources\\app.asar"');
  process.exit(1);
}
if (fs.existsSync('mt-extracted')) fs.rmSync('mt-extracted', { recursive: true, force: true });
console.log('extracting', targetAsar, '-> mt-extracted ...');
asar.extractAll(targetAsar, 'mt-extracted');
console.log('done. files:', asar.listPackage(targetAsar).length);
