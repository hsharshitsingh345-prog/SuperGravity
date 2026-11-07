#!/usr/bin/env node
/**
 * Supergravity Interactive Terminal (TUI)
 */

import * as readline from 'node:readline';
import { AgentLoop } from './engine/agent-loop.ts';
import { createProvider } from './providers/router.ts';
import { ToolRegistry } from './tools/registry.ts';
import { MemoryEngine } from './engine/memory.ts';
import { SwarmCoordinator } from './swarm/swarm.ts';

const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  red: '\x1b[31m',
};

async function main() {
  console.log(`
${ANSI.cyan}${ANSI.bold}================================================================${ANSI.reset}
${ANSI.cyan}${ANSI.bold}  ⚛️  SUPERGRAVITY (sg) - Autonomous Multi-Agent Engineering Core${ANSI.reset}
${ANSI.dim}  Universal Model Engine • Tri-Phase Auto-Verification • Swarm AI${ANSI.reset}
${ANSI.cyan}${ANSI.bold}================================================================${ANSI.reset}
`);

  const workspaceRoot = process.cwd();
  const memory = new MemoryEngine();
  const tools = new ToolRegistry();
  const provider = createProvider();
  const sessionId = 'session_' + Date.now();

  memory.createSession(sessionId, 'Interactive CLI Session');

  const agent = new AgentLoop({
    provider,
    tools,
    memory,
    workspaceRoot,
    sessionId,
    autoVerify: true
  });

  const swarm = new SwarmCoordinator(workspaceRoot, memory, tools);

  console.log(`${ANSI.green}✔ Active Provider:${ANSI.reset} ${provider.name.toUpperCase()}`);
  console.log(`${ANSI.green}✔ Workspace:${ANSI.reset} ${workspaceRoot}`);
  console.log(`${ANSI.green}✔ Tools Loaded:${ANSI.reset} ${tools.getDefinitions().length} tools active`);
  console.log(`${ANSI.dim}Type your request or use slash commands (/help, /swarm, /verify, /memory, /exit)${ANSI.reset}\n`);

  // Non-interactive print mode: sg -p "prompt" or sg "prompt"
  const cliArgs = process.argv.slice(2);
  if (cliArgs.length > 0) {
    const promptArg = cliArgs[0] === '-p' || cliArgs[0] === '--print' 
      ? cliArgs.slice(1).join(' ') 
      : cliArgs.join(' ');

    if (promptArg) {
      console.log(`${ANSI.cyan}${ANSI.bold}Prompt:${ANSI.reset} ${promptArg}`);
      console.log(`${ANSI.dim}Thinking...${ANSI.reset}`);
      const resp = await agent.run(promptArg, {
        onThought: (thought) => console.log(`${ANSI.dim}[Thought] ${thought}${ANSI.reset}`),
        onToken: (token) => process.stdout.write(token)
      });
      console.log('\n');
      process.exit(0);
    }
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: `${ANSI.cyan}${ANSI.bold}sg > ${ANSI.reset}`
  });

  rl.prompt();

  rl.on('line', async (line) => {
    const input = line.trim();
    if (!input) {
      rl.prompt();
      return;
    }

    if (input === '/exit' || input === '/quit') {
      console.log(`${ANSI.yellow}Exiting Supergravity session.${ANSI.reset}`);
      process.exit(0);
    }

    if (input === '/help') {
      console.log(`
${ANSI.bold}Available Commands:${ANSI.reset}
  /help           Show this help message
  /swarm <goal>   Coordinate Lead Architect, Staff Engineer, and QA Tester in parallel
  /verify         Run automated syntax check and test suite across workspace
  /memory         Inspect persistent project memory stored in SQLite
  /tools          List all registered agent tools and parameters
  /exit           Exit the terminal session
`);
      rl.prompt();
      return;
    }

    if (input === '/tools') {
      console.log(`\n${ANSI.bold}Registered Agent Tools:${ANSI.reset}`);
      for (const t of tools.getDefinitions()) {
        console.log(`  ${ANSI.cyan}• ${t.name}${ANSI.reset}: ${t.description}`);
      }
      console.log();
      rl.prompt();
      return;
    }

    if (input === '/memory') {
      const records = memory.getAllMemory();
      console.log(`\n${ANSI.bold}Persistent Memory Records (${records.length}):${ANSI.reset}`);
      for (const r of records) {
        console.log(`  [${r.category}] ${ANSI.yellow}${r.key}${ANSI.reset}: ${r.value}`);
      }
      console.log();
      rl.prompt();
      return;
    }

    if (input === '/verify') {
      console.log(`${ANSI.yellow}Running workspace verification...${ANSI.reset}`);
      const res = await tools.execute('run_verification_suite', {}, { workspaceRoot, sessionID: sessionId });
      console.log(res.output);
      rl.prompt();
      return;
    }

    if (input.startsWith('/swarm')) {
      const goal = input.replace('/swarm', '').trim() || 'Analyze repository and optimize performance.';
      try {
        await swarm.runSwarmWorkflow(goal, (step) => {
          console.log(`${ANSI.blue}${step}${ANSI.reset}`);
        });
      } catch (err: any) {
        console.error(`${ANSI.red}Swarm failed: ${err.message}${ANSI.reset}`);
      }
      rl.prompt();
      return;
    }

    // Standard Agent prompt
    try {
      console.log(`${ANSI.dim}Thinking...${ANSI.reset}`);
      const response = await agent.run(input, {
        onThought: (thought) => {
          console.log(`${ANSI.dim}[Thought] ${thought}${ANSI.reset}`);
        },
        onToken: (token) => {
          process.stdout.write(token);
        }
      });
      console.log('\n');
    } catch (err: any) {
      console.error(`\n${ANSI.red}Execution Error: ${err.message}${ANSI.reset}\n`);
    }

    rl.prompt();
  });
}

main().catch(err => {
  console.error('Fatal initialization error:', err);
  process.exit(1);
});
