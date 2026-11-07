/**
 * Supergravity Core Verification Test Suite
 * Powered by node:test
 */

import { test, describe, before, after } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { ToolRegistry } from '../src/tools/registry.ts';
import { MemoryEngine } from '../src/engine/memory.ts';
import { AgentLoop } from '../src/engine/agent-loop.ts';
import { createProvider } from '../src/providers/router.ts';

describe('Supergravity Framework Test Suite', () => {
  const testWorkspace = path.resolve(process.cwd(), '.test_workspace');
  let tools: ToolRegistry;
  let memory: MemoryEngine;

  before(async () => {
    await fs.mkdir(testWorkspace, { recursive: true });
    tools = new ToolRegistry();
    memory = new MemoryEngine(path.join(testWorkspace, '.memory'));
  });

  after(async () => {
    memory.close();
    try {
      await fs.rm(testWorkspace, { recursive: true, force: true });
    } catch {}
  });

  test('ToolRegistry initializes all core tools', () => {
    const definitions = tools.getDefinitions();
    const names = definitions.map(d => d.name);
    assert.ok(names.includes('read_file'));
    assert.ok(names.includes('write_file'));
    assert.ok(names.includes('edit_file'));
    assert.ok(names.includes('verify_syntax'));
    assert.ok(names.includes('run_command'));
    assert.ok(names.includes('run_verification_suite'));
    assert.ok(definitions.length >= 8);
  });

  test('Filesystem tools: atomic write, read, surgical edit', async () => {
    const ctx = { workspaceRoot: testWorkspace, sessionID: 'test_session' };

    // 1. Write file
    const writeRes = await tools.execute('write_file', {
      path: 'sample.js',
      content: 'function hello() {\n  return "world";\n}\n'
    }, ctx);
    assert.strictEqual(writeRes.isError, false);

    // 2. Read file
    const readRes = await tools.execute('read_file', {
      path: 'sample.js',
      startLine: 1,
      endLine: 3
    }, ctx);
    assert.strictEqual(readRes.isError, false);
    assert.ok(readRes.output.includes('return "world";'));

    // 3. Edit file surgically
    const editRes = await tools.execute('edit_file', {
      path: 'sample.js',
      target: '"world"',
      replacement: '"supergravity"'
    }, ctx);
    assert.strictEqual(editRes.isError, false);

    // 4. Verify content updated
    const verifyRead = await tools.execute('read_file', { path: 'sample.js' }, ctx);
    assert.ok(verifyRead.output.includes('"supergravity"'));
  });

  test('Verification Engine: detects valid and broken syntax', async () => {
    const ctx = { workspaceRoot: testWorkspace, sessionID: 'test_session' };

    // Valid JSON
    await tools.execute('write_file', {
      path: 'config.json',
      content: '{"agent": "supergravity", "version": 1}'
    }, ctx);
    const validJson = await tools.execute('verify_syntax', { filePath: 'config.json' }, ctx);
    assert.strictEqual(validJson.isError, false);

    // Invalid JSON
    await tools.execute('write_file', {
      path: 'broken.json',
      content: '{"agent": "supergravity", INVALID}'
    }, ctx);
    const invalidJson = await tools.execute('verify_syntax', { filePath: 'broken.json' }, ctx);
    assert.strictEqual(invalidJson.isError, true);
  });

  test('Persistent Memory Engine: stores and queries state via node:sqlite', () => {
    const sessionId = 'session_unit_test_' + Date.now();
    memory.createSession(sessionId, 'Unit Test Session');
    memory.saveMessage(sessionId, 'user', 'What is Supergravity?');
    memory.saveMessage(sessionId, 'assistant', 'An elite agentic engineering engine.');

    const messages = memory.getMessages(sessionId);
    assert.strictEqual(messages.length, 2);
    assert.strictEqual(messages[0].content, 'What is Supergravity?');

    memory.setMemory('architecture_style', 'tri-phase-loop', 'design');
    const stored = memory.getMemory('architecture_style');
    assert.strictEqual(stored, 'tri-phase-loop');
  });

  test('Autonomous Agent Loop executes turn with auto-verification', async () => {
    const agent = new AgentLoop({
      provider: createProvider(),
      tools,
      memory,
      workspaceRoot: testWorkspace,
      sessionId: 'agent_loop_test',
      autoVerify: true
    });

    const response = await agent.run('Inspect workspace files');
    assert.ok(typeof response === 'string');
    assert.ok(response.length > 0);
  });
});
