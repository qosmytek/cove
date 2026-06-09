// Entry point. The shell takes over from here: it routes to a tool (the compressor for now),
// lazy-loads it, and mounts it into #tool-host. See src/shell/ for the tool contract.
import { startShell } from './shell/shell';

void startShell();
