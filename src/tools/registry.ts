/**
 * Supergravity Tool Registry
 * Exposes definitions and handlers to LLM providers
 */

import type { ToolDefinition, ToolHandler, ToolExecutionContext, ToolExecutionResult } from '../core/types.ts';
import { readFileTool, writeFileTool, editFileTool, listDirTool, searchCodeTool } from './filesystem.ts';
import { runCommandTool, manageTaskTool } from './terminal.ts';
import { verifySyntaxTool, runVerificationSuiteTool } from './verifier.ts';

export interface RegisteredTool {
  definition: ToolDefinition;
  handler: ToolHandler;
}

export class ToolRegistry {
  private tools = new Map<string, RegisteredTool>();

  constructor() {
    this.registerDefaults();
  }

  private register(definition: ToolDefinition, handler: ToolHandler) {
    this.tools.set(definition.name, { definition, handler });
  }

  private registerDefaults() {
    // Read File
    this.register({
      name: 'read_file',
      description: 'Read contents of a file with optional line range selection.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Relative path of the file to read' },
          startLine: { type: 'number', description: '1-indexed starting line' },
          endLine: { type: 'number', description: '1-indexed ending line' }
        },
        required: ['path']
      }
    }, readFileTool);

    // Write File
    this.register({
      name: 'write_file',
      description: 'Write content to a file. Automatically creates parent directories.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Relative path to create or overwrite' },
          content: { type: 'string', description: 'Full text content to write' },
          overwrite: { type: 'boolean', description: 'Whether to overwrite existing file (default true)' }
        },
        required: ['path', 'content']
      }
    }, writeFileTool);

    // Edit File
    this.register({
      name: 'edit_file',
      description: 'Surgically replace target string with replacement text in a file.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'File path to edit' },
          target: { type: 'string', description: 'Exact string snippet to match and replace' },
          replacement: { type: 'string', description: 'Replacement string' }
        },
        required: ['path', 'target', 'replacement']
      }
    }, editFileTool);

    // List Dir
    this.register({
      name: 'list_dir',
      description: 'List directory structure and files with recursive filtering.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Relative directory path (default .)' },
          recursive: { type: 'boolean', description: 'Whether to scan subdirectories' }
        }
      }
    }, listDirTool);

    // Search Code
    this.register({
      name: 'search_code',
      description: 'Regex search across codebase files with matching line numbers.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Regex pattern or search term' },
          filePattern: { type: 'string', description: 'Optional substring filter for filename' }
        },
        required: ['query']
      }
    }, searchCodeTool);

    // Run Command
    this.register({
      name: 'run_command',
      description: 'Execute shell commands with timeout protection or background daemon mode.',
      parameters: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'Command line string to execute' },
          timeoutMs: { type: 'number', description: 'Timeout in milliseconds (default 30000)' },
          isDaemon: { type: 'boolean', description: 'Run asynchronously in background' }
        },
        required: ['command']
      }
    }, runCommandTool);

    // Manage Task
    this.register({
      name: 'manage_task',
      description: 'List, check status, or terminate background command tasks.',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['list', 'status', 'kill'], description: 'Action to perform' },
          taskId: { type: 'string', description: 'Target background task ID' }
        },
        required: ['action']
      }
    }, manageTaskTool as any);

    // Verify Syntax
    this.register({
      name: 'verify_syntax',
      description: 'Automated syntax checking for JS/TS, Python, JSON, and bracket integrity.',
      parameters: {
        type: 'object',
        properties: {
          filePath: { type: 'string', description: 'Path to source file to verify' }
        },
        required: ['filePath']
      }
    }, verifySyntaxTool);

    // Run Test Suite
    this.register({
      name: 'run_verification_suite',
      description: 'Run automated project test suite and verify no regressions.',
      parameters: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'Custom test command (defaults to npm test)' }
        }
      }
    }, runVerificationSuiteTool);
  }

  getDefinitions(): ToolDefinition[] {
    return Array.from(this.tools.values()).map(t => t.definition);
  }

  async execute(
    name: string,
    args: Record<string, any>,
    ctx: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      return { output: `Error: Unknown tool "${name}"`, isError: true };
    }
    try {
      return await tool.handler(args, ctx);
    } catch (err: any) {
      return { output: `Tool execution failed: ${err.message}`, isError: true };
    }
  }
}
