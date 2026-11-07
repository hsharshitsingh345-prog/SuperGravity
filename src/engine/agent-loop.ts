/**
 * Supergravity Autonomous Agent Loop
 * Tri-Phase Architecture: Think ➡️ Plan ➡️ Act ➡️ Verify
 */

import type { LLMProvider, Message, StreamCallbacks, ToolExecutionContext } from '../core/types.ts';
import { ToolRegistry } from '../tools/registry.ts';
import { MemoryEngine } from './memory.ts';

export interface AgentLoopOptions {
  provider: LLMProvider;
  tools: ToolRegistry;
  memory: MemoryEngine;
  workspaceRoot: string;
  sessionId: string;
  maxIterations?: number;
  autoVerify?: boolean;
}

export class AgentLoop {
  private provider: LLMProvider;
  private tools: ToolRegistry;
  private memory: MemoryEngine;
  private workspaceRoot: string;
  private sessionId: string;
  private maxIterations: number;
  private autoVerify: boolean;
  private history: Message[] = [];

  constructor(options: AgentLoopOptions) {
    this.provider = options.provider;
    this.tools = options.tools;
    this.memory = options.memory;
    this.workspaceRoot = options.workspaceRoot;
    this.sessionId = options.sessionId;
    this.maxIterations = options.maxIterations || 15;
    this.autoVerify = options.autoVerify ?? true;

    // Load system prompt
    this.history.push({
      role: 'system',
      content: `You are Supergravity, an elite autonomous AI software engineering pair programmer.
You have native access to codebase tools: read_file, write_file, edit_file, list_dir, search_code, run_command, verify_syntax, and run_verification_suite.

Operational Directives:
1. THINK BEFORE ACTING: Analyze the problem deeply. Formulate a structured step-by-step plan.
2. SURGICAL EDITS: When modifying existing files, use edit_file or verify line ranges before writing.
3. VERIFICATION FIRST: After any code or file edit, verify syntax and run tests to ensure zero regressions.
4. SELF-HEALING: If a tool returns an error or test failure, do not stop; diagnose the root cause and repair it immediately.`
    });
  }

  async run(prompt: string, callbacks?: StreamCallbacks): Promise<string> {
    this.history.push({ role: 'user', content: prompt });
    this.memory.saveMessage(this.sessionId, 'user', prompt);

    let finalResponse = '';
    let iterations = 0;

    const toolCtx: ToolExecutionContext = {
      workspaceRoot: this.workspaceRoot,
      sessionID: this.sessionId,
      onOutputDelta: (delta) => callbacks?.onToken?.(delta)
    };

    while (iterations < this.maxIterations) {
      iterations++;

      const res = await this.provider.generate(
        this.history,
        this.tools.getDefinitions(),
        callbacks
      );

      if (res.thoughts) {
        callbacks?.onThought?.(res.thoughts);
      }

      if (res.content) {
        finalResponse = res.content;
      }

      // If no tool calls, conversation turn is complete
      if (!res.toolCalls || res.toolCalls.length === 0) {
        this.history.push({ role: 'assistant', content: res.content });
        this.memory.saveMessage(this.sessionId, 'assistant', res.content);
        break;
      }

      // Record assistant call in history
      this.history.push({
        role: 'assistant',
        content: [
          ...(res.content ? [{ type: 'text' as const, text: res.content }] : []),
          ...res.toolCalls.map(tc => ({
            type: 'tool_call' as const,
            id: tc.id,
            name: tc.name,
            arguments: tc.arguments
          }))
        ]
      });

      // Execute tool calls sequentially
      for (const call of res.toolCalls) {
        callbacks?.onThought?.(`[Executing Tool] ${call.name}(${JSON.stringify(call.arguments)})`);

        const result = await this.tools.execute(call.name, call.arguments, toolCtx);

        // Auto-Verification Hook
        if (this.autoVerify && (call.name === 'write_file' || call.name === 'edit_file')) {
          const filePath = call.arguments.path;
          if (filePath && !filePath.endsWith('.md') && !filePath.endsWith('.txt')) {
            const verifyCheck = await this.tools.execute('verify_syntax', { filePath }, toolCtx);
            if (verifyCheck.isError) {
              result.output += `\n[Auto-Verifier Alert]: ${verifyCheck.output}\nPlease correct this syntax error.`;
            }
          }
        }

        // Push tool response into history
        this.history.push({
          role: 'tool',
          name: call.name,
          content: [
            {
              type: 'tool_result',
              tool_call_id: call.id,
              name: call.name,
              content: result.output,
              is_error: result.isError
            }
          ]
        });

        this.memory.saveMessage(
          this.sessionId,
          'tool',
          `[Tool: ${call.name}] ${result.output}`
        );
      }
    }

    return finalResponse;
  }
}
