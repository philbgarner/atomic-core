//
// Height offset encoding in the DataTexture (R8):
//   128 = no offset (flat)
//   < 128 = raised for ceiling / lowered for floor
//   > 128 = lowered for ceiling / raised for floor
//   0 = pit (floor tile omitted by the renderer)
//

'use strict';
import { addLog, globs, toggleRegionColors, showFloatText, txt } from './shared.js';
import { tutActions } from '../tutorial.js';
import { SpriteSheet } from './sprites.js';
import { doModal } from './modal.js';
import { buildSkyboxFaces } from './dungeon.js';
import { openChatModal, closeChatModal } from './multiplayer.js';
import { renderMissions, tutAddEntity, tutInteract } from '../tutorial.js';

import {
	createGame,
	createEntity,
	attachSpawner,
	attachKeybindings,
	attachMinimap,
	createDungeonRenderer,
	createItem,
	showInventory,
	loadTextureAtlas,
	packedAtlasResolver,
	createWebSocketTransport,
} from 'atomic-core';

async function init() {
	const atlasJson = await fetch("./a/texture.json").then((r) => r.json());
	globs.packed = await loadTextureAtlas("./a/texture.png", atlasJson, {
		showLoadingScreen: false,
	});
	globs.skyboxFaces = await buildSkyboxFaces();

	// fix extra large sprites
	globs.packed.sprites.get("creatures/skywhale").pivot.y = 0;

	globs.resolver = packedAtlasResolver(globs.packed);

	globs.sprites = new SpriteSheet('./a/texture2.png', './a/texture2.json');
	await globs.sprites.load();

	const response = await fetch("./a/geomorphs_garden.raw");	
	const buffer = await response.arrayBuffer();
	globs.levelGEO = new Uint8Array(buffer);
}

export function onTurn(turn) {
	// TODO -globs.turnEl.textContent = String(turn);
	// TODO globs.hpEl.textContent = `${window.game.player.hp} / ${window.game.player.maxHp}`;
	// TODO globs.posEl.textContent = `${window.game.player.x}, ${window.game.player.z}`;
	renderMissions();

	if (window.renderer) {
		window.renderer.setEntities([...globs.entities, ...tutAddEntity()]);
	}
}

