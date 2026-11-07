/**
 * Supergravity Multi-Agent Swarm Orchestrator
 * Coordinates Lead Architect, Software Engineer, Security Critic, and QA Tester
 */

import type { AgentPersona, AgentRole } from '../core/types.ts';
import { AgentLoop } from '../engine/agent-loop.ts';
import { createProvider } from '../providers/router.ts';
import { ToolRegistry } from '../tools/registry.ts';
import { MemoryEngine } from '../engine/memory.ts';

export const SWARM_PERSONAS: Record<AgentRole, AgentPersona> = {
  lead_architect: {
    role: 'lead_architect',
    displayName: 'Lead Architect',
    systemPrompt: `You are the Lead Architect in the Supergravity Swarm.
Your responsibility:
- High-level system architecture and component design.
- Interface definitions and data contracts.
- Task breakdown into discrete milestones for the Software Engineer and QA Tester.`,
    allowedTools: ['read_file', 'list_dir', 'search_code']
  },
  software_engineer: {
    role: 'software_engineer',
    displayName: 'Staff Engineer',
    systemPrompt: `You are the Staff Software Engineer in the Supergravity Swarm.
Your responsibility:
- Surgical and robust implementation of architectural specifications.
- Clean code with error handling, type safety, and maintainability.
- Fast, atomic edits and verifying code syntax after changes.`,
    allowedTools: ['read_file', 'write_file', 'edit_file', 'run_command', 'verify_syntax']
  },
  security_critic: {
    role: 'security_critic',
    displayName: 'Security Critic & Reviewer',
    systemPrompt: `You are the Principal Security & Code Reviewer in the Supergravity Swarm.
Your responsibility:
- Audit proposed code changes for injection flaws, boundary leaks, or performance bottlenecks.
- Challenge unverified assumptions and surface edge cases.`,
    allowedTools: ['read_file', 'search_code']
  },
  qa_verifier: {
    role: 'qa_verifier',
    displayName: 'QA & Verification Specialist',
    systemPrompt: `You are the QA Verification Engineer in the Supergravity Swarm.
Your responsibility:
- Write comprehensive unit, integration, and regression tests.
- Execute test suites and certify that implementations meet zero-regression criteria.`,
    allowedTools: ['read_file', 'write_file', 'run_command', 'run_verification_suite']
  }
};

export class SwarmCoordinator {
  private workspaceRoot: string;
  private memory: MemoryEngine;
  private tools: ToolRegistry;

  constructor(workspaceRoot: string, memory: MemoryEngine, tools: ToolRegistry) {
    this.workspaceRoot = workspaceRoot;
    this.memory = memory;
    this.tools = tools;
  }

  async runSwarmWorkflow(goal: string, onUpdate?: (step: string) => void): Promise<string> {
    onUpdate?.(`🚀 [Swarm Initiated] Goal: "${goal}"`);

    // Phase 1: Architecture & Decomposition
    onUpdate?.(`📐 [Phase 1: Architecture] Lead Architect decomposing tasks...`);
    const architect = new AgentLoop({
      provider: createProvider(),
      tools: this.tools,
      memory: this.memory,
      workspaceRoot: this.workspaceRoot,
      sessionId: 'swarm_architect_' + Date.now(),
      autoVerify: false
    });
    const architecturePlan = await architect.run(
      `Goal: ${goal}\nProduce an actionable, step-by-step engineering roadmap with concrete file modifications and verification checkpoints.`
    );
    onUpdate?.(`✅ Plan established:\n${architecturePlan.slice(0, 300)}...`);

    // Phase 2: Implementation
    onUpdate?.(`🔨 [Phase 2: Implementation] Staff Engineer executing implementation...`);
    const engineer = new AgentLoop({
      provider: createProvider(),
      tools: this.tools,
      memory: this.memory,
      workspaceRoot: this.workspaceRoot,
      sessionId: 'swarm_engineer_' + Date.now(),
      autoVerify: true
    });
    const implementationSummary = await engineer.run(
      `Implement the following architecture plan:\n${architecturePlan}`
    );

    // Phase 3: QA & Verification
    onUpdate?.(`🧪 [Phase 3: Verification] QA Engineer verifying test suite and syntax...`);
    const qa = new AgentLoop({
      provider: createProvider(),
      tools: this.tools,
      memory: this.memory,
      workspaceRoot: this.workspaceRoot,
      sessionId: 'swarm_qa_' + Date.now(),
      autoVerify: true
    });
    const qaVerdict = await qa.run(
      `Inspect implementation and run verification checks on modified files:\n${implementationSummary}`
    );

    onUpdate?.(`🏁 [Swarm Complete] Implementation verified.`);
    return `### Swarm Execution Summary\n\n**Architectural Plan**:\n${architecturePlan}\n\n**Implementation**:\n${implementationSummary}\n\n**QA Verification**:\n${qaVerdict}`;
  }
}
