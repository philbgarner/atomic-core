'use strict';
import { addLog, globs, txt } from './shared.js';

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


// ---------------------------------------------------------------------------------------------
// ENTRY FUNCTION
// ---------------------------------------------------------------------------------------------

export function exitdlg() {
	switchMode(null, MODE.INV);
	doDRP(dropThese, players[0].inv); dropThese = [];
	// possible "shuffle inv cmd"
}
