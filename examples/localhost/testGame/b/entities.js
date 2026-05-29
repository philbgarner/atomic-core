// billboard-sprites.js — atomic-core billboard sprite demo
//
// Demonstrates the spriteMap API: camera-facing billboard quads with layered
// sprite rendering and multi-angle tile variants.
//
// Four enemy types are placed in the dungeon:
//   Goblin   — 2-layer body + weapon overlay
//   Skeleton — 4-angle variants (front/back/left/right tiles differ)
//   Orc      — 1-layer, front + back only (minimal angle setup)
//   Slime    — single tile, no angle variants
//
// Each actor's `spriteMap` field activates billboard rendering automatically;
// no spriteMap = box geometry fallback (same as before).
//
// Atlas layout (atlas.png): 512×1024 px, 64 px tiles → 8 columns.
// Tile ID = row * 8 + col  (row-major, top-left origin).

import { globs } from "./shared.js";

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
} from "atomic-core";

// ---------------------------------------------------------------------------
// spriteMap definitions
// ---------------------------------------------------------------------------
function spiderSpriteMap() {
  return {
    defaults: {
      name: "Button Spider",
      inv: [],
      invimg: null,
      STR: 10,
      DEX: 10,
      VIT: 10,
      WIS: 10,
      CHR: 10,
    },

    frameSize: { w: 64, h: 64 },
    layers: [
      {
        tile: "creatures/spider1top",
        opacity: 1.0,
        bob: { amplitudeY: -0.015, speed: 2 },
      },
      { tile: "creatures/spider1base", opacity: 1.0 },
    ],
  };
}
function statueSpriteMap() {
  return {
    defaults: {
      name: "Living Statue",
      inv: [],
      invimg: null,
      STR: 10,
      DEX: 10,
      VIT: 10,
      WIS: 10,
      CHR: 10,
    },

    frameSize: { w: 64, h: 64 },
    layers: [
      { tile: "creatures/statue1top", opacity: 1.0 },
      {
        tile: "creatures/statue1base",
        opacity: 1.0,
        bob: { amplitudeY: -0.015, speed: 2 },
      },
    ],
  };
}
function skywhaleSpriteMap() {
  return {
    defaults: {
      name: "The Sky Whale",
      inv: [],
      invimg: null,
      STR: 10,
      DEX: 10,
      VIT: 10,
      WIS: 10,
      CHR: 10,
    },

    frameSize: { w: 128, h: 115 },
    layers: [
      {
        tile: "creatures/skywhale",
        opacity: 1.0,
        bob: { amplitudeY: 0.03, speed: 2 },
      },
    ],
  };
}
function doomDryadSpriteMap() {
  return {
    defaults: {
      name: "The Doom Dryad",
      inv: [],
      invimg: null,
      STR: 10,
      DEX: 10,
      VIT: 10,
      WIS: 10,
      CHR: 10,
    },

    frameSize: { w: 64, h: 115 },
    layers: [
      {
        tile: "creatures/doomdryad",
        opacity: 1.0,
        bob: { amplitudeY: 0.03, speed: 2 },
      },
    ],
  };
}

function centriciaSpriteMap() {
  return {
    defaults: {
      name: "Centricia of Spiral",
      inv: [],
      invimg: "ui/400goth",
      STR: 10,
      DEX: 10,
      VIT: 10,
      WIS: 10,
      CHR: 10,
    },

    frameSize: { w: 64, h: 64 },
    layers: [
      { tile: "creatures/centricia64base", opacity: 1.0 },
      {
        tile: "creatures/centricia64top",
        opacity: 1.0,
        bob: { amplitudeY: -0.015, speed: 2 },
      },
    ],
  };
}

function tereniaSpriteMap() {
  return {
    defaults: {
      name: "Terenia Everbright",
      class: "Dancer",
      race: "Elvine,Forest",
      about: `<p></p>`,
      inv: ["katana", ""],
      gp: 0,
      invimg: "ui/terenia_inv",
      thumbimg: "ui/thumb_terenia",
      STR: 16,
      DEX: 15,
      VIT: 10,
      WIS: 8,
      CHR: 11,
    },

    frameSize: { w: 64, h: 64 },
    layers: [
      { tile: "creatures/terenia64base", opacity: 1.0 },
      {
        tile: "creatures/terenia64top",
        opacity: 1.0,
        bob: { amplitudeY: -0.015, speed: 2 },
      },
    ],
  };
}

function miaSpriteMap() {
  return {
    defaults: {
      name: "Mia Frostcoral",
      class: "Ranger",
      race: "Devakin,Devakin",
      about: `<p></p>`,
      inv: ["arquebus", ""],
      gp: 0,
      invimg: "ui/mia_inv",
      thumbimg: "ui/thumb_mia",
      STR: 11,
      DEX: 15,
      VIT: 10,
      WIS: 14,
      CHR: 10,
    },

    frameSize: { w: 64, h: 64 },
    layers: [
      { tile: "creatures/mia64base", opacity: 1.0 },
      {
        tile: "creatures/mia64top",
        opacity: 1.0,
        bob: { amplitudeY: -0.015, speed: 2 },
      },
    ],
  };
}

