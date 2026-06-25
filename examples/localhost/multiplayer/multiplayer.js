// multiplayer.js — atomic-core multiplayer example
//
// Compared to basic.js, the only differences are:
//  1. Connect to the server first (async, before createGame).
//  2. Pass player.id (server-assigned), spriteName, and transport into createGame options.
//  3. Host sends the solid map to the server after generate() so the server
//     can validate moves.
//  4. Listen to 'network-state' events to render other players as entities.
//     The renderer is also updated on every network-state event (not just on
//     the local player's turn) so remote moves are visible in real-time.
//     Other players' full entity state (spriteName, hp, custom attributes, etc.)
//     is available directly on the ps object — no meta unwrapping needed.
//  5. Player list panel and in-viewport chat overlay with modal input.

const {
  createGame,
  createEntity,
  attachSpawner,
  attachKeybindings,
  attachMinimap,
  createDungeonRenderer,
  createWebSocketTransport,
  loadTextureAtlas,
  packedAtlasResolver,
} = AtomicCore;

// ---------------------------------------------------------------------------
// spriteMap definitions
// ---------------------------------------------------------------------------

function rogueSpriteMap() {
  return {
    frameSize: { w: 64, h: 64 },
    layers: [
      { tile: "mob_rogue_base.png", opacity: 1.0 },
      {
        tile: "mob_rogue_head.png",
        opacity: 1.0,
        bob: { amplitudeY: 0.015, speed: 2 },
      },
    ],
  };
}

function warriorSpriteMap() {
  return {
    frameSize: { w: 64, h: 64 },
    layers: [
      { tile: "mob_warrior_base.png", opacity: 1.0 },
      {
        tile: "mob_warrior_head.png",
        opacity: 1.0,
        bob: { amplitudeY: 0.015, speed: 2 },
      },
    ],
  };
}

function mageSpriteMap() {
  return {
    frameSize: { w: 128, h: 64 },
    layers: [
      { tile: "mob_mage_base.png", opacity: 1.0 },
      {
        tile: "mob_mage_head.png",
        opacity: 1.0,
        bob: { amplitudeY: 0.015, speed: 2 },
      },
    ],
  };
}

const SPRITE_MAPS = {
  rogue: rogueSpriteMap,
  warrior: warriorSpriteMap,
  mage: mageSpriteMap,
};

function spriteMapForKey(key) {
  return (SPRITE_MAPS[key] ?? rogueSpriteMap)();
}

// ---------------------------------------------------------------------------
// DOM refs
// ---------------------------------------------------------------------------

const minimapCanvas = document.getElementById("minimap");
const connectScreen = document.getElementById("connect-screen");
const connectBtn = document.getElementById("connect-btn");
const serverUrlEl = document.getElementById("server-url");
const connectError = document.getElementById("connect-error");
const viewportEl = document.getElementById("viewport");
const logEl = document.getElementById("log");
const hpEl = document.getElementById("hp");
const turnEl = document.getElementById("turn");
const posEl = document.getElementById("pos");
const playerCountEl = document.getElementById("player-count");
const playerListEl = document.getElementById("player-list");
const chatOverlayEl = document.getElementById("chat-overlay");
const chatModalEl = document.getElementById("chat-modal");
const chatInputEl = document.getElementById("chat-input");
const chatSendBtn = document.getElementById("chat-send");

// ---------------------------------------------------------------------------
// Connection flow
// ---------------------------------------------------------------------------

connectBtn.addEventListener("click", async () => {
  connectBtn.disabled = true;
  connectError.style.display = "none";

  const url = serverUrlEl.value.trim();
  const transport = createWebSocketTransport(url);
  const chosenSprite =
    document.querySelector('input[name="sprite"]:checked')?.value ?? "rogue";

  let info;
  try {
    info = await transport.connect({
      spriteName: chosenSprite,
      attack: 5,
      defense: 2,
      maxHp: 30,
    });
  } catch (err) {
    connectError.textContent = "Could not connect: " + (err?.message ?? err);
    connectError.style.display = "block";
    connectBtn.disabled = false;
    return;
  }

  connectScreen.style.display = "none";
  startGame(transport, info, chosenSprite);
});

