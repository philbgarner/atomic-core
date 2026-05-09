// tutorial.js — atomic-core full tutorial example
//
// Demonstrates all ten core systems through chained and parallel missions:
//
//  1. First Steps      — move 5 times (metadata + position tracking)
//  2. Into the Dark    — enter a corridor adjacent to the start room (BSP graph)
//  3. Wait and Watch   — press Space 3 consecutive turns (action tracking)
//  4. Open a Chest     — find and open the chest with F (decorations API)
//  5. Pick Up an Item  — collect the item from the chest (item-pickup event)
//  6. Use an Item      — press U to use the Health Potion (useItem pattern)
//  7. First Blood      — deal damage to an enemy (combat.onDamage callback)
//  8. Enemy Slain      — kill an enemy (combat.onDeath callback)
//  9. Explorer         — reveal 30% of the dungeon (FoV-radius approximation)
// 10. Find the Exit    — reach the exit room (endRoomId from BSP output)
//
// Key patterns shown:
//   - dungeon.onPlace for structured content placement (chest, enemy, endRoom)
//   - attachMinimap for 2D canvas minimap
//   - Mission evaluators as pure boolean functions on player/mission state
//   - Shared closure variables for cross-system flag passing
//   - Per-mission progress display in renderMissions()

import { addLog, globs } from './b/shared.js';

import {
	createGame,
	createEntity,
	attachSpawner,
	attachKeybindings,
	attachMinimap,
	createDungeonRenderer,
	createItem,
	showInventory,
	createWebSocketTransport,
} from 'atomic-core';

// ---------------------------------------------------------------------------
// Tutorial state — shared across missions and event handlers
// ---------------------------------------------------------------------------

/** Last committed action name; set just before game.turns.commit(). */
let _lastAction = null;
/** Incremented once per game.turns.commit(); used to deduplicate mission
 *  evaluators that run multiple times per player action (once per time-step
 *  the scheduler advances — enemy turns count too). */
let _playerActionCount = 0;

/** Position of the chest placed by onPlace. */
let _chestPos = null;
/** True once the player opens the chest with F. */
let _chestOpened = false;
/** The item that drops from the chest. */
let _tutorialItem = null;
/** True once the player has the potion in their tutorial bag. */
let _hasPotionInBag = false;
/** True once the player presses U to use the potion. */
let _itemUsed = false;

/** True once the player deals damage to an enemy. Set in combat.onDamage. */
let _playerDealtDmg = false;
/** True once any enemy is killed. Set in combat.onDeath. */
let _enemyKilled = false;

/** Cached after generate() — Uint8Array where 0 = walkable, >0 = solid. */
let _solidData = null;
/** Dungeon width in tiles; needed to index _solidData. */
let _dungeonW = 0;
/** Total non-solid (walkable) cell count; computed once after generate(). */
let _totalWalkable = 0;
/** Set of "x,z" strings for walkable cells near the player on each turn. */
let _visitedCells = new Set();

/** The exit room (endRoomId → PublicRoom), captured in onPlace. */
let _endRoom = null;
/** Set to true once all non-exit missions are complete and the exit mission unlocks. */
let _exitMissionUnlocked = false;
/** Entities placed via onPlace whose positions are synced in-place by the engine. */
let _placedEnemies = [];

/** Mission ids whose complete animation has already played; rendered hidden. */
const _hiddenMissions = new Set();
/** Mission ids whose complete animation is currently in progress → DOM element.
 *  The element is reused across renderMissions() calls so the animation is
 *  never interrupted and never restarts. */
const _animatingElements = new Map();

export function tutDamage(defender) {
	// defender.faction === 'enemy' means the player attacked an enemy.
	if (defender.faction === "enemy") {
		_playerDealtDmg = true;
	}
}

export function tutDeath(entity) {
	if (entity.faction === "enemy") {
		_enemyKilled = true;
	}
}

