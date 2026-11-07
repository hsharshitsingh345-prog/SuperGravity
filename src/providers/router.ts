/**
 * Supergravity Universal Provider Router
 * Selects, fallbacks, and manages multi-model execution
 */

import type { LLMProvider, Message, ToolDefinition, StreamCallbacks, LLMResponse } from '../core/types.ts';
import { GeminiProvider } from './gemini.ts';
import { OpenAICompatibleProvider } from './openai.ts';

export class SimulationFallbackProvider implements LLMProvider {
  name = 'openai' as const;

  async generate(
    messages: Message[],
    tools: ToolDefinition[],
    callbacks?: StreamCallbacks
  ): Promise<LLMResponse> {
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg.role === 'tool') {
      const toolContent = typeof lastMsg.content === 'string' 
        ? lastMsg.content 
        : (lastMsg.content[0] as any)?.content || 'Tool execution complete.';

      const summary = `Inspection Results:\n${toolContent}\n\nSupergravity engine verified workspace and loaded project state.`;
      callbacks?.onToken?.(summary);
      return {
        content: summary,
        thoughts: "Tool executed successfully. Concluding turn."
      };
    }

    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    const query = typeof lastUserMessage?.content === 'string' 
      ? lastUserMessage.content 
      : 'Analyze workspace';

    const reasoning = `[Simulation Mode] Detected query: "${query}". Formulating execution plan across filesystem and verification tools.`;
    callbacks?.onThought?.(reasoning);

    // If query asks about files or structure, call list_dir
    if (/list|structure|files|dir|status/i.test(query)) {
      const toolCall = {
        id: 'sim_call_1',
        name: 'list_dir',
        arguments: { path: '.', recursive: false }
      };
      callbacks?.onToolCall?.(toolCall);
      return {
        content: "I will inspect the current workspace files to evaluate project status.",
        thoughts: reasoning,
        toolCalls: [toolCall]
      };
    }

    const response = `Supergravity Local Engine ready. Please configure GEMINI_API_KEY, OPENAI_API_KEY, or local Ollama endpoint (http://localhost:11434/v1) for continuous reasoning.\n\nWorkspace active. Built-in tools ready: filesystem, command runner, verification engine, and multi-agent swarm.`;
    callbacks?.onToken?.(response);

    return {
      content: response,
      thoughts: reasoning
    };
  }
}

export function createProvider(): LLMProvider {
  if (process.env.GEMINI_API_KEY) {
    return new GeminiProvider(process.env.GEMINI_API_KEY, process.env.GEMINI_MODEL || 'gemini-2.5-flash');
  }

  if (process.env.OPENAI_API_KEY) {
    return new OpenAICompatibleProvider(process.env.OPENAI_API_KEY, process.env.OPENAI_MODEL || 'gpt-4o');
  }

  if (process.env.DEEPSEEK_API_KEY) {
    return new OpenAICompatibleProvider(
      process.env.DEEPSEEK_API_KEY,
      'deepseek-chat',
      'https://api.deepseek.com'
    );
  }

  if (process.env.OLLAMA_HOST) {
    return new OpenAICompatibleProvider('ollama', 'llama3.3', `${process.env.OLLAMA_HOST}/v1`);
  }

  // Graceful fallback for local development & demonstration
  return new SimulationFallbackProvider();
}
