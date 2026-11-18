/** Rebuild the GNR8-owned Sandbox entry without modifying native Stacki source. */
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const require = createRequire(resolve(root, 'apps/platform/package.json'));
const { build } = require('esbuild');
await build({
  entryPoints: [resolve(root, 'apps/platform/gnr8/stacki/stacki-sandbox-entry.ts')],
  outfile: resolve(root, 'apps/platform/gnr8/stacki/stacki-native-ai-entry.mjs'),
  bundle: true, platform: 'node', format: 'esm', target: 'node26',
  banner: { js: "import {createRequire as gnr8CreateRequire} from 'node:module';const require=gnr8CreateRequire(import.meta.url);" },
});