export function tutCacheDungeon() {
	// Cache solid data for the exploration mission (mission 9).
	const outputs = window.game.dungeon.outputs;
	_solidData = outputs?.textures?.solid?.image?.data ?? null;
	_dungeonW = outputs?.width ?? 0;
	if (_solidData) {
		for (let i = 0; i < _solidData.length; i++) {
			if (_solidData[i] === 0) _totalWalkable++;
		}
	}

	setupTutorialMissions();
}

// ---------------------------------------------------------------------------
// Chest interaction helper
// ---------------------------------------------------------------------------
export function tutInteract() {
	let a = undefined;
	// Look for an adjacent chest decoration (Manhattan distance ≤ 1).
	const px = window.game.player.x;
	const pz = window.game.player.z;
	const chest = window.game.dungeon.decorations.list.find(
		(d) =>
			d.type === "chest" && Math.abs(d.x - px) + Math.abs(d.z - pz) <= 1,
	);
	if (chest && !_chestOpened) {
		openChest(chest);
		a = game.player.wait(); // opening costs one turn						
	} else if (!chest) {
		addLog("Nothing nearby to interact with.", "turn");
	} else {
		addLog("The chest is already empty.", "turn");
	}
	return a;
}

/**
 * Trigger the chest at the given decoration entity.
 * Emits chest-open and item-pickup events, arms the tutorial item bag.
 */
export function openChest(chest) {
	_chestOpened = true;
	_tutorialItem = createItem({
		name: "Health Potion", type: "health_potion", kind: 'consumable',
		onUse: function ({ player }) {
			// apply effect
		},
	});
	_hasPotionInBag = true;

	// Emit the events so any developer-registered handlers fire (mission 4 and
	// 5 track flags directly, but event subscribers also receive these payloads).
	game.events.emit("chest-open", { chest, loot: [_tutorialItem] });
	game.events.emit("item-pickup", {
		item: _tutorialItem,
		entity: { id: "player", type: "player", faction: "player" },
	});

	addLog(`You found a ${_tutorialItem.name}!`, "mission");
}

// ---------------------------------------------------------------------------
// Tutorial missions
// ---------------------------------------------------------------------------

/**
 * Called at the end of every mission's onComplete. When every currently-added
 * mission (besides "find-exit" itself) is complete, the capstone exit mission
 * is added. The evaluator guards against the player already standing in the
 * exit room at the moment of unlock — they must leave and re-enter.
 */
function tryUnlockExitMission() {
	if (_exitMissionUnlocked) return;

	const pending = game.missions.list.filter(
		(m) => m.id !== "find-exit" && m.status !== "complete",
	);
	if (pending.length > 0) return;

	_exitMissionUnlocked = true;
	addLog("All missions complete — find the exit!", "mission");
	showBanner("Find the Exit!");

	const alreadyInExit =
		_endRoom != null &&
		game.player.x >= _endRoom.x &&
		game.player.x < _endRoom.x + _endRoom.w &&
		game.player.z >= _endRoom.z &&
		game.player.z < _endRoom.z + _endRoom.h;

	game.missions.add({
		id: "find-exit",
		name: "Find the Exit",
		description: "Reach the exit room.",
		metadata: { alreadyInExitAtUnlock: alreadyInExit },

		evaluator({ player, mission }) {
			if (!_endRoom) return false;
			const inRoom =
				player.x >= _endRoom.x &&
				player.x < _endRoom.x + _endRoom.w &&
				player.z >= _endRoom.z &&
				player.z < _endRoom.z + _endRoom.h;
			if (!inRoom) {
				// Once the player leaves the room, clear the "was already here" flag.
				mission.metadata.alreadyInExitAtUnlock = false;
				return false;
			}
			return !mission.metadata.alreadyInExitAtUnlock;
		},

		onComplete() {
			addLog("Mission complete: Find the Exit!", "mission");
			showBanner("Exit reached! Tutorial complete!");
			addLog("--- Tutorial complete! Congratulations! ---", "mission");
			renderMissions();
		},
	});
	renderMissions();
}

