/**
 * Supergravity Verification Engine
 * Continuous automated syntax, linting, and regression testing with auto-rollback
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { spawn } from 'node:child_process';
import type { ToolExecutionContext, ToolExecutionResult } from '../core/types.ts';

export async function verifySyntaxTool(
  args: { filePath: string },
  ctx: ToolExecutionContext
): Promise<ToolExecutionResult> {
  const fullPath = path.resolve(ctx.workspaceRoot, args.filePath);
  const ext = path.extname(fullPath).toLowerCase();

  try {
    const content = await fs.readFile(fullPath, 'utf8');

    if (ext === '.json') {
      try {
        JSON.parse(content);
        return { output: `[VERIFIED] JSON syntax in ${args.filePath} is valid.`, isError: false };
      } catch (err: any) {
        return { output: `[SYNTAX ERROR] Invalid JSON in ${args.filePath}: ${err.message}`, isError: true };
      }
    }

    if (ext === '.js' || ext === '.mjs') {
      return new Promise((resolve) => {
        const child = spawn(process.execPath, ['--check', fullPath]);
        let errStr = '';
        child.stderr.on('data', d => errStr += d.toString());
        child.on('close', code => {
          if (code === 0) {
            resolve({ output: `[VERIFIED] JavaScript syntax in ${args.filePath} is valid.`, isError: false });
          } else {
            resolve({ output: `[SYNTAX ERROR] JS check failed for ${args.filePath}:\n${errStr}`, isError: true });
          }
        });
      });
    }

    if (ext === '.py') {
      return new Promise((resolve) => {
        const child = spawn('python', ['-m', 'py_compile', fullPath]);
        let errStr = '';
        child.stderr.on('data', d => errStr += d.toString());
        child.on('close', code => {
          if (code === 0) {
            resolve({ output: `[VERIFIED] Python syntax in ${args.filePath} is valid.`, isError: false });
          } else {
            resolve({ output: `[SYNTAX ERROR] Python compile failed for ${args.filePath}:\n${errStr}`, isError: true });
          }
        });
      });
    }

    // Default basic verification: check bracket balance
    let openBraces = 0, openParens = 0, openBrackets = 0;
    for (const char of content) {
      if (char === '{') openBraces++;
      if (char === '}') openBraces--;
      if (char === '(') openParens++;
      if (char === ')') openParens--;
      if (char === '[') openBrackets++;
      if (char === ']') openBrackets--;
    }

    if (openBraces !== 0 || openParens !== 0 || openBrackets !== 0) {
      return {
        output: `[WARNING] Unbalanced delimiters detected in ${args.filePath}: {diff: ${openBraces}, (diff: ${openParens}, [diff: ${openBrackets}`,
        isError: true
      };
    }

    return { output: `[VERIFIED] Basic balance checks passed for ${args.filePath}.`, isError: false };
  } catch (err: any) {
    return { output: `Verification failed: ${err.message}`, isError: true };
  }
}

export async function runVerificationSuiteTool(
  args: { command?: string },
  ctx: ToolExecutionContext
): Promise<ToolExecutionResult> {
  const testCmd = args.command || (process.platform === 'win32' ? 'npm.cmd test' : 'npm test');
  const isWindows = process.platform === 'win32';
  const shell = isWindows ? 'powershell.exe' : '/bin/bash';
  const shellArgs = isWindows ? ['-NoProfile', '-Command', testCmd] : ['-c', testCmd];

  return new Promise((resolve) => {
    const start = Date.now();
    const child = spawn(shell, shellArgs, { cwd: ctx.workspaceRoot });
    let output = '';

    child.stdout.on('data', d => output += d.toString());
    child.stderr.on('data', d => output += d.toString());

    child.on('close', code => {
      const elapsed = Date.now() - start;
      const isPass = code === 0;
      resolve({
        output: `[TEST SUITE ${isPass ? 'PASSED' : 'FAILED'}] (${elapsed}ms)\n${output}`,
        isError: !isPass,
        metadata: { passed: isPass, elapsedMs: elapsed }
      });
    });
  });
}
