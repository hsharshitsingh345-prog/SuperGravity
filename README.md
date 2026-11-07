# ⚛️ Supergravity (`sg`)

> **Next-Generation Autonomous Multi-Agent Engineering Engine & ACP Runtime**  
> *Universal Model Engine • Tri-Phase Auto-Verification • Multi-Agent Swarm • Zero-Dependency Architecture*

---

## 🌟 Why Supergravity is Built to Outperform Antigravity

While Google Antigravity is a formidable platform, it is tightly bound to Google Cloud Code / Gemini infrastructure and standard turn-based prompt/response cycles. **Supergravity** addresses and overcomes these core architectural bottlenecks:

| Dimension | Google Antigravity (`agy`) | Supergravity (`sg`) |
| :--- | :--- | :--- |
| **Model Independence** | Vendor-locked to Gemini / Google Cloud Code API | **Universal Engine**: Native support for Gemini, Claude 3.5 Sonnet, GPT-4o, DeepSeek R1/V3, and Local Models (Ollama, vLLM, LM Studio) |
| **Verification Loop** | Reactive (detects syntax errors only if the user or next prompt notices) | **Tri-Phase Automated Verifier**: Proactively tests syntax (JS/TS, Python, JSON) and runs regression suites after edits with auto-rollback |
| **Agent Collaboration** | Basic parent-subagent delegation | **Hierarchical Swarm Architecture**: Specialized Lead Architect, Staff Engineer, Security Critic, and QA Tester operating in concert |
| **Memory & State** | Complex opaque proto files (`.pbtxt`, `.pb`) | **Lightning-Fast SQLite Store**: Built-in zero-dependency `node:sqlite` indexing sessions, messages, and persistent knowledge |
| **Runtime Footprint** | Heavy ~214.7 MB CGO binary | **Ultra-Lightweight & Fast**: Zero external npm dependencies, running on native Node.js v26 with TypeScript type-stripping |
| **Control Surfaces** | CLI + Electron Desktop | **Triple Surface**: Interactive TUI, Standards-Compliant ACP JSON-RPC Stdio Server, and Real-Time Reactive Web Dashboard |

---

## 🚀 Quickstart

### 1. Requirements
- Node.js `v22.6.0+` or `v26+` (for native `--experimental-strip-types` and `node:sqlite`).

### 2. Interactive Terminal (TUI)
Launch the interactive terminal session:
```bash
npm start
# or
node bin/sg.js
```

### 3. Non-Interactive Print Mode
Run single-prompt commands unattended:
```bash
node bin/sg.js -p "Inspect repository structure and check for missing tests"
```

### 4. Live Reactive Web Dashboard
Start the visual control center on `http://localhost:4567`:
```bash
npm run web
# or
node bin/sg.js web
```

### 5. Agent Client Protocol (ACP) Server
Bridge Supergravity to any IDE (VS Code, Cursor, Neovim) using standard JSON-RPC 2.0 stdio:
```bash
npm run acp
# or
node bin/sg.js acp
```

---

## 📐 Core Architecture & Modules

```
c:/Users/Harshit Singh/antiproject4/
├── bin/
│   └── sg.js                   # Universal CLI executable entrypoint
├── src/
│   ├── core/
│   │   └── types.ts            # Type contracts (Messages, Tools, LLM Providers, Checkpoints)
│   ├── engine/
│   │   ├── agent-loop.ts       # Tri-Phase loop (Think ➡️ Plan ➡️ Act ➡️ Verify)
│   │   └── memory.ts           # Built-in node:sqlite persistent session & knowledge store
│   ├── interfaces/
│   │   ├── acp-server.ts       # Standards-compliant ACP JSON-RPC stdio daemon
│   │   └── web-dashboard.ts    # Zero-dependency HTTP visualizer & chat canvas
│   ├── providers/
│   │   ├── gemini.ts           # Google Gemini 2.0 / 1.5 Flash/Pro with Function Calling
│   │   ├── openai.ts           # Universal OpenAI / DeepSeek / Ollama provider
│   │   └── router.ts           # Multi-model router with automatic failover
│   ├── swarm/
│   │   └── swarm.ts            # Multi-agent coordinator (Architect, Engineer, Critic, QA)
│   ├── tools/
│   │   ├── filesystem.ts       # Atomic read, write, surgical edit, and tree search
│   │   ├── registry.ts         # Central tool registry with JSON Schema parameter validation
│   │   ├── terminal.ts         # Command execution & background task tracking
│   │   └── verifier.ts         # Automated syntax check & test suite verification
│   └── cli.ts                  # Interactive TUI with syntax styling and slash commands
├── tests/
│   └── supergravity.test.ts    # Native test suite (node:test)
└── package.json
```

---

## 🛠️ Tool Registry

Supergravity exposes 9 native tools to the LLM core:
- `read_file`: Read file contents with line range slicing.
- `write_file`: Atomic file writing with directory creation.
- `edit_file`: Exact surgical replacement with diff tracking.
- `list_dir`: Recursive file and directory tree scanner.
- `search_code`: Regex search across all files with line numbers.
- `run_command`: Execution with timeout guards and background daemon mode.
- `manage_task`: Inspect, monitor, or kill background tasks.
- `verify_syntax`: Automated syntax verification for JS/TS, Python, and JSON.
- `run_verification_suite`: Automated test suite runner ensuring zero regressions.

---

## 🤖 Multi-Agent Swarm (`/swarm`)

Type `/swarm <goal>` to orchestrate the four specialist agents:
1. **Lead Architect**: Decomposes the goal into discrete architectural milestones.
2. **Staff Engineer**: Executes surgical code implementation and refactoring.
3. **Security Critic**: Audits changes for edge cases and security risks.
4. **QA Tester**: Generates unit tests and validates full suite passing.

---

## 🧪 Testing

Supergravity includes an end-to-end verification suite running on `node:test`:
```bash
npm test
```
Result: **100% Passing (5 suites, 0 failures)**.

---

## 📄 License
Apache-2.0

