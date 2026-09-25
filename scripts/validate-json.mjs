#!/usr/bin/env node
// Validates Akad's JSON outputs against docs/v2/schemas/. CI runs it through
// `npm run validate:json`.
//
//   node scripts/validate-json.mjs            every mapped file in the repo
//   node scripts/validate-json.mjs <file>...  only the given files
//
// Each file is matched to exactly one schema by path. A JSON file under
// docs/v2/ that matches no rule is an error, so a new output cannot skip
// validation by accident. The schemas themselves compile in Ajv's strict
// mode first.

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const ROOT = resolve(import.meta.dirname, '..');
const SCHEMA_DIR = 'docs/v2/schemas';

const RULES = [
  { pattern: /^docs\/v2\/evidence\/runs\/[^/]+\.json$/, schema: 'run-report.schema.json' },
  { pattern: /^docs\/v2\/evidence\/[^/]+\.json$/, schema: 'evidence.schema.json' },
  { pattern: /^docs\/v2\/disclosure-map\.json$/, schema: 'disclosure-map.schema.json' },
];

const ajv = new Ajv2020({ strict: true, allErrors: true });
addFormats(ajv);

const validators = new Map();
for (const { schema } of RULES) {
  if (validators.has(schema)) continue;
  const path = resolve(ROOT, SCHEMA_DIR, schema);
  validators.set(schema, ajv.compile(JSON.parse(readFileSync(path, 'utf8'))));
}

function repoFiles() {
  return execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z', '--', 'docs/v2'], {
    cwd: ROOT,
    encoding: 'utf8',
  })
    .split('\0')
    .filter((file) => file.endsWith('.json') && !file.startsWith(`${SCHEMA_DIR}/`))
    .filter((file) => existsSync(resolve(ROOT, file)));
}

const args = process.argv.slice(2);
const files = args.length > 0 ? args.map((file) => relative(ROOT, resolve(file))) : repoFiles();

let failures = 0;
for (const file of files) {
  const rule = RULES.find(({ pattern }) => pattern.test(file));
  if (rule === undefined) {
    console.error(`${file}: no schema is mapped to this path`);
    failures += 1;
    continue;
  }
  let data;
  try {
    data = JSON.parse(readFileSync(resolve(ROOT, file), 'utf8'));
  } catch (err) {
    console.error(`${file}: not valid JSON (${err.message})`);
    failures += 1;
    continue;
  }
  const validate = validators.get(rule.schema);
  if (!validate(data)) {
    for (const error of validate.errors ?? []) {
      console.error(`${file}${error.instancePath || '/'}: ${error.message} (${rule.schema})`);
    }
    failures += 1;
  }
}

if (failures > 0) {
  console.error(`\n${failures} of ${files.length} JSON file(s) failed validation.`);
  process.exit(1);
}
console.log(`JSON validation passes: ${files.length} file(s), ${validators.size} schema(s) compiled.`);
