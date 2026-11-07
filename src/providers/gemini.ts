/**
 * Google Gemini Provider for Supergravity
 * Directly interfaces with Google AI Studio / Gemini REST API
 */

import type { LLMProvider, Message, ToolDefinition, StreamCallbacks, LLMResponse, ContentPart } from '../core/types.ts';

export class GeminiProvider implements LLMProvider {
  name = 'gemini' as const;
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor(apiKey?: string, model: string = 'gemini-2.5-flash', baseUrl?: string) {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY || '';
    this.model = model;
    this.baseUrl = baseUrl || 'https://generativelanguage.googleapis.com/v1beta';
  }

  async generate(
    messages: Message[],
    tools: ToolDefinition[],
    callbacks?: StreamCallbacks,
    signal?: AbortSignal
  ): Promise<LLMResponse> {
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY is not configured.');
    }

    const systemMessage = messages.find(m => m.role === 'system');
    const conversationMessages = messages.filter(m => m.role !== 'system');

    // Map tools to Gemini function declarations
    const functionDeclarations = tools.map(t => ({
      name: t.name,
      description: t.description,
      parameters: {
        type: 'OBJECT',
        properties: t.parameters.properties,
        required: t.parameters.required || []
      }
    }));

    // Convert messages to Gemini contents format
    const contents = conversationMessages.map(m => {
      const role = m.role === 'assistant' ? 'model' : 'user';
      if (typeof m.content === 'string') {
        return {
          role,
          parts: [{ text: m.content }]
        };
      }

      const parts: any[] = [];
      for (const part of m.content) {
        if (part.type === 'text') {
          parts.push({ text: part.text });
        } else if (part.type === 'tool_call') {
          parts.push({
            functionCall: {
              name: part.name,
              args: part.arguments
            }
          });
        } else if (part.type === 'tool_result') {
          parts.push({
            functionResponse: {
              name: part.name,
              response: { content: part.content, error: part.is_error }
            }
          });
        }
      }
      return { role, parts };
    });

    const requestBody: any = {
      contents,
      generationConfig: {
        temperature: 0.2,
      }
    };

    if (systemMessage) {
      requestBody.systemInstruction = {
        parts: [{ text: typeof systemMessage.content === 'string' ? systemMessage.content : '' }]
      };
    }

    if (functionDeclarations.length > 0) {
      requestBody.tools = [{ functionDeclarations }];
    }

    const endpoint = `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini API Error (${res.status}): ${errText}`);
    }

    const data = await res.json() as any;
    const candidate = data.candidates?.[0];
    if (!candidate) {
      return { content: '', thoughts: '' };
    }

    let contentText = '';
    let thoughtText = '';
    const toolCalls: Array<{ id: string; name: string; arguments: Record<string, any> }> = [];

    const parts = candidate.content?.parts || [];
    for (const p of parts) {
      if (p.text) {
        contentText += p.text;
        callbacks?.onToken?.(p.text);
      }
      if (p.functionCall) {
        const id = 'call_' + Math.random().toString(36).substring(2, 9);
        const call = {
          id,
          name: p.functionCall.name,
          arguments: p.functionCall.args || {}
        };
        toolCalls.push(call);
        callbacks?.onToolCall?.(call);
      }
    }

    return {
      content: contentText,
      thoughts: thoughtText,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      usage: {
        promptTokens: data.usageMetadata?.promptTokenCount || 0,
        completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: data.usageMetadata?.totalTokenCount || 0
      }
    };
  }
}
