// multiplayer.js — atomic-core multiplayer example
//
// Compared to basic.js, the only differences are:
//  1. Connect to the server first (async, before createGame).
//  2. Pass player.id (server-assigned) and transport into createGame options.
//  3. Host sends the solid map to the server after generate() so the server
//     can validate moves.
//  4. Listen to 'network-state' events to render other players as entities.
//     The renderer is also updated on every network-state event (not just on
//     the local player's turn) so remote moves are visible in real-time.
//  5. Player list panel and in-viewport chat overlay with modal input.

// TODO -
// we need versions of these for each party member
//globs.turnEl = document.getElementById("turn");
//globs.hpEl = document.getElementById("hp");
//		globs.posEl = document.getElementById("pos");

'use strict';
import { game_init, onTurn } from './game.js';
import { addLog, globs, txt, addChatMessage } from './shared.js';
import { spawn, playerData, entityNetState, initPartyData, playerConnectData, spawnParty } from './entities.js';
import { tutDamage, tutDeath, tutCacheDungeon, renderMissions, tutAddEntity, tutorial_setup } from '../tutorial.js';
import { DUNGEON_CONFIG, makeDungeon, applySkyPanels } from './dungeon.js';
import { doModal, handleSpriteChange } from './modal.js';
import { setCompass, initButtonCanvases } from './ui.js';

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

const MINIMAPSIZE = 272;

