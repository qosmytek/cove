// Entry for the single-file redactor build (ADR-0004 / feature 02). It mounts ONLY the redactor
// into a minimal host — no shell router, no command palette, no service worker (SF-2: one tool).
// Everything is inlined by vite-plugin-singlefile (vite.config.single.ts), so this runs from
// file://. The redactor's own buttons cover every action, so dropping the palette costs nothing.
import { detectCapabilities } from '../capabilities';
import type { CapabilityNotice } from '../shell/tool';
import { mount } from '../tools/redact';

const host = document.getElementById('tool-host');
const noticeEl = document.getElementById('capability-notice');
if (!host) throw new Error('missing #tool-host');

const setCapabilityNotice = (notice: CapabilityNotice | null): void => {
  if (!noticeEl) return;
  noticeEl.textContent = notice?.text ?? '';
  noticeEl.classList.toggle('warn', notice?.level === 'warn');
  noticeEl.hidden = notice === null;
};

mount({
  host,
  caps: detectCapabilities(),
  registerCommands: () => {
    // The single-file build has no command palette; every action is a visible control.
  },
  setCapabilityNotice,
});