function setupTutorialMissions() {
	// ── Mission 1 — First Steps ──────────────────────────────────────────────
	// Count actual grid moves each turn by comparing position via metadata.
	// The null-guard on the first evaluator call prevents the initial turn from
	// counting as a move.
	game.missions.add({
		id: "first-steps",
		name: "First Steps",
		description: "Move 5 times to get your bearings.",
		metadata: { moves: 0, lastX: null, lastZ: null },

		evaluator({ player, mission }) {
			const m = mission.metadata;
			if (m.lastX === null) {
				m.lastX = player.x;
				m.lastZ = player.z;
				return false;
			}
			if (m.lastX !== player.x || m.lastZ !== player.z) {
				m.moves++;
				m.lastX = player.x;
				m.lastZ = player.z;
			}
			return m.moves >= 5;
		},

		onComplete() {
			addLog("Mission complete: First Steps!", "mission");
			showBanner("First Steps complete!");
			renderMissions();

			// ── Mission 2 — Into the Dark (chained from mission 1) ──────────────
			// Collect corridors directly connected to the start room using the BSP
			// room graph, then check if the player steps into any of them.
			const outputs = game.dungeon.outputs;
			const startRoomId =
				outputs && "startRoomId" in outputs ? outputs.startRoomId : null;
			const rooms = game.dungeon.rooms;

			const connectedCorridors =
				startRoomId !== null
					? Object.values(rooms).filter(
						(r) =>
							r.type === "corridor" && r.connections.includes(startRoomId),
					)
					: [];

			if (connectedCorridors.length === 0) {
				addLog("No corridors from start — skipping mission 2.", "mission");
				tryUnlockExitMission();
				return;
			}

			game.missions.add({
				id: "into-the-dark",
				name: "Into the Dark",
				description: "Step through a passage from your starting room.",

				evaluator({ player }) {
					return connectedCorridors.some(
						(c) =>
							player.x >= c.x &&
							player.x < c.x + c.w &&
							player.z >= c.z &&
							player.z < c.z + c.h,
					);
				},

				onComplete() {
					addLog("Mission complete: Into the Dark!", "mission");
					showBanner("Into the Dark complete!");
					renderMissions();
					tryUnlockExitMission();
				},
			});

			renderMissions();
			tryUnlockExitMission();
		},
	});

	// ── Mission 3 — Wait and Watch ───────────────────────────────────────────
	// The _lastAction variable is set to the keybinding action name just before
	// game.turns.commit() is called. Any non-wait action resets the streak.
	game.missions.add({
		id: "wait-and-watch",
		name: "Wait and Watch",
		description: "Press Space to wait 3 turns in a row.",
		metadata: { consecutive: 0, lastActionCount: 0 },

		evaluator({ mission }) {
			const m = mission.metadata;
			// The scheduler fires one turn event per time-step (enemy turns included),
			// so a single Space press can trigger multiple evaluator calls. Guard so
			// we only process once per player action.
			if (m.lastActionCount === _playerActionCount) return m.consecutive >= 3;
			m.lastActionCount = _playerActionCount;
			if (_lastAction === "wait") {
				m.consecutive++;
			} else if (_lastAction !== null) {
				// Any real action breaks the streak; null = initial turn, skip.
				m.consecutive = 0;
			}
			return m.consecutive >= 3;
		},

		onComplete() {
			addLog("Mission complete: Wait and Watch!", "mission");
			showBanner("Wait and Watch complete!");
			renderMissions();
			tryUnlockExitMission();
		},
	});

	// ── Mission 4 — Open a Chest ─────────────────────────────────────────────
	// The chest was placed by onPlace. The player opens it by pressing F when
	// adjacent. openChest() sets _chestOpened synchronously; the evaluator
	// sees it on the same turn commit.
	game.missions.add({
		id: "open-chest",
		name: "Open a Chest",
		description: "Press F when next to a chest to open it.",

		evaluator() {
			return _chestOpened;
		},

		onComplete() {
			addLog("Mission complete: Open a Chest!", "mission");
			showBanner("Chest opened!");
			renderMissions();
			tryUnlockExitMission();
		},
	});

	// ── Mission 5 — Pick Up an Item ──────────────────────────────────────────
	// openChest() sets _hasPotionInBag at the same time as _chestOpened.
	// The item-pickup event is also emitted so external listeners can react.
	game.missions.add({
		id: "pickup-item",
		name: "Pick Up an Item",
		description: "Collect the item that drops from the chest.",

		evaluator() {
			return _hasPotionInBag;
		},

		onComplete() {
			addLog("Mission complete: Pick Up an Item!", "mission");
			showBanner("Item collected!");
			renderMissions();
			tryUnlockExitMission();
		},
	});

	// ── Mission 6 — Use an Item ──────────────────────────────────────────────
	// Press U to use the Health Potion. The 'useItem' keybinding sets
	// _itemUsed synchronously and commits a wait action to advance the turn.
	game.missions.add({
		id: "use-item",
		name: "Use an Item",
		description: "Press U to use your Health Potion.",

		evaluator() {
			return _itemUsed;
		},

		onComplete() {
			addLog("Mission complete: Use an Item!", "mission");
			showBanner("Item used!");
			renderMissions();
			tryUnlockExitMission();
		},
	});

	// ── Mission 7 — First Blood ──────────────────────────────────────────────
	// combat.onDamage fires inside game.turns.commit() during action resolution,
	// before the turn event. The evaluator sees the flag on the same turn.
	game.missions.add({
		id: "first-blood",
		name: "First Blood",
		description: "Deal damage to an enemy.",

		evaluator() {
			return _playerDealtDmg;
		},

		onComplete() {
			addLog("Mission complete: First Blood!", "mission");
			showBanner("First Blood!");
			renderMissions();
			tryUnlockExitMission();
		},
	});

	// ── Mission 8 — Enemy Slain ──────────────────────────────────────────────
	// combat.onDeath fires when an enemy's HP reaches 0.
	game.missions.add({
		id: "enemy-slain",
		name: "Enemy Slain",
		description: "Defeat an enemy.",

		evaluator() {
			return _enemyKilled;
		},

		onComplete() {
			addLog("Mission complete: Enemy Slain!", "mission");
			showBanner("Enemy defeated!");
			renderMissions();
			tryUnlockExitMission();
		},
	});

	// ── Mission 9 — Explorer ─────────────────────────────────────────────────
	// Each turn the player's neighbouring walkable cells (radius 3) are added
	// to _visitedCells. Only non-solid cells are counted, so the ratio against
	// _totalWalkable is accurate. 30% threshold requires exploring several rooms.
	game.missions.add({
		id: "explorer",
		name: "Explorer",
		description: "Reveal 30% of the dungeon.",

		evaluator() {
			if (_totalWalkable === 0) return false;
			return _visitedCells.size / _totalWalkable >= 0.3;
		},

		onComplete() {
			addLog("Mission complete: Explorer!", "mission");
			showBanner("Dungeon explored!");
			renderMissions();
			tryUnlockExitMission();
		},
	});

	renderMissions();
}