export const Connectscreen = (() => {
	let container;
	// ---------------------------------------------------------------------------
	// Entity tracking (enemies spawned on the host, synced via server state)
	// ---------------------------------------------------------------------------
	// Other connected players — updated on every network-state event
	let otherPlayerEntities = [];

	function init(rootId) {
		doModal({
			title: txt("prepare"),
			size: "large",
			color: "var(--gold)",
			content: `<div id="connect-screen">			
			<div id="connect-box">
			${txt("tunedtxt")}
			`+	/*
			<label>Server URL</label>*/
				`<input id="server-url" type="text" value="ws://localhost:3001" style="display:none;"> 
			<label>${txt("playas")}</label>
			<div id="sprite-select">
			<label class="sprite-opt"><input type="radio" name="sprite" value="terenia" checked />Terenia</label>
				<label class="sprite-opt"><input type="radio" name="sprite" value="mia" />Mia</label>
				<label class="sprite-opt"><input type="radio" name="sprite" value="ridyn" />Ridyn</label>
				<label class="sprite-opt"><input type="radio" name="sprite" value="kagami" />Kagami</label>
				<label class="sprite-opt"><input type="radio" name="sprite" value="momo" />Momo</label>
				<label class="sprite-opt"><input type="radio" name="sprite" value="bakul" />Bakul</label>
				<label class="sprite-opt"><input type="radio" name="sprite" value="jonas" />Jonas</label>
			</div>
			<div class="sep-tag" id="charinfome"></div>
			<button id="connect-btn">${txt("connect")}</button>
			<div id="connect-error"></div>
			`+/*
			<div id="status-tag" class="sep-tag">First player to join becomes the host and generates the dungeon.</div>*/
				`</div>
		</div>`,
			image: "ui/terenia_inv",
		});
		handleSpriteChange("terenia");

		document.querySelectorAll('input[name="sprite"]').forEach(radio => {
			radio.addEventListener('change', function () {
				if (this.checked) {
					handleSpriteChange(this.value);
				}
			});
		});

		container = document.getElementById(rootId);

		container.innerHTML = `
		<div id="leftbar" style="position:absolute; z-index:2; width:278px; left:0px; top:0px; ">
		<div style="display: flex; flex-direction: column;">
			<div class="charbox" id="player1"><div class="img-wrapper"><img src="./a/char1.png"><span class="img-text"></span></div><div style="display: flex;">
			<button class="img-btnQ" style="width: 136px; height: 136px; --bgq: url('../a/char1b1.png'); --bgqa: url('../a/char2b1.png');">
			<canvas class="btn-canvas"></canvas></button>
			<div style="display: flex; flex-direction: column;">
			<button class="img-btnQ" style="width: 136px; height: 68px; --bgq: url('../a/char1b2.png'); --bgqa: url('../a/char2b2.png');">
			<canvas class="btn-canvas"></canvas></button>
			<button class="img-btnQ" style="width: 136px; height: 68px; --bgq: url('../a/char1b3.png'); --bgqa: url('../a/char2b3.png');">
			<canvas class="btn-canvas"></canvas></button>
			</div></div><div class="img-wrapper">
  <img src="./a/char1.png"><span class="img-text">HP</span></div></div>

			<div class="charbox" id="player2"><div class="img-wrapper">
  <img src="./a/char1.png">
  <span class="img-text"></span>
</div><div style="display: flex;">
			<button class="img-btnQ" style="width: 136px; height: 136px; --bgq: url('../a/char1b1.png'); --bgqa: url('../a/char2b1.png');">
			<canvas class="btn-canvas"></canvas></button>
			<div style="display: flex; flex-direction: column;">
			<button class="img-btnQ" style="width: 136px; height: 68px; --bgq: url('../a/char1b2.png'); --bgqa: url('../a/char2b2.png');">
			<canvas class="btn-canvas"></canvas></button>
			<button class="img-btnQ" style="width: 136px; height: 68px; --bgq: url('../a/char1b3.png'); --bgqa: url('../a/char2b3.png');">
			<canvas class="btn-canvas"></canvas></button>
			</div></div><div class="img-wrapper">
  <img src="./a/char1.png">
  <span class="img-text">HP</span>
</div></div>

			<div class="charbox" id="player3"><div class="img-wrapper">
  <img src="./a/char1.png">
  <span class="img-text"></span>
</div><div style="display: flex;">
			<button class="img-btnQ" style="width: 136px; height: 136px; --bgq: url('../a/char1b1.png'); --bgqa: url('../a/char2b1.png');">
			<canvas class="btn-canvas"></canvas></button>
			<div style="display: flex; flex-direction: column;">
			<button class="img-btnQ" style="width: 136px; height: 68px; --bgq: url('../a/char1b2.png'); --bgqa: url('../a/char2b2.png');">
			<canvas class="btn-canvas"></canvas></button>
			<button class="img-btnQ" style="width: 136px; height: 68px; --bgq: url('../a/char1b3.png'); --bgqa: url('../a/char2b3.png');">
			<canvas class="btn-canvas"></canvas></button>
			</div></div><div class="img-wrapper">
  <img src="./a/char1.png">
  <span class="img-text">HP</span>
</div></div>

			<div class="charbox" id="player4"><div class="img-wrapper">
  <img src="./a/char1.png">
  <span class="img-text"></span>
</div><div style="display: flex;">
			<button class="img-btnQ" style="width: 136px; height: 136px; --bgq: url('../a/char1b1.png'); --bgqa: url('../a/char2b1.png');">
			<canvas class="btn-canvas"></canvas></button>
			<div style="display: flex; flex-direction: column;">
			<button class="img-btnQ" style="width: 136px; height: 68px; --bgq: url('../a/char1b2.png'); --bgqa: url('../a/char2b2.png');">
			<canvas class="btn-canvas"></canvas></button>
			<button class="img-btnQ" style="width: 136px; height: 68px; --bgq: url('../a/char1b3.png'); --bgqa: url('../a/char2b3.png');">
			<canvas class="btn-canvas"></canvas></button>
			</div></div><div class="img-wrapper">
  <img src="./a/char1.png">
  <span class="img-text">HP</span>
</div></div>

		</div></div>
		<div id="rightbar" style="position:absolute; z-index:2; width:278px; right:0px; top:0px; ">
		<img src='./a/mediatop.png'>
		<canvas id="minimap" width="${MINIMAPSIZE}" height="${MINIMAPSIZE}"></canvas>
		<div style="display:flex; flex-direction: column;">
			<div style="display:flex;">
				<button class="img-btnQ" style="width: 92px; height: 68px; --bgq: url('../a/topbut1Q.png'); --bgqa: url('../a/topbut2Q.png');"></button>
				<button class="img-btnQ" style="width: 92px; height: 68px; --bgq: url('../a/topbut1W.png'); --bgqa: url('../a/topbut2W.png');"></button>
				<button class="img-btnQ" style="width: 92px; height: 68px; --bgq: url('../a/topbut1E.png'); --bgqa: url('../a/topbut2E.png');"></button>
			</div>
			<div style="display:flex;">
				<button class="img-btnQ" style="width: 92px; height: 68px; --bgq: url('../a/topbut1A.png'); --bgqa: url('../a/topbut2A.png');"></button>
				<button class="img-btnQ" style="width: 92px; height: 68px; --bgq: url('../a/topbut1S.png'); --bgqa: url('../a/topbut2S.png');"></button>
				<button class="img-btnQ" style="width: 92px; height: 68px; --bgq: url('../a/topbut1D.png'); --bgqa: url('../a/topbut2D.png');"></button>
			</div>

			<div class="compass" id="compass">
			<img src="./a/daynightring.png" class="layer tod" id="tod">
			<img src="./a/compassbrass.png" class="layer base">
			<img src="./a/needle.png" class="layer needle" id="needle">
			</div>

			<div>
				<button class="img-btnQ" style="width: 276px; height: 68px; --bgq: url('../a/botbut1.png'); --bgqa: url('../a/botbut2.png');"></button>
			</div>
		</div>
		</div>

		<div style="position:absolute; bottom:0px; z-index:2;">
			<div id="player-list-section">				
				<div id="player-list"></div>
			</div>
		  </div>

		<div id="canvas-wrap">
			<div id="viewport"></div>
			<div id="cell-tooltip" class="hidden"></div>
			<!-- Chat messages overlay — pointer-events: none so the 3D viewport stays interactive -->
			<div id="chat-overlay"></div>
		</div>

		<div id="banner"></div>

		<!-- Chat input modal — shown when player presses Enter -->
		<div id="chat-modal">
			<div id="chat-box">
				<input id="chat-input" type="text" maxlength="200" placeholder="Say something..." autocomplete="off" />
				<button id="chat-send">SEND</button>
				<div id="chat-hint">ENTER to send &nbsp;·&nbsp; ESC to cancel</div>
			</div>
		</div>
		`;

		globs.viewportEl = document.getElementById("viewport");
		globs.minimapCanvas = document.getElementById("minimap");
		globs.connectScreen = document.getElementById('connect-screen');
		globs.connectBtn = document.getElementById('connect-btn');
		globs.serverUrlEl = document.getElementById('server-url');
		globs.connectError = document.getElementById('connect-error');
		globs.chatOverlayEl = document.getElementById('chat-overlay');
		globs.chatModalEl = document.getElementById('chat-modal');
		globs.chatInputEl = document.getElementById('chat-input');
		globs.chatSendBtn = document.getElementById('chat-send');
		globs.canvasWrapEl = document.getElementById("canvas-wrap");
		globs.tooltipEl = document.getElementById("cell-tooltip");
		globs.bannerEl = document.getElementById("banner");
		globs.needleEl = document.getElementById('needle');
		globs.todEl = document.getElementById('tod');

		setup();
	}

	function onEnter() {
		// Reset state
	}

	function onExit() {
	}

	function setup() {
		// ---------------------------------------------------------------------------
		// Connection flow
		// ---------------------------------------------------------------------------
		globs.connectBtn.addEventListener('click', async () => {
			globs.connectBtn.disabled = true;
			globs.connectError.style.display = 'none';
			document.getElementById("modal-overlay").classList.add("hidden");

			const url = globs.serverUrlEl.value.trim();
			const transport = createWebSocketTransport(url);
			const chosenSprite =
				document.querySelector('input[name="sprite"]:checked')?.value ?? "terenia";

			let info;
			try {
				info = await transport.connect(playerConnectData(chosenSprite));
			} catch (err) {
				globs.connectError.textContent = "Could not connect: " + (err?.message ?? err);
				globs.connectError.style.display = "block";
				globs.connectBtn.disabled = false;
				return;
			}

			globs.connectScreen.style.display = "none";
			startGame(transport, info, chosenSprite);

			initButtonCanvases();
		});
	}

	// ---------------------------------------------------------------------------
	// Player list
	// ---------------------------------------------------------------------------
	function updatePlayerList(players, myPlayerId) {
		// TODO redirect this to ui so we can display important params
		const entries = Object.entries(players);
		for (const [pid, ps] of entries) {
			const isSelf = pid === myPlayerId;
			//div.className ="player-entry" + (isSelf ? " self" : "") + (!ps.alive ? " dead" : "");
			//div.textContent =(isSelf ? "► " : "  ") + pid + "  " + ps.hp + "/" + ps.maxHp;
		}
	}

	// ---------------------------------------------------------------------------
	// Main game setup
	// ---------------------------------------------------------------------------
	async function startGame(
		transport,
		{ playerId, isHost, dungeonConfig },
		chosenSprite = "terenia",
	) {
		addLog(
			`Connected as ${playerId} (${isHost ? "host" : "peer"}) — ${chosenSprite}`,
			"turn",
		);

		// Non-host clients receive the dungeon config from the server so they
		// generate the identical dungeon (same seed). Host uses its own config.
		const dungeon = isHost ? DUNGEON_CONFIG : (dungeonConfig ?? DUNGEON_CONFIG);

		const game = createGame(document.body, {
			dungeon,
			player: initPartyData(playerId, chosenSprite),
			combat: {
				// Damage formula (default: max(1, attacker.attack - defender.defense))
				damageFormula: function ({ attacker, defender }) {
					return Math.max(1, attacker.attack - defender.defense)
				},

				// Faction hostility rules
				factions: [
					['player', 'enemy', 'hostile'],
					['npc', 'enemy', 'hostile'],
					['enemy', 'player', 'hostile'],
					['enemy', 'npc', 'hostile'],
				],

				onDamage({ attacker, defender, amount }) {
					addLog(`${attacker.type} hits ${defender.type} for ${amount} dmg`, 'damage');
					tutDamage(defender);

					/*
					applyEffect(defender, {
						id:        'poison',
						duration:  5,           // turns remaining
						tickDamage: 2,
						stackMode: 'stack',     // 'replace' | 'stack' | 'max'
					  });
					*/
				},
				onDeath({ entity }) {
					addLog(`${entity.type} is slain!`, 'death');
					tutDeath(entity);
				},
				onMiss({ attacker, defender }) {
					addLog(`${attacker.type} misses ${defender.type}`, 'turn');
				},
			},
			transport,
		});
		window.game = game;

		game_init();		// adds events
		tutorial_setup();	// adds tut events
		makeDungeon();		// does the renderer setup
		spawn();			// set spawner (must be before generate)

		// The "generate" event fires after dungeon data is computed but before
		// 3D geometry is built, so this is the correct place to write sky panel
		// counts into the dungeon outputs.
		game.events.on("generate", applySkyPanels);
		await game.generate();	// only now is the dungeon data valid for modding
		// player is at spawn location now

		spawnParty(game.player);
		tutCacheDungeon();

		// ---------------------------------------------------------------------------
		// Minimap — wire up the canvas overlay
		// ---------------------------------------------------------------------------
		//
		// attachMinimap listens for the 'turn' event and redraws the canvas each turn.
		// The canvas element must already exist in the DOM with the desired pixel size.
		//
		// MinimapOptions:
		//   size         — logical size (pixels); defaults to 196.
		//   showEntities — whether to draw player / enemy dots; defaults to true.
		//   colors       — override any of: explored, visible, player, npc, enemy.

		attachMinimap(game, globs.minimapCanvas, {
			size: MINIMAPSIZE,	// scaled size of minimap - unfortunately it doesn't scroll, so this needs to match the visible outline size
			showEntities: true,
			colors: {
				explored: "#334",
				visible: "#aac",
				player: "#0f0",
				enemy: "#f44",
			},
		});


		// some useful log dungeon stats
		const allRooms = Object.values(game.dungeon.rooms);
		const roomCount = allRooms.filter((r) => r.type === "room").length;
		const corridorCount = allRooms.filter((r) => r.type === "corridor",).length;
		const seed = dungeon.seed.toString(16).toUpperCase();
		addLog(`Dungeon 0x${seed} — ${roomCount} rooms, ${corridorCount} corridors`, "turn",);


		// Host sends solid map to server so it can validate all players' moves
		if (isHost) {
			const solid = Array.from(game.dungeon.outputs.textures.solid.image.data);
			transport.initDungeon({
				solid,
				width: game.dungeon.width,
				height: game.dungeon.height,
				config: DUNGEON_CONFIG,
			});
			// Send initial monster positions so clients that connect later see them.
			transport.sendMonsterState(globs.entities.map(entityNetState));
		}

		// ---------------------------------------------------------------------------
		// Events
		// ---------------------------------------------------------------------------
		game.events.on("turn", onTurn);

		// 'network-state' fires whenever the server pushes a state update —
		// including when OTHER players move. Update the renderer immediately so
		// remote movement is visible in real-time, not deferred to the local turn.
		game.events.on('network-state', (update) => {
			const allPlayers = Object.entries(update.players);
			updatePlayerList(update.players, playerId);

			otherPlayerEntities = allPlayers
				.filter(([pid]) => pid !== playerId)
				.map(([pid, ps]) => (playerData(pid, ps)));

			// Server is authoritative for monster positions — sync all clients.
			if (Array.isArray(update.monsters)) {
				globs.entities.length = 0;
				globs.entities.push(...update.monsters);
			}

			if (window.renderer) window.renderer.setEntities([...globs.entities, ...otherPlayerEntities]);
		});

		// Chat messages received from the server
		transport.onChat(({ playerId: senderId, text }) => {
			addChatMessage(senderId, text);
		});

		game.events.on('audio', function ({ name, position }) {
			// name: 'footstep' | 'hit' | 'death' | 'xp-pickup' | 'item-pickup'
			//       | 'chest-open' | 'door-open' | 'passage-toggle' | ...
			//if (sounds[name]) {
			//  sounds[name].pos(position ? position.x : 0, 0, position ? position.z : 0).play()
			//}
			addLog(`[sfx] ${name} at ${position}`, 'audio');
		});

		// ── Chat modal ───────────────────────────────────────────────────────────

		function sendChat() {
			const text = globs.chatInputEl.value.trim();
			closeChatModal();
			if (text) transport.sendChat(text);
		}

		globs.chatSendBtn.addEventListener('click', sendChat);

		globs.chatInputEl.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') { e.preventDefault(); sendChat(); }
			if (e.key === 'Escape') { e.preventDefault(); closeChatModal(); }
			e.stopPropagation(); // prevent game keybindings from firing while typing
		});
	}

	return {
		init,
		onEnter,
		onExit,
		get el() { return container; }
	};
})();

export function openChatModal() {
	globs.chatModalOpen = true;
	globs.chatModalEl.style.display = 'flex';
	globs.chatInputEl.value = '';
	globs.chatInputEl.focus();
}

export function closeChatModal() {
	globs.chatModalOpen = false;
	globs.chatModalEl.style.display = 'none';
}


Connectscreen.init('gamescreen');