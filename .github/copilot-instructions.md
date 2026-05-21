# VecTrade AI Provider — Copilot Instructions

## Workflow

All agents follow the standard workflow defined in `instructions/agent-workflow.instructions.md`:
**Implement → Verify → Changelog → Commit**

## Agents

| Agent | When to Use |
|-------|------------|
| `@vt-ai-dev` | Implementing AI provider tools |
| `@vt-ai-tester` | Writing/fixing tests |

## Conventions

- TypeScript 5.x strict
- Vercel AI SDK provider interface
- Zero external deps beyond the AI SDK
- Tool names match VecTrade API resources
- Descriptions optimized for LLM tool selection

## Build & Test

```bash
npm ci                     # Install
npm run build              # Build (tsup)
npm test                   # Run tests (vitest)
npm run typecheck          # tsc --noEmit
```
