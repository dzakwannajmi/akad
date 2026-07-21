// Shim: isomorphic-ws's browser build only has a default export,
// but some Midnight SDK packages import it as `import * as ws from 'isomorphic-ws'`
// then access `ws.WebSocket`. This bridges both forms.
// IMPORTANT: import from browser.js directly to avoid the alias below
// resolving back to this same file (circular self-import).
import WS from 'isomorphic-ws/browser.js';
export const WebSocket = WS;
export default WS;