function ridynSpriteMap() {
  return {
    defaults: {
      name: "Ridyn",
      class: "Assassin",
      race: "Changeling",
      about: `<p></p>`,
      inv: ["dagger", "dagger"],
      gp: 0,
      invimg: "ui/ridyn_inv",
      thumbimg: "ui/thumb_ridyn",
      STR: 13,
      DEX: 13,
      VIT: 10,
      WIS: 13,
      CHR: 11,
    },

    frameSize: { w: 64, h: 64 },
    layers: [
      { tile: "creatures/ridyn64base", opacity: 1.0 },
      {
        tile: "creatures/ridyn64top",
        opacity: 1.0,
        bob: { amplitudeY: -0.015, speed: 2 },
      },
    ],
  };
}

function kagamiSpriteMap() {
  return {
    defaults: {
      name: "Kagami",
      class: "Fighter",
      race: "Demi-Human,Inumimi",
      about: `<p></p>`,
      inv: ["ribbon", ""],
      gp: 0,
      invimg: "ui/kagami_inv",
      thumbimg: "ui/thumb_kagami",
      STR: 14,
      DEX: 11,
      VIT: 9,
      WIS: 12,
      CHR: 14,
    },

    frameSize: { w: 64, h: 64 },
    layers: [
      { tile: "creatures/kagami64base", opacity: 1.0 },
      {
        tile: "creatures/kagami64top",
        opacity: 1.0,
        bob: { amplitudeY: -0.015, speed: 2 },
      },
    ],
  };
}

function momoSpriteMap() {
  return {
    defaults: {
      name: "Momo Ohana",
      class: "Artificer",
      race: "Human,Human",
      about: `<p></p>`,
      inv: ["wrench", ""],
      gp: 0,
      invimg: "ui/momo_inv",
      thumbimg: "ui/thumb_momo",
      STR: 12,
      DEX: 9,
      VIT: 13,
      WIS: 15,
      CHR: 11,
    },

    frameSize: { w: 64, h: 64 },
    layers: [
      { tile: "creatures/momo64base", opacity: 1.0 },
      {
        tile: "creatures/momo64top",
        opacity: 1.0,
        bob: { amplitudeY: -0.015, speed: 2 },
      },
    ],
  };
}

function bakulSpriteMap() {
  return {
    defaults: {
      name: "Bakul Thunderbone",
      class: "Paladin",
      race: "Draconix,Draconix",
      about: `<p></p>`,
      inv: ["longsword", ""],
      gp: 0,
      invimg: "ui/bakul_inv",
      thumbimg: "ui/thumb_bakul",
      STR: 15,
      DEX: 12,
      VIT: 12,
      WIS: 11,
      CHR: 10,
    },

    frameSize: { w: 64, h: 64 },
    layers: [
      { tile: "creatures/bakul64base", opacity: 1.0 },
      {
        tile: "creatures/bakul64top",
        opacity: 1.0,
        bob: { amplitudeY: -0.015, speed: 2 },
      },
    ],
  };
}

