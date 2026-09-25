#!/usr/bin/env node
// Entry point. The only module that reads process.env: it loads the
// automation seeds from .env.automation into the environment, then hands a
// snapshot to main(). Seeds never travel on the command line.
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { main } from './main.js';

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = resolve(packageDir, '../..');
const envFile = resolve(repoRoot, '.env.automation');

if (existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

process.exitCode = await main(process.argv.slice(2), {
  sink: {
    stdout: (text) => process.stdout.write(text),
    stderr: (text) => process.stderr.write(text),
  },
  env: { ...process.env },
  paths: {
    repoRoot,
    envFile,
    configFile: resolve(packageDir, 'akad.config.json'),
    reportsDir: resolve(repoRoot, 'docs/v2/evidence/runs'),
  },
});