export function game_init() {
	const game = window.game;
	// All combat is server-authoritative, so onDamage/onDeath callbacks never
	// fire in multiplayer. Log and animate from the animation diff events instead.
	game.animations.on("damage", async ({ entity, amount }) => {
		addLog(`${entity.type} ${txt("takes")} - ${amount}`, "damage");
		showFloatText(`-${amount}`, "#f66", entity.x, entity.z);
		await new Promise((r) => setTimeout(r, 500));
	});

	game.animations.on("death", async ({ entity }) => {
		addLog(`${entity.type} ${txt("slain")}`, "death");
		showFloatText("DEAD", "#f99", entity.x, entity.z);
		await new Promise((r) => setTimeout(r, 500));
	});

	game.animations.on("miss", async ({ entity }) => {
		showFloatText("MISS", "#8090c0", entity.x, entity.z);
		await new Promise((r) => setTimeout(r, 500));
	});

	globs.canvasWrapEl.addEventListener("pointermove", (e) => {
		const rect = globs.canvasWrapEl.getBoundingClientRect();
		globs.tooltipEl.style.left = `${e.clientX - rect.left}px`;
		globs.tooltipEl.style.top = `${e.clientY - rect.top}px`;
	});
	globs.canvasWrapEl.addEventListener("pointerleave", () => {
		globs.tooltipEl.classList.add("hidden");
	});

	// ── Keyboard input ───────────────────────────────────────────────────────
	attachKeybindings(game, {
		bindings: {
			moveForward: ['w', 'W', 'ArrowUp'],
			moveBackward: ['s', 'S', 'ArrowDown'],
			moveLeft: ['a', 'A', 'ArrowLeft'],
			moveRight: ['d', 'D', 'ArrowRight'],
			turnLeft: ['q', 'Q'],
			turnRight: ['e', 'E'],
			wait: [' '],
			interact: ["f", "F"],
			useItem: ["u", "U"],
			openInventory: ['i', 'I'],
			dbgRegion: ["r", "R"],
			testModal: ["m", "M"],
			enter: ['Enter'],
			esc: ['Escape'],
		},
		onAction(action, event) {
			// Block movement while the chat modal is open
			if (globs.chatModalOpen && action != 'Escape') return;

			event.preventDefault();
			if (!game.player.alive) {
				addLog(txt("youaredead"), 'death');
				return;
			}

			function relativeMove(forward, strafe) {
				const yaw = game.player.facing;
				const fx = Math.round(-Math.sin(yaw));
				const fz = Math.round(-Math.cos(yaw));
				const sx = Math.round(Math.cos(yaw));
				const sz = Math.round(-Math.sin(yaw));
				return game.player.move(
					forward * fx + strafe * sx,
					forward * fz + strafe * sz,
				);
			}

			let a;
			switch (action) {
				case 'enter': openChatModal(); break;
				case 'esc': if (globs.chatModalOpen) closeChatModal();
					document.getElementById("modal-overlay").classList.add("hidden");
					break;

				case 'moveForward': a = relativeMove(1, 0); break;
				case 'moveBackward': a = relativeMove(-1, 0); break;
				case 'moveLeft': a = relativeMove(0, -1); break;
				case 'moveRight': a = relativeMove(0, 1); break;
				case 'wait': a = game.player.wait(); break;

				case 'turnLeft': a = game.player.rotate(Math.PI / 2); break;
				case 'turnRight': a = game.player.rotate(-Math.PI / 2); break;
				case 'openInventory': return;
				case 'dbgRegion': toggleRegionColors(); return;
				case 'testModal': {
					doModal({ title: "test", size: "small", content: "<p>example text</p>", image: "ui/ridyn_inv", color: "var(--ridyn)" });
					document.getElementById("modal-overlay").classList.toggle("hidden");
					return;
				}
				case "interact": {
					// Toggle nearest passage from script
					//var nearby = game.dungeon.passageNear(game.player.x, game.player.z)
					//if (nearby) game.dungeon.passages.toggle(nearby.id)
					a = tutInteract();
					break;
				}

				case "useItem": {/*
					if (_hasPotionInBag && !_itemUsed) {
						_itemUsed = true;
						_hasPotionInBag = false;
						addLog(
							"You drink the Health Potion and feel better! (+10 HP)",
							"mission",
						);
						// In a real game, apply the heal:
						//   game.player._state.entity.hp = Math.min(
						//     game.player.maxHp, game.player.hp + 10,
						//   );
						a = game.player.wait(); // using an item costs one turn
					} else if (!_hasPotionInBag) {
						addLog("Nothing to use.", "turn");
						return;
					} else {
						addLog("Already used.", "turn");
						return;
					}*/
					break;
				}
			}

			if (a) {
				tutActions(action);
				game.turns.commit(a);

				/*
				// Advance effects each turn - returns events for any effect damage / expiry
				game.turns.onAdvance = function ({ entities }) {
					for (const e of entities) {
						const events = tickEffects(e)
						for (const ev of events) {
							if (ev.type === 'effect-damage') game.events.emit('damage', ev)
						}
					}
				}
				*/
			}
		},
	});
}

await init();
/*
game.events.on('turn',       function({ turn }) {  })
game.events.on('damage',     function({ attacker, defender, amount }) {})
game.events.on('death',      function({ entity, killer }) {  })
game.events.on('xp-gain',    function({ amount, x, z }) {})
game.events.on('heal',       function({ entity, amount }) {})
game.events.on('miss',       function({ attacker, defender }) {})
game.events.on('chest-open', function({ chest, loot }) {})
game.events.on('item-pickup',function({ item, entity }) {})
game.events.on('audio',      function({ name, position }) {})
*/