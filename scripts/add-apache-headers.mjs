#!/usr/bin/env node

import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();

const header = `/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

`;

const roots = [
  'packages',
  'apps/api/src',
  'apps/telegram-bot/src',
  'apps/worker/src',
  'apps/web/lib',
];

const excludedSegments = new Set([
  '__tests__',
  'node_modules',
  '.next',
  'dist',
  'build',
  'coverage',
  'generated',
]);

function walk(dir, files = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return files;
  }

  for (const entry of entries) {
    const path = join(dir, entry);
    const rel = relative(root, path);
    if (rel.split('/').some((segment) => excludedSegments.has(segment))) {
      continue;
    }

    const stats = statSync(path);
    if (stats.isDirectory()) {
      walk(path, files);
      continue;
    }

    if (!stats.isFile() || !/\.(ts|tsx)$/.test(entry)) {
      continue;
    }
    if (/\.(test|spec)\.(ts|tsx)$/.test(entry)) {
      continue;
    }

    files.push(path);
  }

  return files;
}

function isAllowed(path) {
  const rel = relative(root, path).replaceAll('\\', '/');
  if (rel.startsWith('packages/') && rel.includes('/src/')) return true;
  if (rel.startsWith('apps/') && rel.includes('/src/')) return true;
  if (rel.startsWith('apps/web/lib/')) return true;
  return false;
}

let changed = 0;
for (const dir of roots.map((item) => join(root, item))) {
  for (const file of walk(dir)) {
    if (!isAllowed(file)) continue;

    const source = readFileSync(file, 'utf8');
    if (source.includes('Licensed under the Apache License, Version 2.0')) {
      continue;
    }
    if (source.startsWith('#!')) {
      const newline = source.indexOf('\n');
      const shebang = source.slice(0, newline + 1);
      const body = source.slice(newline + 1);
      writeFileSync(file, `${shebang}${header}${body}`);
    } else {
      writeFileSync(file, `${header}${source}`);
    }
    changed += 1;
  }
}

console.log(`Added Apache 2.0 headers to ${changed} source file(s).`);
