# Progressive Enhancement & Graceful Degradation

> **Status:** Draft · **Last updated:** 2026-06-06 · **Owner:** Victor Senna Seleimend
> **Section:** [Quality](./) · ← [Documentation Index](../README.md)

Two sides of one principle: **core actions work before any heavy engine loads** (enhancement), and
**when a capability is missing, we degrade to something still useful** (degradation).

## Progressive enhancement
- The **shell is usable immediately**: a user can read what the tool does and **select a file** before
  any WASM loads.
- Heavy engines load **only on intent**, layering capability on a working base. See
  [Performance Budget](./performance-budget.md).
- Nothing essential depends on the [command palette](../features/08-command-palette.md) or on being
  installed — those are enhancements.

## Capability detection (detect, then choose the best path)
| Capability | If present | If absent (fallback) |
| ---------- | ---------- | -------------------- |
| `SharedArrayBuffer` / cross-origin isolation | Multi-threaded WASM | **Single-threaded** WASM |
| File System Access API | Read/save in place | `<input type="file">` + **download** |
| OPFS | Fast scratch space | In-memory buffers (smaller limits) |
| WebGPU | On-device AI | Lighter model / keyword path / labeled opt-in proxy |
| Service worker | Offline + install | Works as a normal online tab |

## Graceful degradation rules
- **Never hard-fail silently.** If a path isn't available, say so and offer the next best option.
- **A lighter mode stays usable:** if the heavy engine can't load, keep a usable lighter mode where one
  exists.
- **Be honest about limits** (e.g., a smaller max file size on the in-memory path).

## Why this matters here
It directly serves [Marco](../product/personas.md) (flaky devices and networks) and protects the
[performance budget](./performance-budget.md) and [accessibility](./accessibility.md) by keeping the
base experience light and robust.

## Acceptance criteria
- [ ] Shell + file selection work before/without the engine.
- [ ] Each detected capability has a tested fallback.
- [ ] Missing-capability states show a clear message and the best available alternative.

See also: [Risks](../reference/risks.md) · [Architecture Overview](../architecture/overview.md)
