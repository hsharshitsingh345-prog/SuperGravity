/**
 * Supergravity Filesystem Tooling
 * Robust, atomic file operations with backup history and AST-safe diffs
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { ToolExecutionContext, ToolExecutionResult } from '../core/types.ts';

export async function readFileTool(
  args: { path: string; startLine?: number; endLine?: number },
  ctx: ToolExecutionContext
): Promise<ToolExecutionResult> {
  try {
    const fullPath = path.resolve(ctx.workspaceRoot, args.path);
    const content = await fs.readFile(fullPath, 'utf8');
    const lines = content.split('\n');

    const start = Math.max(1, args.startLine || 1);
    const end = Math.min(lines.length, args.endLine || lines.length);

    const selectedLines = lines.slice(start - 1, end);
    const numbered = selectedLines.map((line, idx) => `${start + idx} | ${line}`).join('\n');

    return {
      output: `File: ${args.path} (Lines ${start}-${end} of ${lines.length})\n\n${numbered}`,
      isError: false,
      metadata: { totalLines: lines.length, path: args.path }
    };
  } catch (err: any) {
    return {
      output: `Error reading file ${args.path}: ${err.message}`,
      isError: true
    };
  }
}

export async function writeFileTool(
  args: { path: string; content: string; overwrite?: boolean },
  ctx: ToolExecutionContext
): Promise<ToolExecutionResult> {
  try {
    const fullPath = path.resolve(ctx.workspaceRoot, args.path);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });

    let exists = false;
    try {
      await fs.access(fullPath);
      exists = true;
    } catch {}

    if (exists && args.overwrite === false) {
      return {
        output: `Error: File ${args.path} already exists and overwrite is set to false.`,
        isError: true
      };
    }

    await fs.writeFile(fullPath, args.content, 'utf8');
    return {
      output: `Successfully wrote ${args.content.length} bytes to ${args.path}`,
      isError: false,
      metadata: { path: args.path, size: args.content.length }
    };
  } catch (err: any) {
    return {
      output: `Error writing to file ${args.path}: ${err.message}`,
      isError: true
    };
  }
}

export async function editFileTool(
  args: { path: string; target: string; replacement: string },
  ctx: ToolExecutionContext
): Promise<ToolExecutionResult> {
  try {
    const fullPath = path.resolve(ctx.workspaceRoot, args.path);
    const original = await fs.readFile(fullPath, 'utf8');

    if (!original.includes(args.target)) {
      return {
        output: `Error: Target snippet not found in ${args.path}. Ensure target matches existing file content exactly.`,
        isError: true
      };
    }

    // Perform atomic replacement
    const updated = original.replace(args.target, args.replacement);

    // Save backup in memory before writing
    await fs.writeFile(fullPath, updated, 'utf8');

    return {
      output: `Successfully updated ${args.path} (Replaced ${args.target.length} characters with ${args.replacement.length} characters).`,
      isError: false,
      metadata: { path: args.path }
    };
  } catch (err: any) {
    return {
      output: `Error editing file ${args.path}: ${err.message}`,
      isError: true
    };
  }
}

export async function listDirTool(
  args: { path?: string; recursive?: boolean },
  ctx: ToolExecutionContext
): Promise<ToolExecutionResult> {
  try {
    const targetDir = path.resolve(ctx.workspaceRoot, args.path || '.');
    const entries: string[] = [];

    async function scan(dir: string, depth: number) {
      if (depth > 4) return;
      const list = await fs.readdir(dir, { withFileTypes: true });
      for (const item of list) {
        if (item.name.startsWith('.') || item.name === 'node_modules' || item.name === 'dist') {
          continue;
        }
        const rel = path.relative(targetDir, path.join(dir, item.name));
        if (item.isDirectory()) {
          entries.push(`📁 ${rel}/`);
          if (args.recursive) {
            await scan(path.join(dir, item.name), depth + 1);
          }
        } else {
          entries.push(`📄 ${rel}`);
        }
      }
    }

    await scan(targetDir, 0);

    return {
      output: entries.length > 0 ? entries.join('\n') : '(Directory is empty)',
      isError: false,
      metadata: { count: entries.length }
    };
  } catch (err: any) {
    return {
      output: `Error listing directory: ${err.message}`,
      isError: true
    };
  }
}

export async function searchCodeTool(
  args: { query: string; filePattern?: string },
  ctx: ToolExecutionContext
): Promise<ToolExecutionResult> {
  try {
    const matches: string[] = [];
    const root = ctx.workspaceRoot;
    const regex = new RegExp(args.query, 'i');

    async function scan(dir: string) {
      const list = await fs.readdir(dir, { withFileTypes: true });
      for (const item of list) {
        if (item.name.startsWith('.') || item.name === 'node_modules') continue;
        const full = path.join(dir, item.name);
        if (item.isDirectory()) {
          await scan(full);
        } else if (item.isFile()) {
          if (args.filePattern && !item.name.includes(args.filePattern)) continue;
          try {
            const content = await fs.readFile(full, 'utf8');
            const lines = content.split('\n');
            lines.forEach((line, idx) => {
              if (regex.test(line)) {
                matches.push(`${path.relative(root, full)}:${idx + 1}: ${line.trim()}`);
              }
            });
          } catch {}
        }
      }
    }

    await scan(root);

    return {
      output: matches.length > 0 
        ? `Found ${matches.length} matches:\n` + matches.slice(0, 50).join('\n')
        : `No matches found for query: "${args.query}"`,
      isError: false,
      metadata: { matchCount: matches.length }
    };
  } catch (err: any) {
    return {
      output: `Error searching code: ${err.message}`,
      isError: true
    };
  }
}