function jonasSpriteMap() {
  return {
    defaults: {
      name: "Jonas Treboy",
      class: "Bard",
      race: "Mechamilite,Doll",
      about: `<p></p>`,
      inv: ["fist", ""],
      gp: 0,
      invimg: "ui/jonas_inv",
      thumbimg: "ui/thumb_jonas",
      STR: 8,
      DEX: 14,
      VIT: 10,
      WIS: 14,
      CHR: 14,
    },

    frameSize: { w: 64, h: 64 },
    layers: [
      { tile: "creatures/jonas64base", opacity: 1.0 },
      {
        tile: "creatures/jonas64top",
        opacity: 1.0,
        bob: { amplitudeY: -0.015, speed: 2 },
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Entity pool
// ---------------------------------------------------------------------------
let spawned = 0;
const MAX_ENTITIES = 100;

export const PLAYER_MAPS = {
  terenia: tereniaSpriteMap,
  mia: miaSpriteMap,
  ridyn: ridynSpriteMap,
  kagami: kagamiSpriteMap,
  momo: momoSpriteMap,
  bakul: bakulSpriteMap,
  jonas: jonasSpriteMap,
};

const MONSTER_MAPS = {
  spider: spiderSpriteMap,
  statue: statueSpriteMap,
  skywhale: skywhaleSpriteMap,
  doomdryad: doomDryadSpriteMap,
  centricia: centriciaSpriteMap, // npc really
};

const getRandomEntry = (obj) => {
  const vals = Object.values(obj);
  return vals[Math.floor(Math.random() * vals.length)];
};

// ---------------------------------------------------------------------------
// Spawner — places up to MAX_ENTITIES billboard-sprite enemies
// ---------------------------------------------------------------------------
// kind: 'npc', faction: 'npc', NPCs are neutral towards the player; hostile only to enemies
// kind: 'enemy', faction: 'enemy', Enemies are hostile to both the player and NPCs
// kind: 'decoration', faction: 'none',
// kind: 'player'
export function spawn() {
  const game = window.game;
  /*attachSpawner(game, {
		// called once per room
		onSpawn({ dungeon, roomId, x, y }) {
			// dungeon 	object 	Dungeon handle (rooms, passages, decorations)
			// roomId 	number 	ID of the room being populated
			// x 	number 	Tile X coordinate of the candidate spawn point
			// y 	number 	Tile Y coordinate of the candidate spawn point (maps to entity z)
			if (spawned >= MAX_ENTITIES) return null;
			if (roomId < 2) return null;
			if (Math.random() > 0.75) return null;
			spawned++;

			const sprmap = getRandomEntry(MONSTER_MAPS)();
			const e = createEntity({
				kind: 'enemy', faction: 'enemy',
				type: sprmap.defaults.name ?? "unknown creature",
				spriteMap: sprmap,
				x,
				z: y,
				hp: 8,
				maxHp: 8,
				attack: 2,
				defense: 0,
				speed: 1,
				danger: 1,
				xp: 10,
			});
			globs.entities.push(e);
			return e;
		},
		});*/
}

export function addActor(gr) {
  const sprmap = getRandomEntry(MONSTER_MAPS)();
  const actor = {
    id: `actor_${gr.cx}_${gr.cz}`,
    type: sprmap.defaults.name ?? "unknown creature",
    kind: "enemy",
    faction: "enemy",
    //		sprite: "M",
    x: gr.cx,
    z: gr.cz,
    //		hp: 8,
    //		maxHp: 8,
    attack: 2,
    defense: 0,
    //		speed: 6,
    //		alive: true,
    //		blocksMove: true,
    //		tick: 0,
    spriteMap: sprmap,
  };
  window.game.turns.addActor(actor);
  return actor;
}

// called when we hit "connect" button
export function playerConnectData(chosenSprite) {
  return {
    sprite: chosenSprite,
    attack: 5,
    defense: 2,
    maxHp: 31, // oddly this ends up being HP not maxHP
  };
}

export function spawnParty(ply1) {
  for (let i = 1; i < 4; i++) {
    const partymember = createEntity({
      id: `party_${globs.theParty[i].defaults.name}`,
      kind: "npc",
      faction: "npc",
      type: globs.theParty[i].defaults.name,
      spriteMap: globs.theParty[i],
      x: ply1.x,
      z: ply1.z,
      alive: true,
      speed: 6,
      maxHp: 28,
      hp: 20,
      attack: 2,
      defense: 1,
    });
    globs.entities.push(partymember); // this makes it display
    window.game.turns.addActor(partymember); // this makes it do something?
  }
}

// this one populates from the base SpriteMap() structures
// since it's only called when we create the game, we can also use it to create the party structure
export function initPartyData(pid, sprite) {
  const sprmap = (PLAYER_MAPS[sprite] ?? tereniaSpriteMap)();
  globs.theParty[0] = sprmap;

  const keys = Object.keys(PLAYER_MAPS).filter((k) => k !== sprite);
  for (let i = keys.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [keys[i], keys[j]] = [keys[j], keys[i]];
  }
  globs.theParty[1] = PLAYER_MAPS[keys[0]]();
  globs.theParty[2] = PLAYER_MAPS[keys[1]]();
  globs.theParty[3] = PLAYER_MAPS[keys[2]]();

  return {
    id: pid, // <-- match server-assigned id so reconciliation aligns
    kind: "player",
    faction: "player",
    alive: true, // should be alive at the point we create the game
    type: sprmap.defaults.name,
    sprite: sprite,
    spriteMap: sprmap,
    defaults: { ...sprmap.defaults },

    hp: 29,
    maxHp: 33,
    attack: 5,
    defense: 2,
    speed: 5,
  };
}

// used for all players, ONLY used during multiplayer - the server is informing us of other players
export function playerData(pid, ps) {
  const sprmap = (PLAYER_MAPS[ps.meta?.sprite] ?? tereniaSpriteMap)();
  return {
    id: pid,
    type: sprmap.defaults.name,
    sprite: ps.meta?.sprite,
    x: ps.x,
    z: ps.y,
    hp: ps.hp,
    maxHp: ps.maxHp,
    alive: ps.alive,
    attack: 0,
    defense: 0,
    speed: 0,
    blocksMove: false,
    faction: "player",
    tick: 0,
    spriteMap: sprmap,
  };
}

// ONLY the host uses this to inform the server of initial entity state
export function entityNetState(e) {
  return {
    id: e.id,
    kind: e.kind,
    type: e.type,
    sprite: e.sprite,
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
