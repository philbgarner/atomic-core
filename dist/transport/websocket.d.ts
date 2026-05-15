import { ActionTransport } from './types';
/**
 * Create a browser-side WebSocket transport for multiplayer.
 * Pass the returned `ActionTransport` to `createGame()` via `GameOptions.transport`.
 *
 * @param url  WebSocket server URL (e.g. `"ws://localhost:3001"`).
 */
export declare function createWebSocketTransport(url: string): ActionTransport;
//# sourceMappingURL=websocket.d.ts.map