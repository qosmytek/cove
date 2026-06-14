// The tool registry: the single list the shell routes over. Adding a tool is one entry here
// plus a module that exports `mount`. Each `load` is a dynamic import, so a tool's code (and
// its heavy deps) only download when that tool is actually opened.
import type { Tool } from './tool';

const compress: Tool = {
  id: 'compress',
  title: 'Cove Compress',
  route: 'compress',
  summary: 'Shrink a video on your device.',
  load: () => import('../tools/compress'),
};

const redact: Tool = {
  id: 'redact',
  title: 'Cove Redact',
  route: 'redact',
  summary: 'Black out a PDF on your device.',
  load: () => import('../tools/redact'),
};

const convert: Tool = {
  id: 'convert',
  title: 'Cove Convert',
  route: 'convert',
  summary: 'Convert CSV, JSON, and Parquet on your device.',
  load: () => import('../tools/convert'),
};

const notes: Tool = {
  id: 'notes',
  title: 'Cove Notes',
  route: 'notes',
  summary: 'Keep encrypted notes on your device.',
  load: () => import('../tools/notes'),
};

export const tools: Tool[] = [compress, redact, convert, notes];

/** The tool shown when the route is empty or unknown. */
export const defaultTool: Tool = compress;

export const toolByRoute = (route: string): Tool | undefined =>
  tools.find((t) => t.route === route);
