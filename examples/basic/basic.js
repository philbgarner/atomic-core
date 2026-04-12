// basic.js — r3f-crawl-lib 3D example
// Demonstrates dungeon generation, turn-based movement, combat events,
// and first-person 3D rendering — no build step required.

const { createGame, createEnemy, attachSpawner, attachKeybindings, createDungeonRenderer } = CrawlLib;

// ---------------------------------------------------------------------------
// DOM refs
// ---------------------------------------------------------------------------

const viewportEl = document.getElementById('viewport');
const logEl      = document.getElementById('log');
const hpEl       = document.getElementById('hp');
const turnEl     = document.getElementById('turn');
const posEl      = document.getElementById('pos');

// ---------------------------------------------------------------------------
// Entity tracking
// ---------------------------------------------------------------------------

const enemies = [];
let spawned = 0;
const MAX_ENEMIES = 6;

// ---------------------------------------------------------------------------
// Create game
// ---------------------------------------------------------------------------

const game = createGame(document.body, {
  dungeon: {
    width: 40,
    height: 40,
    seed: 0xdeadbeef,
    roomMinSize: 5,
    roomMaxSize: 11,
    roomCount: 12,
  },
  player: {
    hp: 30,
    maxHp: 30,
    attack: 5,
    defense: 2,
    speed: 5,
  },
  combat: {
    onDamage({ attacker, defender, amount }) {
      addLog(`${attacker.type} hits ${defender.type} for ${amount} dmg`, 'damage');
    },
    onDeath({ entity }) {
      addLog(`${entity.type} is slain!`, 'death');
    },
    onMiss({ attacker, defender }) {
      addLog(`${attacker.type} misses ${defender.type}`, 'turn');
    },
  },
});

// ---------------------------------------------------------------------------
// 3D renderer
// ---------------------------------------------------------------------------

const renderer = createDungeonRenderer(viewportEl, game);

// ---------------------------------------------------------------------------
// Spawn enemies — one per room, capped, skipping early rooms
// ---------------------------------------------------------------------------

attachSpawner(game, {
  onSpawn({ roomId, x, y }) {
    if (spawned >= MAX_ENEMIES) return null;
    if (roomId < 2) return null;
    if (Math.random() > 0.55) return null;
    spawned++;
    const e = createEnemy({
      type: 'goblin',
      sprite: 'g',
      x,
      z: y,
      hp: 8,
      maxHp: 8,
      attack: 2,
      defense: 0,
      speed: 6,
      danger: 1,
      xp: 10,
    });
    enemies.push(e);
    return e;
  },
});

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

game.events.on('turn', ({ turn }) => {
  turnEl.textContent = String(turn);
  updateStats();
  renderer.setEntities(enemies);
});

game.events.on('audio', ({ name }) => {
  addLog(`[sfx] ${name}`, 'audio');
});

// ---------------------------------------------------------------------------
// Keyboard input
// ---------------------------------------------------------------------------

attachKeybindings(game, {
  bindings: {
    moveN:     ['w', 'W', 'ArrowUp'],
    moveS:     ['s', 'S', 'ArrowDown'],
    moveW:     ['a', 'A', 'ArrowLeft'],
    moveE:     ['d', 'D', 'ArrowRight'],
    turnLeft:  ['q', 'Q'],
    turnRight: ['e', 'E'],
    wait:      [' '],
  },
  onAction(action, event) {
    event.preventDefault();
    if (!game.player.alive) {
      addLog('You are dead. Refresh to restart.', 'death');
      return;
    }
    let a;
    switch (action) {
      case 'moveN':     a = game.player.move( 0, -1); break;
      case 'moveS':     a = game.player.move( 0,  1); break;
      case 'moveW':     a = game.player.move(-1,  0); break;
      case 'moveE':     a = game.player.move( 1,  0); break;
      case 'turnLeft':  a = game.player.rotate(-Math.PI / 2); break;
      case 'turnRight': a = game.player.rotate( Math.PI / 2); break;
      case 'wait':      a = game.player.wait(); break;
    }
    if (a) game.turns.commit(a);
  },
});

// ---------------------------------------------------------------------------
// Generate the dungeon
// ---------------------------------------------------------------------------

game.generate();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function addLog(text, cls) {
  const div = document.createElement('div');
  div.className = 'entry' + (cls ? ' ' + cls : '');
  div.textContent = text;
  logEl.prepend(div);
  while (logEl.children.length > 40) logEl.lastElementChild.remove();
}

function updateStats() {
  hpEl.textContent  = `${game.player.hp} / ${game.player.maxHp}`;
  posEl.textContent = `${game.player.x}, ${game.player.z}`;
}
