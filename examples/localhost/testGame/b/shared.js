import { text } from './text.js';

export const globs = {
	hpEl: null, posEl: null,
	viewportEl: null, minimapCanvas: null, connectScreen: null, connectBtn: null, serverUrlEl: null,
	connectError: null, chatOverlayEl: null, chatModalEl: null,
	chatInputEl: null, chatSendBtn: null, canvasWrapEl: null, turnEl: null, tooltipEl: null,
	bannerEl: null, needleEl:null, todEl:null,

	chatModalOpen: false,// multiplayer chat dialog
	resolver: null,		// texture atlas stuff
	packed: null,		// texture atlas stuff
	sprites: null,		// our sprite class for 2d sprites
	skyboxFaces: null,	// skybox data
	theParty: [null, null, null, null],	// party data
	entities: [],		// list of known entities
	levelGEO: null,		// GEOs for the current level
};
// also window.game, window.renderer

export function addChatMessage(senderId, text) {
	const isServer = senderId === 'server';
	const div = document.createElement('div');
	div.className = 'chat-msg' + (isServer ? ' server-msg' : '');
	div.textContent = isServer ? text : `${senderId}: ${text}`;
	globs.chatOverlayEl.prepend(div);
	// Remove the element after the CSS animation ends so the DOM stays tidy
	setTimeout(() => div.remove(), 6500);
	while (globs.chatOverlayEl.children.length > 32) globs.chatOverlayEl.lastElementChild.remove();
}

export function addLog(text, cls) {
	addChatMessage('log-entry' + (cls ? ' ' + cls : '') ,text);
}

// ***************************************************************************
// DEBUG - regions are used to hilite and determine properties for debug 
// ***************************************************************************
// ---------------------------------------------------------------------------
// Highlight state for regions
// ---------------------------------------------------------------------------
let hoverHandle = null;  // single-cell hover tint
let selectHandle = null;  // whole-region selection highlight
let regionHandle = null;  // debug region-colour overlay
let regionColorsOn = false;
// ---------------------------------------------------------------------------
// Debug: toggle region-colour overlay (press button or R key)
// ---------------------------------------------------------------------------
export function toggleRegionColors() {
	regionColorsOn = !regionColorsOn;

	if (regionHandle) { regionHandle.remove(); regionHandle = null; }

	// Distinct hues cycling across region IDs (HSL: spread evenly, medium sat/light)
	function regionColor(regionId) {
		const hue = (regionId * 47) % 360;
		return `hsla(${hue}, 70%, 55%, 0.35)`;
	}

	if (regionColorsOn && window.renderer) {
		regionHandle = window.renderer.highlightCells((_cx, _cz, regionId) =>
			regionId > 0 ? regionColor(regionId) : null,
		);
	}
}
export function handleCellHover(info) {
	if (hoverHandle) { hoverHandle.remove(); hoverHandle = null; }

	if (!info) {
		globs.tooltipEl.classList.add("hidden");
		return;
	}

	const label = `(${info.cx}, ${info.cz})  region ${info.regionId}`;

	globs.tooltipEl.textContent = label;
	globs.tooltipEl.classList.remove("hidden");

	hoverHandle=null;
	/* hilite the actual cell
	hoverHandle = window.renderer.highlightCells((cx, cz) =>
		cx === info.cx && cz === info.cz ? "rgb(20, 80, 255)" : null,
	);*/
}
export function handleCellClick(info) {
	if (selectHandle) { selectHandle.remove(); selectHandle = null; }

	const room = Object.values(game.dungeon.rooms).find((r) => r.id === info.regionId);
	const roomLabel = room
		? `${room.type} #${room.id}  ${room.w}×${room.h}`
		: `region ${info.regionId}`;

		// TODO - use this data
		// ${info.cx}, ${info.cz}) · ${roomLabel}

	selectHandle = window.renderer.highlightCells((cx, cz) =>
		cx === info.cx && cz === info.cz ? "rgba(255, 230, 20, 0.5)" : null,
	);
}
// ***************************************************************************

export function txt(thetxt) {
	return text[thetxt] ?? "unknown text";
}

export function showFloatText(text, color, gridX, gridZ) {
	const el = document.createElement("div");
	el.className = "anim-float";
	el.style.color = color;
	const pos = window.renderer?.worldToScreen(gridX, gridZ);
	el.style.left = (pos ? pos.x : globs.canvasWrapEl.clientWidth * 0.5) + "px";
	el.style.top = (pos ? pos.y : globs.canvasWrapEl.clientHeight * 0.4) + "px";
	el.textContent = text;
	globs.canvasWrapEl.appendChild(el);
	el.addEventListener("animationend", () => el.remove(), { once: true });
}

// use ScreenManager.show(TitleScreen);
export const ScreenManager = (() => {
	let current = null;

	return {
		show(screen) {
			if (current) {
				current.el.classList.remove('active');
				current.onExit();
			}

			screen.el.classList.add('active');
			current = screen;
			current.onEnter();
		}
	};
})();