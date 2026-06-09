// Hash-based routing. The History API would need server-side rewrites, which contradicts the
// single-file / file:// target (ADR-0004) and the no-server stance (ADR-0005), so the active
// route lives in location.hash (#/compress). With one tool this just resolves the default.
import { defaultTool, toolByRoute } from './registry';
import type { Tool } from './tool';

export const currentRoute = (): string => location.hash.replace(/^#\/?/, '') || defaultTool.route;

export const resolveTool = (): Tool => toolByRoute(currentRoute()) ?? defaultTool;

export const onRouteChange = (handler: () => void): void => {
  window.addEventListener('hashchange', handler);
};
