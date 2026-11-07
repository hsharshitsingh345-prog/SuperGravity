/**
 * Supergravity: Next-Generation Agentic Core Types
 */

export type Role = 'system' | 'user' | 'assistant' | 'tool';

export interface TextPart {
  type: 'text';
  text: string;
}

export interface ThoughtPart {
  type: 'thought';
  thought: string;
}

export interface ToolCallPart {
  type: 'tool_call';
  id: string;
  name: string;
  arguments: Record<string, any>;
}

export interface ToolResultPart {
  type: 'tool_result';
  tool_call_id: string;
  name: string;
  content: string;
  is_error?: boolean;
}

export type ContentPart = TextPart | ThoughtPart | ToolCallPart | ToolResultPart;

export interface Message {
  role: Role;
  content: string | ContentPart[];
  name?: string;
  timestamp?: number;
}

export interface ToolParameterSchema {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
  required?: string[];
  properties?: Record<string, ToolParameterSchema>;
  items?: ToolParameterSchema;
  enum?: string[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, ToolParameterSchema>;
    required?: string[];
  };
}

export interface ToolExecutionContext {
  workspaceRoot: string;
  sessionID: string;
  signal?: AbortSignal;
  onOutputDelta?: (delta: string) => void;
}

export interface ToolExecutionResult {
  output: string;
  isError: boolean;
  metadata?: Record<string, any>;
}

export type ToolHandler = (
  args: Record<string, any>,
  context: ToolExecutionContext
) => Promise<ToolExecutionResult>;

export type ProviderName = 'gemini' | 'anthropic' | 'openai' | 'ollama' | 'deepseek';

export interface ProviderConfig {
  name: ProviderName;
  apiKey?: string;
  baseUrl?: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  streaming?: boolean;
}

export interface StreamCallbacks {
  onToken?: (token: string) => void;
  onThought?: (thought: string) => void;
  onToolCall?: (call: { id: string; name: string; arguments: Record<string, any> }) => void;
  onError?: (err: Error) => void;
}

export interface LLMResponse {
  content: string;
  thoughts?: string;
  toolCalls?: Array<{
    id: string;
    name: string;
    arguments: Record<string, any>;
  }>;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface LLMProvider {
  name: ProviderName;
  generate(
    messages: Message[],
    tools: ToolDefinition[],
    callbacks?: StreamCallbacks,
    signal?: AbortSignal
  ): Promise<LLMResponse>;
}

export type AgentRole = 'lead_architect' | 'software_engineer' | 'security_critic' | 'qa_verifier';

export interface AgentPersona {
  role: AgentRole;
  displayName: string;
  systemPrompt: string;
  allowedTools: string[];
}

export interface TaskCheckpoint {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'rolled_back';
  assignedAgent: AgentRole;
  dependencies: string[];
  result?: string;
  error?: string;
}

