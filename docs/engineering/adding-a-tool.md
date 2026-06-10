# Adding a Tool

> **Status:** Draft · **Last updated:** 2026-06-09 · **Owner:** Victor Senna Seleimend
> **Section:** [Engineering](./) · ← [Documentation Index](../README.md)

Cove is a thin **shell** with **tools** that slot into it. A tool is a lazy-loaded module behind a
small contract — no framework ([ADR-0008](../architecture/decisions/0008-no-ui-framework.md)) and no
server ([ADR-0005](../architecture/decisions/0005-no-server-no-account.md)). This is the recipe.

## The contract (`src/shell/tool.ts`)
- **`Tool`** — registry metadata: `id`, `title`, `route`, `summary`, and `load()` (a dynamic import).
- **`ToolModule`** — what `load()` resolves to: an object exporting `mount(ctx)`.
- **`ToolContext`** — what the shell hands each tool on mount:

| Field | Purpose |
| ----- | ------- |
| `host` | The element to render into; the shell clears it between tools. |
| `caps` | Platform capabilities (`src/capabilities.ts`) detected once by the shell. |
| `registerCommands(cmds)` | Contribute ⌘K palette commands; dropped automatically on unmount. |
| `setCapabilityNotice(n)` | Show a capability/fallback banner in the shell's notice region (`null` clears). |

## Steps
1. **Create `src/tools/<id>.ts`** exporting `mount(ctx: ToolContext): () => void`. Render your own
   markup into `ctx.host`, and **return a cleanup function** that aborts in-flight work, removes any
   global listeners, and clears notices/timers.
2. **Register it** in `src/shell/registry.ts`:
   ```ts
   {
     id: 'redact', title: 'Cove Redact', route: 'redact',
     summary: 'Black out a PDF on your device.',
     load: () => import('../tools/redact'),
   }
   ```
   The dynamic `import` puts the tool's code (and its heavy deps) in its own chunk, off the initial
   load. The first registry entry is the default route.
3. **Routing is automatic** — hash-based (`#/redact`), owned by the shell. (The History API would need
   server rewrites, ruled out by [ADR-0004](../architecture/decisions/0004-single-file-build-target.md)
   / [ADR-0005](../architecture/decisions/0005-no-server-no-account.md).)
4. **Read capabilities** from `ctx.caps`. Need a flag that isn't there yet? Add one sync check to
   `Capabilities` in `src/capabilities.ts`. Surface any degraded path with
   `ctx.setCapabilityNotice({ level, text })` rather than rolling your own banner.
5. **Register commands** via `ctx.registerCommands([...])`, each driving the *same* control as the UI
   so the two never drift ([Command Palette](../features/08-command-palette.md)).
6. **Offer diagnostics** (telemetry-free): a "Copy diagnostics" affordance — a Details button plus a
   palette command — built with `formatDiagnostics()` (`src/diagnostics.ts`) over `ctx.caps` + your
   log. Nothing is transmitted; the user reviews the report and chooses to share it.
7. **Stay in budget and accessible**: the [performance budget](../quality/performance-budget.md) is
   enforced in CI; keep the tool framework-free and fully keyboard- and screen-reader-operable
   ([Accessibility](../quality/accessibility.md)).

## Minimal example
```ts
import type { ToolContext } from '../shell/tool';

export function mount(ctx: ToolContext): () => void {
  ctx.host.innerHTML = '<h2>Hello</h2>';
  ctx.registerCommands([
    {
      id: 'hello',
      title: 'Say hello',
      run: () => {
        ctx.host.textContent = 'hi';
      },
    },
  ]);
  return () => {
    // abort work, remove global listeners, ctx.setCapabilityNotice(null)
  };
}
```

The video compressor (`src/tools/compress.ts`) is the worked reference for every step above.

See also: [Architecture Overview](../architecture/overview.md) ·
[Decisions](../architecture/decisions/README.md) · [Testing Strategy](./testing-strategy.md).
