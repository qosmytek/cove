// The tool contract. A tool is a self-contained module the shell can mount into a host
// element; it never reaches for the shell or the DOM outside its host. Everything it needs
// arrives through ToolContext, and `mount` returns a cleanup fn the shell calls on teardown.
import type { Capabilities } from '../capabilities';
import type { Command } from '../palette';

export interface ToolContext {
  /** The element the tool renders into. Cleared by the shell between mounts. */
  host: HTMLElement;
  /** Capabilities detected once by the shell, shared with every tool. */
  caps: Capabilities;
  /** Contribute commands to the shell's global ⌘K palette (dropped on unmount). */
  registerCommands(commands: Command[]): void;
}

export interface ToolModule {
  /** Render into ctx.host; return a cleanup fn (abort work, drop global listeners). */
  mount(ctx: ToolContext): () => void;
}

export interface Tool {
  id: string;
  title: string;
  /** Hash route segment, e.g. 'compress' → #/compress. */
  route: string;
  summary: string;
  /** Lazy-loads the tool module so each tool's code splits into its own chunk. */
  load: () => Promise<ToolModule>;
}
