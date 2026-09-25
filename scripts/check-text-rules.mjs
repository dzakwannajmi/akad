#!/usr/bin/env node
// Repo text rules that markdownlint does not cover. CI runs this file
// through `npm run lint:text`; run the same command locally.
//
// 1. Markdown carries no em dash (U+2014). docs/risein/ is an archive and
//    is exempt.
// 2. Every cast to `any` in TypeScript or JavaScript sits at a library
//    interop boundary and says why on the same line:
//
//      const x = (lib as any).fn(); // interop: <library, version, reason>
//
// Both rules check tracked files plus untracked files that .gitignore does
// not exclude, so a new file fails locally before it is committed.
// Compiler output synced by scripts/sync-contract-artifacts.sh is skipped.

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const EM_DASH = '\u2014';
// The [ ] keeps this line from matching its own rule.
const ANY_CAST = /\bas[ ]any\b/;
const INTEROP_TAG = '// interop:';
const CODE_FILE = /\.(ts|tsx|mts|cts|js|jsx|mjs|cjs)$/;
const SKIPPED_DIRS = [
  'docs/risein/',
  'contracts/managed/',
  'frontend/lib/contracts/',
  'frontend/public/contracts/',
  'packages/cli/contracts/',
];

const files = execFileSync(
  'git',
  ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
  { encoding: 'utf8' }
)
  .split('\0')
  .filter((file) => file && existsSync(file))
  .filter((file) => !SKIPPED_DIRS.some((dir) => file.startsWith(dir)));

const violations = [];
let checked = 0;

function check(file, isViolation, message) {
  checked += 1;
  readFileSync(file, 'utf8')
    .split('\n')
    .forEach((line, index) => {
      if (isViolation(line)) violations.push(`${file}:${index + 1}: ${message}`);
    });
}

for (const file of files) {
  if (file.endsWith('.md')) {
    check(
      file,
      (line) => line.includes(EM_DASH),
      'em dash (U+2014); use a comma, colon, period or parentheses'
    );
  } else if (CODE_FILE.test(file)) {
    check(
      file,
      (line) => ANY_CAST.test(line) && !line.includes(INTEROP_TAG),
      'cast to any without a same-line "// interop: <reason>" comment'
    );
  }
}

if (violations.length > 0) {
  console.error(violations.join('\n'));
  console.error(`\n${violations.length} violation(s) in ${checked} checked files.`);
  process.exit(1);
}
console.log(`Text rules pass: ${checked} files checked.`);
