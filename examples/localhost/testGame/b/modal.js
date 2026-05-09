import { globs } from './shared.js';
import { PLAYER_MAPS } from './entities.js';

export function doModal({ title, size, content, image, color }) {
	document.getElementById("modal-overlay").classList.add("hidden");

	const modal = document.querySelector('#modal-overlay .modal');
	const titleEl = modal.querySelector('.modal-title');
	const textArea = modal.querySelector('.text-area');

	// 1. Set title
	titleEl.textContent = title;
	titleEl.style.color = color;

	// 2. Toggle size
	modal.classList.remove('small', 'large');
	modal.classList.add(size); // expects 'small' or 'large'

	// 3. Replace content
	textArea.innerHTML = content;

	const canvas = document.getElementById("spriteCanvas");
	const ctx = canvas.getContext('2d');
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	ctx.imageSmoothingEnabled = false;
	globs.sprites.ctx = ctx;
	const fr = globs.sprites.getFrame(image);
	const x = (fr.spriteSourceSize.w >= 200) ? (800 - fr.spriteSourceSize.w * 2) - 8 : (600 - fr.spriteSourceSize.w) - 8;
	globs.sprites.drawSprite(fr, globs.sprites, x, (800 - fr.spriteSourceSize.h * 2) / 2);
}

// handles changing characters on the start modal
export function handleSpriteChange(value) {
	const canvas = document.getElementById("spriteCanvas");
	const ctx = canvas.getContext('2d');
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	const ply = PLAYER_MAPS[value]();
	const fr = globs.sprites.getFrame(ply.defaults.invimg);
	const x = (fr.spriteSourceSize.w >= 200) ? (800 - fr.spriteSourceSize.w * 2) - 8 : (600 - fr.spriteSourceSize.w) - 8;
	globs.sprites.drawSprite(fr, globs.sprites, x, (800 - fr.spriteSourceSize.h * 2) / 2);

	const cim = document.getElementById("charinfome");
	cim.innerHTML = ply.defaults.about ?? "";
}

export function showLevelTitle() {
	const overlay = document.getElementById("levelTitleOverlay");
	const modal = document.getElementById("levelTitleModal");

	// CONFIG
	const MIN_SKIP_DELAY = 500;
	const AUTO_DISMISS = 5000;
	const EXIT_DURATION = 500;

	let canSkip = false;
	let closing = false;

	// Block all game input
	const stopInput = (e) => {
		e.preventDefault();
		e.stopPropagation();
	};

	const blockedEvents = [
		"keydown",
		"keyup",
		"keypress",
		"mousedown",
		"mouseup",
		"mousemove",
		"click",
		"contextmenu",
		"wheel",
		"touchstart",
		"touchend"
	];

	blockedEvents.forEach(type => {
		window.addEventListener(type, stopInput, true);
	});

	function cleanupInputBlock() {
		blockedEvents.forEach(type => {
			window.removeEventListener(type, stopInput, true);
		});
	}

	function closeTitle() {
		if (closing) return;
		closing = true;

		modal.classList.remove("show");
		modal.classList.add("hide");

		overlay.style.transition =
			"backdrop-filter 400ms ease, background 400ms ease";

		overlay.style.backdropFilter = "blur(0px)";
		overlay.style.background = "rgba(0,0,0,0)";

		setTimeout(() => {
			overlay.classList.add("hidden");

			modal.classList.remove("hide");

			cleanupInputBlock();
		}, EXIT_DURATION);
	}

	function trySkip() {
		if (!canSkip) return;
		closeTitle();
	}

	overlay.classList.remove("hidden");

	// Force layout so transitions work
	void modal.offsetWidth;

	modal.classList.add("show");

	// Enable skipping after short delay
	setTimeout(() => {
		canSkip = true;

		window.addEventListener("keydown", trySkip, true);
		window.addEventListener("mousedown", trySkip, true);
		window.addEventListener("touchstart", trySkip, true);
	}, MIN_SKIP_DELAY);

	// Auto dismiss
	setTimeout(() => {
		closeTitle();
	}, AUTO_DISMISS);
}