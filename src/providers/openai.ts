/**
 * Universal OpenAI-Compatible Provider for Supergravity
 * Works seamlessly with OpenAI, DeepSeek, Groq, Ollama, LM Studio, vLLM
 */

import type { LLMProvider, Message, ToolDefinition, StreamCallbacks, LLMResponse } from '../core/types.ts';

export class OpenAICompatibleProvider implements LLMProvider {
  name = 'openai' as const;
  private apiKey: string;
  private baseUrl: string;
  private model: string;

  constructor(
    apiKey?: string,
    model: string = 'gpt-4o',
    baseUrl: string = 'https://api.openai.com/v1'
  ) {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || process.env.DEEPSEEK_API_KEY || 'local';
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.model = model;
  }

  async generate(
    messages: Message[],
    tools: ToolDefinition[],
    callbacks?: StreamCallbacks,
    signal?: AbortSignal
  ): Promise<LLMResponse> {
    const formattedMessages = messages.map(m => {
      if (typeof m.content === 'string') {
        return { role: m.role, content: m.content };
      }

      // Handle structured parts
      let text = '';
      const toolCalls: any[] = [];
      let toolCallId = '';

      for (const part of m.content) {
        if (part.type === 'text') {
          text += part.text;
        } else if (part.type === 'tool_call') {
          toolCalls.push({
            id: part.id,
            type: 'function',
            function: {
              name: part.name,
              arguments: JSON.stringify(part.arguments)
            }
          });
        } else if (part.type === 'tool_result') {
          text = part.content;
          toolCallId = part.tool_call_id;
        }
      }

      if (m.role === 'tool') {
        return {
          role: 'tool',
          tool_call_id: toolCallId,
          content: text
        };
      }

      if (toolCalls.length > 0) {
        return {
          role: 'assistant',
          content: text || null,
          tool_calls: toolCalls
        };
      }

      return { role: m.role, content: text };
    });

    const openAITools = tools.map(t => ({
      type: 'function',
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters
      }
    }));

    const requestBody: any = {
      model: this.model,
      messages: formattedMessages,
      temperature: 0.2
    };

    if (openAITools.length > 0) {
      requestBody.tools = openAITools;
      requestBody.tool_choice = 'auto';
    }

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(requestBody),
      signal
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenAI-compatible API Error (${res.status}): ${errText}`);
    }

    const data = await res.json() as any;
    const choice = data.choices?.[0];
    if (!choice) {
      return { content: '', thoughts: '' };
    }

    const msg = choice.message;
    const content = msg.content || '';
    const toolCalls: Array<{ id: string; name: string; arguments: Record<string, any> }> = [];

    if (msg.tool_calls) {
      for (const tc of msg.tool_calls) {
        let args = {};
        try {
          args = JSON.parse(tc.function.arguments || '{}');
        } catch {
          args = { raw: tc.function.arguments };
        }
        const call = {
          id: tc.id,
          name: tc.function.name,
          arguments: args
        };
        toolCalls.push(call);
        callbacks?.onToolCall?.(call);
      }
    }

    callbacks?.onToken?.(content);

    return {
      content,
      thoughts: msg.reasoning_content || '',
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0
      }
    };
  }
}
