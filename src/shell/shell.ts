// The app shell: owns the brand chrome (static in index.html), the global ⌘K palette, the
// shared capability detection + notice region, and a single tool host. It reads the hash
// route, lazy-loads the matching tool, mounts it, and swaps tools on navigation. Tools only
// ever see a ToolContext (see ./tool) — they never touch the shell or the rest of the page.
import { detectCapabilities } from '../capabilities';
import { type Command, createPalette } from '../palette';
import { tools } from './registry';
import { onRouteChange, resolveTool } from './router';
import type { CapabilityNotice } from './tool';

export async function startShell(): Promise<void> {
  const host = document.getElementById('tool-host');
  if (!host) throw new Error('missing #tool-host');
  const caps = detectCapabilities();

  // Shell-owned capability/fallback notice: one consistent, accessible slot that the active
  // tool feeds (see ToolContext.setCapabilityNotice), reset between tools.
  const noticeEl = document.getElementById('capability-notice');
  const setCapabilityNotice = (notice: CapabilityNotice | null): void => {
    if (!noticeEl) return;
    noticeEl.textContent = notice?.text ?? '';
    noticeEl.classList.toggle('warn', notice?.level === 'warn');
    noticeEl.hidden = notice === null;
  };

  // The active tool pushes its commands here; createPalette reads this array live on each
  // open, so (un)registration is just mutation — no need to rebuild the palette per tool.
  const commands: Command[] = [];
  const palette = createPalette(commands);
  document.getElementById('cmdk')?.addEventListener('click', () => palette.open());
  window.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      palette.open();
    }
  });

  let cleanup: (() => void) | null = null;
  const mountRoute = async (): Promise<void> => {
    cleanup?.();
    cleanup = null;
    commands.length = 0; // drop the previous tool's commands
    setCapabilityNotice(null); // and its capability notice
    host.replaceChildren();
    const tool = resolveTool();
    // Shell-level navigation: every other tool is one ⌘K command away (the calm alternative to
    // nav chrome). Re-added each mount, since the command list is cleared above.
    for (const other of tools) {
      if (other.route === tool.route) continue;
      commands.push({
        id: `goto-${other.id}`,
        title: `Open ${other.title}`,
        aliases: ['switch', 'tool', other.id],
        run: () => {
          location.hash = `#/${other.route}`;
        },
      });
    }
    const mod = await tool.load();
    cleanup = mod.mount({
      host,
      caps,
      registerCommands: (cmds) => {
        commands.push(...cmds);
      },
      setCapabilityNotice,
    });
  };

  onRouteChange(() => {
    void mountRoute();
  });
  await mountRoute();
}
