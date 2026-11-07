/**
 * Supergravity Live Web Dashboard & Visualizer
 * Zero-dependency standalone HTTP server delivering rich reactive UI
 */

import * as http from 'node:http';
import { AgentLoop } from '../engine/agent-loop.ts';
import { createProvider } from '../providers/router.ts';
import { ToolRegistry } from '../tools/registry.ts';
import { MemoryEngine } from '../engine/memory.ts';
import { SwarmCoordinator } from '../swarm/swarm.ts';

const PORT = 4567;

export function startWebDashboard() {
  const workspaceRoot = process.cwd();
  const memory = new MemoryEngine();
  const tools = new ToolRegistry();
  const provider = createProvider();
  const sessionId = 'web_' + Date.now();

  const agent = new AgentLoop({
    provider,
    tools,
    memory,
    workspaceRoot,
    sessionId,
    autoVerify: true
  });

  const swarm = new SwarmCoordinator(workspaceRoot, memory, tools);

  const server = http.createServer(async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.method === 'POST' && req.url === '/api/chat') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        try {
          const { prompt, isSwarm } = JSON.parse(body || '{}');
          if (isSwarm) {
            const result = await swarm.runSwarmWorkflow(prompt);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ response: result, type: 'swarm' }));
          } else {
            const response = await agent.run(prompt);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ response, type: 'chat' }));
          }
        } catch (err: any) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      return;
    }

    if (req.method === 'GET' && req.url === '/api/status') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'online',
        provider: provider.name,
        tools: tools.getDefinitions().map(t => t.name),
        workspace: workspaceRoot
      }));
      return;
    }

    // Serve HTML Dashboard
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Supergravity • Autonomous Engineering Core</title>
  <style>
    :root {
      --bg: #0d1117;
      --card-bg: #161b22;
      --border: #30363d;
      --accent: #58a6ff;
      --accent-glow: rgba(88, 166, 255, 0.2);
      --success: #3fb950;
      --warning: #d29922;
      --text: #c9d1d9;
      --text-bright: #f0f6fc;
      --font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: var(--font);
      height: 100vh;
      display: flex;
      flex-direction: column;
    }
    header {
      padding: 16px 24px;
      background: var(--card-bg);
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--text-bright);
    }
    .badge {
      font-size: 0.75rem;
      background: rgba(63, 185, 80, 0.15);
      color: var(--success);
      padding: 4px 8px;
      border-radius: 12px;
      border: 1px solid var(--success);
    }
    .container {
      display: grid;
      grid-template-columns: 280px 1fr 340px;
      flex: 1;
      overflow: hidden;
    }
    .sidebar {
      background: var(--card-bg);
      border-right: 1px solid var(--border);
      padding: 20px;
      overflow-y: auto;
    }
    .main-canvas {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: var(--bg);
    }
    .chat-history {
      flex: 1;
      padding: 24px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .message {
      padding: 14px 18px;
      border-radius: 8px;
      line-height: 1.5;
      max-width: 85%;
      white-space: pre-wrap;
    }
    .user-msg {
      background: #1f6feb;
      color: #fff;
      align-self: flex-end;
    }
    .agent-msg {
      background: var(--card-bg);
      border: 1px solid var(--border);
      align-self: flex-start;
      color: var(--text-bright);
    }
    .input-panel {
      padding: 16px 24px;
      background: var(--card-bg);
      border-top: 1px solid var(--border);
      display: flex;
      gap: 12px;
    }
    input[type="text"] {
      flex: 1;
      padding: 12px 16px;
      background: #0d1117;
      border: 1px solid var(--border);
      border-radius: 6px;
      color: var(--text-bright);
      font-size: 0.95rem;
      outline: none;
    }
    input[type="text"]:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 3px var(--accent-glow);
    }
    button {
      padding: 10px 18px;
      background: #238636;
      border: none;
      border-radius: 6px;
      color: #fff;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }
    button:hover { background: #2ea043; }
    button.swarm-btn { background: #8957e5; }
    button.swarm-btn:hover { background: #a371f7; }
    .right-pane {
      background: var(--card-bg);
      border-left: 1px solid var(--border);
      padding: 20px;
      overflow-y: auto;
    }
    .swarm-node {
      padding: 12px;
      border: 1px solid var(--border);
      border-radius: 6px;
      margin-bottom: 12px;
      background: rgba(255, 255, 255, 0.02);
    }
    .swarm-title { font-weight: 600; font-size: 0.9rem; color: var(--accent); margin-bottom: 4px; }
    .swarm-desc { font-size: 0.8rem; color: #8b949e; }
  </style>
</head>
<body>
  <header>
    <div class="brand">
      <span>⚛️ Supergravity</span>
      <span class="badge">ENGINE ACTIVE</span>
    </div>
    <div style="font-size: 0.85rem; color: #8b949e;">Universal Model Engine • Tri-Phase Auto-Verification • Swarm AI</div>
  </header>
  <div class="container">
    <div class="sidebar">
      <h3 style="font-size: 0.9rem; text-transform: uppercase; color: #8b949e; margin-bottom: 12px;">Tool Registry</h3>
      <div id="tools-list" style="font-size: 0.85rem; line-height: 2;">Loading tools...</div>
      <hr style="border-color: var(--border); margin: 20px 0;">
      <h3 style="font-size: 0.9rem; text-transform: uppercase; color: #8b949e; margin-bottom: 12px;">Engine Policies</h3>
      <div style="font-size: 0.8rem; line-height: 1.6; color: #8b949e;">
        • Auto-Verification: <span style="color:var(--success)">ENABLED</span><br>
        • Syntax Rollback: <span style="color:var(--success)">ENABLED</span><br>
        • Sandboxed Execution: <span style="color:var(--success)">ENABLED</span><br>
        • ACP Protocol: <span style="color:var(--accent)">JSON-RPC 2.0</span>
      </div>
    </div>
    <div class="main-canvas">
      <div class="chat-history" id="chat">
        <div class="message agent-msg">⚛️ Welcome to Supergravity. How can I assist with your engineering workflows today?</div>
      </div>
      <div class="input-panel">
        <input type="text" id="prompt-input" placeholder="Enter engineering prompt or ask to refactor code..." />
        <button onclick="sendPrompt(false)">Execute</button>
        <button class="swarm-btn" onclick="sendPrompt(true)">Launch Swarm</button>
      </div>
    </div>
    <div class="right-pane">
      <h3 style="font-size: 0.9rem; text-transform: uppercase; color: #8b949e; margin-bottom: 16px;">Swarm Topology</h3>
      <div class="swarm-node">
        <div class="swarm-title">📐 Lead Architect</div>
        <div class="swarm-desc">Decomposes requirements into milestone DAG.</div>
      </div>
      <div class="swarm-node">
        <div class="swarm-title">🔨 Staff Engineer</div>
        <div class="swarm-desc">Implements atomic code changes and AST diffs.</div>
      </div>
      <div class="swarm-node">
        <div class="swarm-title">🛡️ Security Critic</div>
        <div class="swarm-desc">Audits boundaries, dependencies, and regressions.</div>
      </div>
      <div class="swarm-node">
        <div class="swarm-title">🧪 QA Tester</div>
        <div class="swarm-desc">Executes test suites and guarantees zero breaking changes.</div>
      </div>
    </div>
  </div>
  <script>
    fetch('/api/status').then(r => r.json()).then(data => {
      document.getElementById('tools-list').innerHTML = data.tools.map(t => '<div>⚡ ' + t + '</div>').join('');
    });

    async function sendPrompt(isSwarm) {
      const input = document.getElementById('prompt-input');
      const text = input.value.trim();
      if (!text) return;
      
      const chat = document.getElementById('chat');
      const uMsg = document.createElement('div');
      uMsg.className = 'message user-msg';
      uMsg.innerText = (isSwarm ? '🚀 [SWARM] ' : '') + text;
      chat.appendChild(uMsg);
      input.value = '';

      const aMsg = document.createElement('div');
      aMsg.className = 'message agent-msg';
      aMsg.innerText = isSwarm ? 'Coordinating Multi-Agent Swarm...' : 'Thinking...';
      chat.appendChild(aMsg);
      chat.scrollTop = chat.scrollHeight;

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: text, isSwarm })
        });
        const data = await res.json();
        aMsg.innerText = data.response || data.error || 'Done';
      } catch (err) {
        aMsg.innerText = 'Error: ' + err.message;
      }
      chat.scrollTop = chat.scrollHeight;
    }

    document.getElementById('prompt-input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') sendPrompt(false);
    });
  </script>
</body>
</html>`);
  });

  server.listen(PORT, () => {
    console.log(`🌐 Supergravity Dashboard live at http://localhost:${PORT}`);
  });
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  startWebDashboard();
}
