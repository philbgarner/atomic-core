// src/lib/transport/types.ts
//
// Interfaces for the optional action transport middleware.
//
// When a transport is passed to createGame(), game.turns.commit() routes
// actions through the transport instead of applying them locally. The server
// is then authoritative: it validates each action, updates canonical state,
// and broadcasts a ServerStateUpdate to all connected clients. Each client's
// reconciliation handler (wired automatically inside createGame) applies that
// update to the local turn state and re-emits the "turn" event.
//
// Single-player (no transport): zero overhead, zero code change.

import type { TurnAction } from '../turn/types';

// ---------------------------------------------------------------------------
// State shapes shared between client and server
// ---------------------------------------------------------------------------

/**
 * Network state snapshot for a single player, broadcast in every `ServerStateUpdate`.
 *
 * The server is authoritative for `x`, `y`, `hp`, `maxHp`, `alive`, and `facing`.
 * All other fields are relayed verbatim from the client's entity object, so peers
 * can access developer-defined attributes (e.g. `mp`, `stamina`, `spriteName`)
 * directly on the entity without any extra unwrapping.
 */
export type PlayerNetState = {
  /** Grid X position. */
  x: number;
  /** Grid Y position (row — maps to entity.z on the client). */
  y: number;
  hp: number;
  maxHp: number;
  alive: boolean;
  /** Yaw in radians. Optional — omit when server doesn't track facing. */
  facing?: number;
  /** Developer-defined entity fields relayed from the client. */
  [key: string]: unknown;
};

/** Minimal monster state needed to render enemies on non-host clients. */
export type MonsterNetState = {
  id: string;
  kind: 'enemy';
  /** Sprite atlas name (matches EntityBase.spriteName). */
  spriteName: string;
  x: number;
  z: number;
  hp: number;
  maxHp: number;
  alive: boolean;
  attack: number;
  defense: number;
  speed: number;
  blocksMove: boolean;
  faction: string;
  tick: number;
  spriteMap?: unknown;
  /** @deprecated Use spriteName. Kept for backward compatibility with older save files. */
  type?: string;
  /** @deprecated Use spriteName. Kept for backward compatibility with older save files. */
  sprite?: string | number;
};

/** Broadcast by the server after every accepted action. */
export type ServerStateUpdate = {
  /** Canonical state for every connected player. */
  players: Record<string, PlayerNetState>;
  turn: number;
  /** Current monster positions/state, supplied by the host. */
  monsters?: MonsterNetState[];
};

/**
 * Payload for a single-cell dungeon modification sent via dungeon.set().
 * Mirrors SetCellOptions (minus skipSync) so the transport layer stays
 * independent of createGame's type definitions.
 */
export type DungeonSetPayload = {
  x: number;
  y: number;
  spriteName: string;
  options?: {
    applyTextureTo?: string[];
    solid?: boolean;
    colliderFlags?: { walkable?: boolean; blocked?: boolean; lightPassable?: boolean };
    floorHeightOffset?: number;
    ceilingHeightOffset?: number;
    skyPanelCount?: number;
    ceilingPanelCount?: number;
    floorSkirt?: (string | null)[];
    ceilingSkirt?: (string | null)[];
    hazard?: number;
    temperature?: number;
  };
};

/** Sent by the host client after generate() so the server can validate moves. */
export type DungeonInitPayload = {
  /** Flat Uint8Array contents: 0 = walkable, >0 = solid. */
  solid: number[];
  width: number;
  height: number;
  /** Original dungeon config so the server can share it with late-joiners. */
  config: Record<string, unknown>;
};

// ---------------------------------------------------------------------------
// Transport interface
// ---------------------------------------------------------------------------

/**
 * Dependency-injection interface for the optional multiplayer transport layer.
 *
 * Pass an implementation to `GameOptions.transport` to make the server
 * authoritative for all player actions. Omit for single-player — zero overhead.
 *
 * Use `createWebSocketTransport(url)` for a ready-made WebSocket implementation.
 */
export type ActionTransport = {
  /**
   * Connect to the server. Resolves with the server-assigned player ID and
   * whether this client is the room host (first to join). Non-host clients
   * also receive the dungeon config so they can generate the same dungeon.
   */
  connect(meta?: Record<string, unknown>): Promise<{
    playerId: string;
    isHost: boolean;
    dungeonConfig?: Record<string, unknown>;
  }>;

  /**
   * Send a player action to the authoritative server instead of applying it
   * locally. Called automatically by game.turns.commit() when a transport is
   * configured.
   *
   * `entityState` carries the client's current entity fields (everything except
   * server-managed position/hp/alive). The server relays these to all peers so
   * they can read developer-defined attributes directly on the entity object.
   */
  send(action: TurnAction, entityState?: Record<string, unknown>): void;

  /**
   * Register a handler that fires whenever the server pushes a state update.
   * Multiple handlers are supported — each call appends a new subscriber.
   * createGame() registers one internally for reconciliation; the example can
   * register another to track other players for rendering.
   */
  onStateUpdate(handler: (update: ServerStateUpdate) => void): void;

  /**
   * Send the dungeon solid map and config to the server. Called by the host
   * client after game.generate() completes so the server can validate moves
   * and share the config with late-joining clients.
   */
  initDungeon(payload: DungeonInitPayload): void;

  disconnect(): void;

  /** Server-assigned player ID. Null before connect() resolves. */
  readonly playerId: string | null;

  /**
   * Send a chat message to all players in the room.
   */
  sendChat(text: string): void;

  /**
   * Send the current monster state to the server so it can be broadcast to
   * all connected clients. Should be called by the host after generate() and
   * after every turn in which monsters move or change state.
   */
  sendMonsterState(monsters: MonsterNetState[]): void;

  /**
   * Register a handler that fires whenever a chat message is received.
   */
  onChat(handler: (msg: { playerId: string; text: string }) => void): void;

  // ---------------------------------------------------------------------------
  // Mission notifications (optional — omit for non-mission transports)
  // ---------------------------------------------------------------------------

  /**
   * Notify the server that this player completed a mission. The server is
   * expected to broadcast this to all other connected clients so they can
   * emit a `mission-peer-complete` event locally.
   *
   * Optional — if absent, mission completions are not broadcast to peers.
   */
  sendMissionComplete?(missionId: string, name: string): void;

  /**
   * Register a handler that fires when the server relays a mission completion
   * from another connected player. `createGame()` wires this internally to
   * emit the `mission-peer-complete` event on the game event emitter.
   *
   * Optional — if absent, peer mission events are never emitted.
   */
  onMissionComplete?(handler: (msg: { playerId: string; missionId: string; name: string }) => void): void;

  /**
   * Send a single-cell dungeon modification to the server so it can update its
   * authoritative solid map and broadcast the change to all other connected clients.
   * Called automatically by dungeon.set() when skipSync is not true.
   *
   * Optional — if absent, dungeon.set() applies changes locally only.
   */
  sendDungeonSet?(payload: DungeonSetPayload): void;

  /**
   * Register a handler that fires when the server relays a dungeon cell change
   * from another client. createGame() wires this internally to apply the change
   * locally with skipSync: true so it doesn't echo back to the server.
   *
   * Optional — if absent, remote dungeon.set() changes are never applied locally.
   */
  onDungeonSet?(handler: (payload: DungeonSetPayload) => void): void;
};