export function tutAddEntity() {
	// ── Exploration tracking (mission 9) ──────────────────────────────────
	// Mark walkable cells within a 3-tile radius as visited each turn.
	// This approximates the player's field of view without accessing internals.
	if (_solidData && _dungeonW > 0) {
		const px = game.player.x;
		const pz = game.player.z;
		const R = 3;
		for (let dz = -R; dz <= R; dz++) {
			for (let dx = -R; dx <= R; dx++) {
				if (dx * dx + dz * dz <= R * R) {
					const nx = px + dx;
					const nz = pz + dz;
					if (nx >= 0 && nz >= 0) {
						const idx = nz * _dungeonW + nx;
						if (idx < _solidData.length && _solidData[idx] === 0) {
							_visitedCells.add(`${nx},${nz}`);
						}
					}
				}
			}
		}
	}

	return [];
}

export function tutPlacement(rooms, startRoom, endRoom, rng, place) {
	// Cache the exit room for mission 10.
	_endRoom = endRoom;

	// Collect actual rooms that are neither the start nor end.
	const candidates = rooms.filter(
		(r) =>
			r.type === "room" && r.id !== startRoom.id && r.id !== endRoom.id,
	);

	/*
	// Chest drops - configured via onPlace or object layer
	place.object(room.cx, room.cz, 'chest', {
		loot: [
			{ id: 'health-potion', name: 'Health Potion', chance: 1.0 },
			{ id: 'iron-sword', name: 'Iron Sword', chance: 0.3 },
			{ id: 'gold-coin', name: 'Gold Coin', chance: 0.8, quantity: [1, 5] },
		],
	})*/

	// Place a chest in the start room.
	place.object(startRoom.cx, startRoom.cz, "chest", { blocksMove: true });
	_chestPos = { x: startRoom.cx, z: startRoom.cz };
}

