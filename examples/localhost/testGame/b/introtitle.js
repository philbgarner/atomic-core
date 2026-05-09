'use strict';

import { ScreenManager, txt } from './shared.js';
import { Connectscreen } from './multiplayer.js';

// TODO -
// we need something more exciting than a black screen and click to start - maybe white clouds?
// when the vid starts, hide the cursor?
// transition to gif title not static screen
// have a proper menu with options implemented here

const TitleScreen = (() => {
	let container, canvas, ctx, video, overlay, finalImage;
	let playing = -1;
	let ready = false;

	function init(rootId) {
		container = document.getElementById(rootId);

		container.innerHTML = `
		<canvas width="1280" height="800"></canvas>
		<img src="./a/gm_title.png" width="1280" height="800" style="display:none;">
		`;

		canvas = container.querySelector('canvas');
		ctx = canvas.getContext('2d');
		finalImage = container.querySelector('img');

		ctx.imageSmoothingEnabled = false;

		setup();
	}

	function onEnter() {
		if (playing<0) showFinalImage();
		// Skip with Escape
		// User interaction handler
		window.addEventListener('keydown', handleKeys);
		window.addEventListener('click', handleMouse);	// required because videos with audio won't autoplay in browsers
	}

	function onExit() { 
		playing = -1;
		window.removeEventListener('keydown', handleKeys);
		window.removeEventListener('click', handleMouse);

		ctx.clearRect(0, 0, canvas.width, canvas.height);
	}

	function handleMouse(e) {
		handleKeys((playing===0) ? {key:' '} : {key:'Escape'});
	}
	function handleKeys(e) {
		switch (playing) {
			case -1: // ended. we're on the title screen now
				document.getElementById("modal-overlay").classList.remove("hidden");
				ScreenManager.show(Connectscreen);
				break;
		}
	}

	function setup() {
	}

	// Transition
	function showFinalImage() {
		playing = -1;
		ctx.drawImage(finalImage, 0, 0, 1280, 800);
	}

	return {
		init,
		onEnter,
		onExit,
		get el() { return container; }
	};
})();

TitleScreen.init('titlescreen');
ScreenManager.show(TitleScreen);