// ---------------------------------------------------------------------------
// Dungeon config (same seed → same dungeon on every client)
// ---------------------------------------------------------------------------

const MY_DUNGEON_CONFIG = {
  width: 40,
  height: 40,
  seed: 0xdeadbeef,
  roomMinSize: 5,
  roomMaxSize: 11,
  roomCount: 12,
};

// ---------------------------------------------------------------------------
// Main game setup
// ---------------------------------------------------------------------------

async function startGame(
  transport,
  { playerId, isHost, dungeonConfig },
  chosenSprite = "rogue",
) {
  addLog(
    `Connected as ${playerId} (${isHost ? "host" : "peer"}) — ${chosenSprite}`,
    "turn",
  );

  // Non-host clients receive the dungeon config from the server so they
  // generate the identical dungeon (same seed). Host uses its own config.
  const dungeon = isHost
    ? MY_DUNGEON_CONFIG
    : (dungeonConfig ?? MY_DUNGEON_CONFIG);

  // ── Enemy / entity state ──────────────────────────────────────────────────
  // Only the host spawns enemies; peers receive positions via network-state.
  const enemies = [];
  let spawned = 0;
  const MAX_ENEMIES = 2;

  let otherPlayerEntities = [];

  // ── Chat state ────────────────────────────────────────────────────────────
  let chatModalOpen = false;

  function openChatModal() {
    chatModalOpen = true;
    chatModalEl.style.display = "flex";
    chatInputEl.value = "";
    chatInputEl.focus();
  }

  function closeChatModal() {
    chatModalOpen = false;
    chatModalEl.style.display = "none";
  }

  // ── Game ──────────────────────────────────────────────────────────────────

  // All combat is server-authoritative in multiplayer — onDamage/onDeath/onMiss
  // callbacks never fire locally. Log and animate via game.animations instead.
  const game = createGame(document.body, {
    dungeon,
    player: {
      id: playerId, // match server-assigned id so reconciliation aligns
      spriteName: chosenSprite, // synced to all peers on every action
      hp: 30,
      maxHp: 30,
      attack: 5,
      defense: 2,
      speed: 5,
    },
    transport,
  });

  // ── Animation handlers ────────────────────────────────────────────────────

  const canvasWrapEl = document.getElementById("canvas-wrap");

  function showFloatText(text, color, gridX, gridZ) {
    const el = document.createElement("div");
    el.className = "anim-float";
    el.style.color = color;
    const pos = renderer?.worldToScreen(gridX, gridZ);
    el.style.left = (pos ? pos.x : canvasWrapEl.clientWidth * 0.5) + "px";
    el.style.top = (pos ? pos.y : canvasWrapEl.clientHeight * 0.4) + "px";
    el.textContent = text;
    canvasWrapEl.appendChild(el);
    el.addEventListener("animationend", () => el.remove(), { once: true });
  }

  game.animations.on("damage", async ({ entity, amount }) => {
    addLog(`${entity.type ?? entity.id} takes ${amount} dmg`, "damage");
    showFloatText(`-${amount}`, "#f66", entity.x, entity.z);
    await new Promise((r) => setTimeout(r, 450));
  });

  game.animations.on("death", async ({ entity }) => {
    addLog(`${entity.type ?? entity.id} is slain!`, "death");
    showFloatText("DEAD", "#f99", entity.x, entity.z);
    await new Promise((r) => setTimeout(r, 500));
  });

  game.animations.on("miss", async ({ entity }) => {
    showFloatText("MISS", "#8090c0", entity.x, entity.z);
    await new Promise((r) => setTimeout(r, 300));
  });

  // ── Minimap ───────────────────────────────────────────────────────────────

  attachMinimap(game, minimapCanvas, {
    size: 196,
    showEntities: true,
    colors: {
      floor: "#aac",
      floorDim: "#334",
      player: "#0f0",
      enemy: "#f44",
    },
  });

  // ── 3D renderer ───────────────────────────────────────────────────────────

  let renderer;

  const atlasJson = await fetch("../textureAtlas.json").then((r) => r.json());
  const packed = await loadTextureAtlas("../textureAtlas.png", atlasJson, {
    showLoadingScreen: false,
  });
  const resolver = packedAtlasResolver(packed);

  renderer = createDungeonRenderer(viewportEl, game, {
    packedAtlas: packed,
    tileNameResolver: resolver,
    floorTile: "flagstone_floor_stone.png",
    ceilTile: "plaster_ceiling.png",
    wallTile: "brick_wall_stone.png",
  });

  // ── Spawner — must be registered before generate() ────────────────────────

  attachSpawner(game, {
    onSpawn({ roomId, x, y }) {
      if (!isHost) return null;
      if (spawned >= MAX_ENEMIES) return null;
      if (roomId < 2) return null;
      if (Math.random() > 0.75) return null;
      spawned++;
      const e = createEntity({
        kind: "enemy",
        faction: "enemy",
        type: "goblin",
        spriteName: "goblin",
        x,
        z: y,
        hp: 8,
        maxHp: 8,
        attack: 2,
        defense: 0,
        speed: 6,
        danger: 1,
        xp: 10,
        spriteMap: {
          frameSize: { w: 64, h: 64 },
          layers: [
            { tile: "mob_goblin_base.png", opacity: 1.0 },
            {
              tile: "mob_goblin_happy_head.png",
              opacity: 1.0,
              bob: { amplitudeY: 0.015, speed: 2 },
            },
          ],
        },
      });
      enemies.push(e);
      return e;
    },
  });

  // ── Generate ──────────────────────────────────────────────────────────────

  await game.generate();

  {
    const allRooms = Object.values(game.dungeon.rooms);
    const roomCount = allRooms.filter((r) => r.type === "room").length;
    const corridorCount = allRooms.filter((r) => r.type === "corridor").length;
    const seed = dungeon.seed.toString(16).toUpperCase();
    addLog(
      `Dungeon 0x${seed} — ${roomCount} rooms, ${corridorCount} corridors, ${spawned} enemies`,
      "turn",
    );
  }

  // Host sends the solid map so the server can validate all players' moves,
  // and the initial monster roster so late-joining peers see them.
  if (isHost) {
    const solid = Array.from(game.dungeon.outputs.textures.solid.image.data);
    transport.initDungeon({
      solid,
      width: game.dungeon.width,
      height: game.dungeon.height,
      config: MY_DUNGEON_CONFIG,
    });
    transport.sendMonsterState(enemies.map(monsterNetState));
  }

  // ── Events ────────────────────────────────────────────────────────────────

  game.events.on("turn", ({ turn }) => {
    turnEl.textContent = String(turn);
    hpEl.textContent = `${game.player.hp} / ${game.player.maxHp}`;
    posEl.textContent = `${game.player.x}, ${game.player.z}`;
    if (renderer) renderer.setEntities([...enemies, ...otherPlayerEntities]);
  });

  // 'network-state' fires whenever the server pushes a state update —
  // including when OTHER players move. Update the renderer immediately so
  // remote movement is visible in real-time, not deferred to the local turn.
  game.events.on("network-state", (update) => {
    updatePlayerList(update.players, playerId);

    otherPlayerEntities = Object.entries(update.players)
      .filter(([pid]) => pid !== playerId)
      .map(([pid, ps]) => {
        // ps carries the remote player's full entity state. The server uses 'y'
        // for the grid row; remap to 'z' for the renderer.
        const { y, ...rest } = ps;
        return {
          ...rest,
          id: pid,
          kind: "npc",
          z: y,
          spriteMap: spriteMapForKey(ps.spriteName),
        };
      });

    // Server is authoritative for monster positions — sync all clients.
    if (Array.isArray(update.monsters)) {
      enemies.length = 0;
      enemies.push(...update.monsters);
    }

    if (renderer) renderer.setEntities([...enemies, ...otherPlayerEntities]);
  });

  transport.onChat(({ playerId: senderId, text }) => {
    addChatMessage(senderId, text);
  });

  game.events.on("audio", ({ name }) => {
    addLog(`[sfx] ${name}`, "audio");
  });

  // ── Chat ──────────────────────────────────────────────────────────────────

  function sendChat() {
    const text = chatInputEl.value.trim();
    closeChatModal();
    if (!text) return;
    transport.sendChat(text);
  }

  chatSendBtn.addEventListener("click", sendChat);

  chatInputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendChat();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      closeChatModal();
    }
    e.stopPropagation(); // prevent game keybindings from firing while typing
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !chatModalOpen) {
      e.preventDefault();
      openChatModal();
    }
    if (e.key === "Escape" && chatModalOpen) {
      e.preventDefault();
      closeChatModal();
    }
  });

  // ── Keybindings ───────────────────────────────────────────────────────────

  attachKeybindings(game, {
    bindings: {
      moveForward: ["KeyW", "ArrowUp"],
      moveBackward: ["KeyS", "ArrowDown"],
      moveLeft: ["KeyA", "ArrowLeft"],
      moveRight: ["KeyD", "ArrowRight"],
      turnLeft: ["KeyQ"],
      turnRight: ["KeyE"],
      wait: ["Space"],
    },
    onAction(action, event) {
      if (chatModalOpen) return;
      event.preventDefault();
      if (!game.player.alive) {
        addLog("You are dead. Refresh to restart.", "death");
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
        case "moveForward":
          a = relativeMove(1, 0);
          break;
        case "moveBackward":
          a = relativeMove(-1, 0);
          break;
        case "moveLeft":
          a = relativeMove(0, -1);
          break;
        case "moveRight":
          a = relativeMove(0, 1);
          break;
        case "turnLeft":
          a = game.player.rotate(Math.PI / 2);
          break;
        case "turnRight":
          a = game.player.rotate(-Math.PI / 2);
          break;
        case "wait":
          a = game.player.wait();
          break;
      }

      if (a) game.turns.commit(a);
    },
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function addLog(text, cls) {
  const div = document.createElement("div");
  div.className = "entry" + (cls ? " " + cls : "");
  div.textContent = text;
  logEl.prepend(div);
  while (logEl.children.length > 40) logEl.lastElementChild.remove();
}

function addChatMessage(senderId, text) {
  const isServer = senderId === "server";
  const div = document.createElement("div");
  div.className = "chat-msg" + (isServer ? " server-msg" : "");
  div.textContent = isServer ? text : `${senderId}: ${text}`;
  chatOverlayEl.prepend(div);
  setTimeout(() => div.remove(), 6500);
}

function updatePlayerList(players, myPlayerId) {
  playerListEl.innerHTML = "";
  const entries = Object.entries(players);
  playerCountEl.textContent = String(entries.length);
  for (const [pid, ps] of entries) {
    const isSelf = pid === myPlayerId;
    const div = document.createElement("div");
    div.className =
      "player-entry" + (isSelf ? " self" : "") + (!ps.alive ? " dead" : "");
    div.textContent =
      (isSelf ? "► " : "  ") + pid + "  " + ps.hp + "/" + ps.maxHp;
    playerListEl.appendChild(div);
  }
}

function monsterNetState(e) {
  return {
    id: e.id,
    kind: e.kind,
    type: e.type,
    spriteName: e.spriteName,
    x: e.x,
    z: e.z,
    hp: e.hp,
    maxHp: e.maxHp,
    alive: e.alive,
    attack: e.attack,
    defense: e.defense,
    speed: e.speed,
    blocksMove: e.blocksMove,
    faction: e.faction,
    tick: e.tick,
    spriteMap: e.spriteMap,
  };
}
