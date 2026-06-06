// Copies the vendored ffmpeg.wasm cores from node_modules into public/ffmpeg/ so they
// are served same-origin (required under COEP `require-corp`). Run by predev/prebuild.
// Output is gitignored; nothing here is committed.

import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

function findIn(pkg, file) {
  for (const sub of ['dist/esm', 'dist/umd', 'dist']) {
    const candidate = `node_modules/${pkg}/${sub}/${file}`;
    if (existsSync(candidate)) return candidate;
  }
  throw new Error(`Could not find ${file} in ${pkg} — is it installed? (run \`npm install\`)`);
}

function copy(pkg, file, destDir) {
  const from = findIn(pkg, file);
  const to = `${destDir}/${file}`;
  mkdirSync(dirname(to), { recursive: true });
  cpSync(from, to);
  console.log(`  ${from} -> ${to}`);
}

console.log('Copying ffmpeg cores into public/ffmpeg/ …');
copy('@ffmpeg/core-mt', 'ffmpeg-core.js', 'public/ffmpeg/core-mt');
copy('@ffmpeg/core-mt', 'ffmpeg-core.wasm', 'public/ffmpeg/core-mt');
copy('@ffmpeg/core-mt', 'ffmpeg-core.worker.js', 'public/ffmpeg/core-mt');
copy('@ffmpeg/core', 'ffmpeg-core.js', 'public/ffmpeg/core-st');
copy('@ffmpeg/core', 'ffmpeg-core.wasm', 'public/ffmpeg/core-st');
console.log('Done.');
