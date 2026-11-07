/**
 * Supergravity Terminal Tooling
 * Safe command execution, streaming outputs, and background task management
 */

import { spawn } from 'node:child_process';
import type { ToolExecutionContext, ToolExecutionResult } from '../core/types.ts';

interface BackgroundTask {
  id: string;
  command: string;
  startTime: number;
  status: 'running' | 'completed' | 'failed' | 'killed';
  output: string[];
  process?: any;
}

const backgroundTasks = new Map<string, BackgroundTask>();

export async function runCommandTool(
  args: { command: string; timeoutMs?: number; isDaemon?: boolean },
  ctx: ToolExecutionContext
): Promise<ToolExecutionResult> {
  const timeoutMs = args.timeoutMs || 30000;
  const isWindows = process.platform === 'win32';
  const shell = isWindows ? 'powershell.exe' : '/bin/bash';
  const shellArgs = isWindows ? ['-NoProfile', '-Command', args.command] : ['-c', args.command];

  if (args.isDaemon) {
    const taskId = 'task_' + Math.random().toString(36).substring(2, 9);
    const child = spawn(shell, shellArgs, {
      cwd: ctx.workspaceRoot,
      env: process.env,
      detached: true
    });

    const task: BackgroundTask = {
      id: taskId,
      command: args.command,
      startTime: Date.now(),
      status: 'running',
      output: [],
      process: child
    };

    child.stdout?.on('data', d => task.output.push(d.toString()));
    child.stderr?.on('data', d => task.output.push(d.toString()));
    child.on('exit', code => {
      task.status = code === 0 ? 'completed' : 'failed';
    });

    backgroundTasks.set(taskId, task);

    return {
      output: `Launched background task [${taskId}]: "${args.command}"\nUse task_manage to monitor status or terminate.`,
      isError: false,
      metadata: { taskId }
    };
  }

  return new Promise<ToolExecutionResult>((resolve) => {
    const child = spawn(shell, shellArgs, {
      cwd: ctx.workspaceRoot,
      env: process.env
    });

    let stdout = '';
    let stderr = '';
    let killed = false;

    const timer = setTimeout(() => {
      killed = true;
      child.kill();
      resolve({
        output: `Command timed out after ${timeoutMs}ms.\nOutput before timeout:\n${stdout}`,
        isError: true
      });
    }, timeoutMs);

    child.stdout?.on('data', chunk => {
      const text = chunk.toString();
      stdout += text;
      ctx.onOutputDelta?.(text);
    });

    child.stderr?.on('data', chunk => {
      const text = chunk.toString();
      stderr += text;
      ctx.onOutputDelta?.(text);
    });

    child.on('close', code => {
      clearTimeout(timer);
      if (killed) return;

      const output = (stdout + (stderr ? '\n[STDERR]\n' + stderr : '')).trim();
      resolve({
        output: output || (code === 0 ? '(Command completed with no output)' : `Exited with code ${code}`),
        isError: code !== 0,
        metadata: { exitCode: code }
      });
    });

    child.on('error', err => {
      clearTimeout(timer);
      resolve({
        output: `Failed to spawn process: ${err.message}`,
        isError: true
      });
    });
  });
}

export async function manageTaskTool(
  args: { action: 'list' | 'status' | 'kill'; taskId?: string }
): Promise<ToolExecutionResult> {
  if (args.action === 'list') {
    const list = Array.from(backgroundTasks.values()).map(t => 
      `ID: ${t.id} | Status: ${t.status} | Uptime: ${Math.round((Date.now() - t.startTime)/1000)}s | Command: ${t.command}`
    );
    return {
      output: list.length > 0 ? list.join('\n') : 'No active background tasks.',
      isError: false
    };
  }

  if (!args.taskId || !backgroundTasks.has(args.taskId)) {
    return {
      output: `Task ID "${args.taskId}" not found.`,
      isError: true
    };
  }

  const task = backgroundTasks.get(args.taskId)!;

  if (args.action === 'status') {
    return {
      output: `Task: ${task.id}\nStatus: ${task.status}\nCommand: ${task.command}\nRecent Output:\n${task.output.slice(-20).join('')}`,
      isError: false
    };
  }

  if (args.action === 'kill') {
    try {
      task.process?.kill();
      task.status = 'killed';
      return {
        output: `Task ${task.id} terminated.`,
        isError: false
      };
    } catch (err: any) {
      return {
        output: `Failed to terminate task ${task.id}: ${err.message}`,
        isError: true
      };
    }
  }

  return { output: `Unknown action ${args.action}`, isError: true };
}
