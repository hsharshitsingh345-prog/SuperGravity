/**
 * Supergravity ACP (Agent Client Protocol) Stdio Server
 * Standards-compliant JSON-RPC 2.0 interface for IDEs, extensions, and automated clients
 */

import * as readline from 'node:readline';
import { AgentLoop } from '../engine/agent-loop.ts';
import { createProvider } from '../providers/router.ts';
import { ToolRegistry } from '../tools/registry.ts';
import { MemoryEngine } from '../engine/memory.ts';

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: any;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export function startAcpServer() {
  const workspaceRoot = process.cwd();
  const memory = new MemoryEngine();
  const tools = new ToolRegistry();
  const provider = createProvider();
  const sessionId = 'acp_' + Date.now();

  const agent = new AgentLoop({
    provider,
    tools,
    memory,
    workspaceRoot,
    sessionId,
    autoVerify: true
  });

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
  });

  function sendResponse(id: string | number, result: any) {
    const res: JsonRpcResponse = { jsonrpc: '2.0', id, result };
    process.stdout.write(JSON.stringify(res) + '\n');
  }

  function sendError(id: string | number, code: number, message: string) {
    const res: JsonRpcResponse = { jsonrpc: '2.0', id, error: { code, message } };
    process.stdout.write(JSON.stringify(res) + '\n');
  }

  function sendNotification(method: string, params: any) {
    process.stdout.write(JSON.stringify({ jsonrpc: '2.0', method, params }) + '\n');
  }

  rl.on('line', async (line) => {
    if (!line.trim()) return;

    let req: JsonRpcRequest;
    try {
      req = JSON.parse(line);
    } catch {
      sendError(0, -32700, 'Parse error: invalid JSON');
      return;
    }

    try {
      switch (req.method) {
        case 'initialize':
          sendResponse(req.id, {
            serverInfo: {
              name: 'Supergravity ACP Server',
              version: '1.0.0'
            },
            capabilities: {
              tools: true,
              streaming: true,
              multiAgentSwarm: true,
              autoVerification: true
            }
          });
          break;

        case 'tools/list':
          sendResponse(req.id, {
            tools: tools.getDefinitions()
          });
          break;

        case 'tools/call': {
          const { name, arguments: args } = req.params || {};
          const result = await tools.execute(name, args || {}, {
            workspaceRoot,
            sessionID: sessionId
          });
          sendResponse(req.id, result);
          break;
        }

        case 'agent/chat': {
          const prompt = req.params?.prompt || '';
          const response = await agent.run(prompt, {
            onToken: (token) => sendNotification('agent/token', { token }),
            onThought: (thought) => sendNotification('agent/thought', { thought })
          });
          sendResponse(req.id, { response });
          break;
        }

        default:
          sendError(req.id, -32601, `Method "${req.method}" not found.`);
      }
    } catch (err: any) {
      sendError(req.id, -32603, `Internal error: ${err.message}`);
    }
  });
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  startAcpServer();
}
