import { createRequire } from 'node:module';
import { compileChecks } from './compile-checks.mjs';
compileChecks();
const require = createRequire(import.meta.url);
const { inspectAssets } = require('../.qa/unit/src/lib/animation/assetValidation.js');
const inventory = await inspectAssets();
console.log(JSON.stringify(inventory, null, 2));
if (process.argv.includes('--require-layers') && inventory.mode !== 'layered') process.exitCode = 1;
