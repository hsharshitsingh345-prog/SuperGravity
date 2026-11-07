#!/usr/bin/env node
/**
 * Supergravity CLI Binary Entry Point
 */

import { spawn } from 'node:child_process';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.resolve(__dirname, '..', 'src');

const args = process.argv.slice(2);
const firstArg = args[0];

let targetFile = 'cli.ts';

if (firstArg === 'acp') {
  targetFile = 'interfaces/acp-server.ts';
  args.shift();
} else if (firstArg === 'web' || firstArg === 'dashboard') {
  targetFile = 'interfaces/web-dashboard.ts';
  args.shift();
}

const scriptPath = path.join(srcDir, targetFile);

const child = spawn(process.execPath, ['--experimental-strip-types', scriptPath, ...args], {
  stdio: 'inherit',
  env: process.env
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});