export function tutorial_setup() {
	// The mission-complete event fires after the evaluator returns true.
	// The onComplete callbacks above already handle UI; this listener demonstrates
	// how a developer can also subscribe directly to the event.
	window.game.events.on("mission-complete", ({ name, turn }) => {
		addLog(`[event] mission-complete: "${name}" on turn ${turn}`, "turn");
	});
}

export function tutActions(action) {
	// Set _lastAction only when a turn will actually be committed so that
	// mission 3 (Wait and Watch) does not see stale values from no-op keys.
	_lastAction = action;
	_playerActionCount++;
}

export function renderMissions() {
	const fragment = document.createDocumentFragment();

	const all = [...game.missions.list].sort(
		(a, b) => (a.status === "complete") - (b.status === "complete"),
	);
	if (all.length === 0) {
		const empty = document.createElement("div");
		empty.style.cssText = "font-size:7px;color:var(--muted);padding:4px 0";
		empty.textContent = "No missions yet.";
		fragment.appendChild(empty);

		return;
	}

	for (const mission of all) {
		// Animating missions live in #missions-animating — never touch them here.
		if (_animatingElements.has(mission.id)) continue;

		const item = document.createElement("div");
		// TODO use ${mission.status}

		if (mission.status === "complete") {
			if (_hiddenMissions.has(mission.id)) {
				item.classList.add("hidden");
			} else {
				// First completion: move element to the animating container so the
				// main list rebuild can never reach it again.
				_animatingElements.set(mission.id, item);
				item.addEventListener(
					"animationend",
					() => {
						_animatingElements.delete(mission.id);
						_hiddenMissions.add(mission.id);
						item.remove();
					},
					{ once: true },
				);
				// Build icon/body below, then append to animating container, not fragment.
			}
		}

		const icon = document.createElement("span");
		icon.className = "mission-icon";

		const body = document.createElement("span");
		body.className = "mission-body";

		const nameEl = document.createElement("span");
		nameEl.className = "mission-name";
		nameEl.textContent = mission.name;

		const desc = document.createElement("span");
		desc.className = "mission-desc";
		desc.textContent = mission.description;

		// Append per-mission progress counters for active missions.
		if (mission.status === "active") {
			switch (mission.id) {
				case "first-steps":
					desc.textContent = `${mission.description} (${mission.metadata.moves ?? 0}/5)`;
					break;
				case "wait-and-watch":
					desc.textContent = `${mission.description} (${mission.metadata.consecutive ?? 0}/3)`;
					break;
				case "explorer": {
					const pct =
						_totalWalkable > 0
							? Math.floor((100 * _visitedCells.size) / _totalWalkable)
							: 0;
					desc.textContent = `${mission.description} (${pct}%)`;
					break;
				}
			}
		}

		body.appendChild(nameEl);
		body.appendChild(desc);
		item.appendChild(icon);
		item.appendChild(body);
		if (_animatingElements.get(mission.id) === item) {

		} else {
			fragment.appendChild(item);
		}
	}


}

let _bannerTimer = null;
function showBanner(text) {
	globs.bannerEl.textContent = text;
	globs.bannerEl.classList.add("visible");
	if (_bannerTimer) clearTimeout(_bannerTimer);
	_bannerTimer = setTimeout(() => {
		globs.bannerEl.classList.remove("visible");
		_bannerTimer = null;
	}, 2500);
}

