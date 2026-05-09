import { globs } from './shared.js';

let currentDir = 0;
let currentTod = 0;

function normalizeAngle(angle) {
	return ((angle % 360) + 360) % 360;
}

// ensures shortest rotation path
function shortestAngle(from, to) {
	let diff = normalizeAngle(to) - normalizeAngle(from);
	if (diff > 180) diff -= 360;
	if (diff < -180) diff += 360;
	return from + diff;
}

export function setCompass(tod, dir) {
	const targetTod = shortestAngle(currentTod, tod);
	const targetDir = shortestAngle(currentDir, dir);

	currentTod = targetTod;
	currentDir = targetDir;

	globs.todEl.style.transform = `rotate(${targetTod}deg)`;
	globs.needleEl.style.transform = `rotate(${targetDir}deg)`;
}

export function initButtonCanvases() {
	document.querySelectorAll('.img-btnQ').forEach(btn => {
		const canvas = btn.querySelector('.btn-canvas');
		if (canvas) {
			const rect = btn.getBoundingClientRect();

			canvas.width = rect.width;
			canvas.height = rect.height;
		}
	});

	drawImageOnButtons('player1', globs.theParty[0]);
	drawImageOnButtons('player2', globs.theParty[1]);
	drawImageOnButtons('player3', globs.theParty[2]);
	drawImageOnButtons('player4', globs.theParty[3]);
}

const offsetTable = new Map([
	["Fire Breath", { atlas: "ui/icons1", x: 0, y: 0, }],
	["Cold Breath", { atlas: "ui/icons1", x: 1, y: 0, }],
	["Control Liquid", { atlas: "ui/icons1", x: 2, y: 0, }],
	["Control Flames", { atlas: "ui/icons1", x: 3, y: 0, }],
	["Shape Earth", { atlas: "ui/icons1", x: 4, y: 0, }],
	["Dash", { atlas: "ui/icons1", x: 5, y: 0, }],
	["Climbing", { atlas: "ui/icons1", x: 6, y: 0, }],
	["Afraid", { atlas: "ui/icons1", x: 7, y: 0, }],

	["Blindsight", { atlas: "ui/icons1", x: 0, y: 1, }],
	["Amphibious", { atlas: "ui/icons1", x: 1, y: 1, }],
	["Swimming", { atlas: "ui/icons1", x: 2, y: 1, }],
	["Shocking Touch", { atlas: "ui/icons1", x: 3, y: 1, }],
	["Scald", { atlas: "ui/icons1", x: 4, y: 1, }],
	["Mana Flame", { atlas: "ui/icons1", x: 5, y: 1, }],
	["Mana Awareness", { atlas: "ui/icons1", x: 6, y: 1, }],
	["Unconscious", { atlas: "ui/icons1", x: 7, y: 1, }],

	["Burning", { atlas: "ui/icons1", x: 0, y: 2, }],
	["Freezing", { atlas: "ui/icons1", x: 1, y: 2, }],
	["Corroding", { atlas: "ui/icons1", x: 2, y: 2, }],
	["Poisoned", { atlas: "ui/icons1", x: 3, y: 2, }],
	["Shocked", { atlas: "ui/icons1", x: 4, y: 2, }],
	["Diseased", { atlas: "ui/icons1", x: 5, y: 2, }],
	["Irradiated", { atlas: "ui/icons1", x: 6, y: 2, }],
	["Dominated", { atlas: "ui/icons1", x: 7, y: 2, }],

	["Fire Resistance", { atlas: "ui/icons1", x: 0, y: 3, }],
	["Cold Resistance", { atlas: "ui/icons1", x: 1, y: 3, }],
	["Acid Resistance", { atlas: "ui/icons1", x: 2, y: 3, }],
	["Poison Resistance", { atlas: "ui/icons1", x: 3, y: 3, }],
	["Electrical Resistance", { atlas: "ui/icons1", x: 4, y: 3, }],
	["Necrotic Resistance", { atlas: "ui/icons1", x: 5, y: 3, }],
	["Radiant Resistance", { atlas: "ui/icons1", x: 6, y: 3, }],
	["Psychic Resistance", { atlas: "ui/icons1", x: 7, y: 3, }],

	["Hidden", { atlas: "ui/icons1", x: 0, y: 4, }],
	["Cover", { atlas: "ui/icons1", x: 1, y: 4, }],
	["Fall Resistance", { atlas: "ui/icons1", x: 2, y: 4, }],
	["Blind", { atlas: "ui/icons1", x: 3, y: 4, }],
	["Stunned", { atlas: "ui/icons1", x: 4, y: 4, }],
	["blossom", { atlas: "ui/icons1", x: 5, y: 4, }],
	["alert", { atlas: "ui/icons1", x: 6, y: 4, }],
	["loves", { atlas: "ui/icons1", x: 7, y: 4, }],

	["orz", { atlas: "ui/icons1", x: 0, y: 5, }],
	["mad", { atlas: "ui/icons1", x: 1, y: 5, }],
	["sweat", { atlas: "ui/icons1", x: 2, y: 5, }],
	["puff", { atlas: "ui/icons1", x: 3, y: 5, }],

	["scythe", { atlas: "ui/icons2", x: 0, y: 0, }],
	["trident", { atlas: "ui/icons2", x: 1, y: 0, }],
	["urumi", { atlas: "ui/icons2", x: 2, y: 0, }],
	["war fan", { atlas: "ui/icons2", x: 3, y: 0, }],
	["kunai", { atlas: "ui/icons2", x: 4, y: 0, }],
	["chakram", { atlas: "ui/icons2", x: 5, y: 0, }],
	["dart", { atlas: "ui/icons2", x: 6, y: 0, }],
	["brass knuckles", { atlas: "ui/icons2", x: 7, y: 0, }],

	["bolas", { atlas: "ui/icons2", x: 0, y: 1, }],
	["nunchaku", { atlas: "ui/icons2", x: 1, y: 1, }],
	["shuriken", { atlas: "ui/icons2", x: 2, y: 1, }],
	["meteor hammer", { atlas: "ui/icons2", x: 3, y: 1, }],
	["kusarigama", { atlas: "ui/icons2", x: 4, y: 1, }],
	["pitchfork", { atlas: "ui/icons2", x: 5, y: 1, }],
	["greatclub", { atlas: "ui/icons2", x: 6, y: 1, }],
	["club", { atlas: "ui/icons2", x: 7, y: 1, }],

	["buckler", { atlas: "ui/icons2", x: 0, y: 2, }],
	["shield", { atlas: "ui/icons2", x: 1, y: 2, }],
	["tower shield", { atlas: "ui/icons2", x: 2, y: 2, }],
	["khopesh", { atlas: "ui/icons2", x: 3, y: 2, }],
	["katar", { atlas: "ui/icons2", x: 4, y: 2, }],
	["sickle", { atlas: "ui/icons2", x: 5, y: 2, }],
	["pickaxe", { atlas: "ui/icons2", x: 6, y: 2, }],
	["boomerang", { atlas: "ui/icons2", x: 7, y: 2, }],

	["whip", { atlas: "ui/icons2", x: 0, y: 3, }],
	["scourge", { atlas: "ui/icons2", x: 1, y: 3, }],
	["harpoon", { atlas: "ui/icons2", x: 2, y: 3, }],
	["torch", { atlas: "ui/icons2", x: 3, y: 3, }],
	["knife", { atlas: "ui/icons2", x: 4, y: 3, }],
	["dagger", { atlas: "ui/icons2", x: 5, y: 3, }],
	["chain whip", { atlas: "ui/icons2", x: 6, y: 3, }],
	["sling", { atlas: "ui/icons2", x: 7, y: 3, }],

	["spiked chain", { atlas: "ui/icons2", x: 0, y: 4, }],
	["flail", { atlas: "ui/icons2", x: 1, y: 4, }],
	["broadsword", { atlas: "ui/icons2", x: 2, y: 4, }],
	["mace", { atlas: "ui/icons2", x: 3, y: 4, }],
	["morningstar", { atlas: "ui/icons2", x: 4, y: 4, }],
	["hammer", { atlas: "ui/icons2", x: 5, y: 4, }],
	["quarterstaff", { atlas: "ui/icons2", x: 6, y: 4, }],
	["hand crossbow", { atlas: "ui/icons2", x: 7, y: 4, }],

	["light crossbow", { atlas: "ui/icons2", x: 0, y: 5, }],
	["heavy crossbow", { atlas: "ui/icons2", x: 1, y: 5, }],
	["arbalest", { atlas: "ui/icons2", x: 2, y: 5, }],
	["bardiche", { atlas: "ui/icons2", x: 3, y: 5, }],
	["maul", { atlas: "ui/icons2", x: 4, y: 5, }],
	["ribbon", { atlas: "ui/icons2", x: 5, y: 5, }],
	["shortbow", { atlas: "ui/icons2", x: 6, y: 5, }],
	["bow", { atlas: "ui/icons2", x: 7, y: 5, }],

	["composite bow", { atlas: "ui/icons2", x: 0, y: 6, }],
	["greataxe", { atlas: "ui/icons2", x: 1, y: 6, }],
	["kukri", { atlas: "ui/icons2", x: 2, y: 6, }],
	["staff", { atlas: "ui/icons2", x: 3, y: 6, }],
	["war pick", { atlas: "ui/icons2", x: 4, y: 6, }],
	["halberd", { atlas: "ui/icons2", x: 5, y: 6, }],
	["battleaxe", { atlas: "ui/icons2", x: 6, y: 6, }],
	["handaxe", { atlas: "ui/icons2", x: 7, y: 6, }],

	["hatchet", { atlas: "ui/icons2", x: 0, y: 7, }],
	["rapier", { atlas: "ui/icons2", x: 1, y: 7, }],
	["gladius", { atlas: "ui/icons2", x: 2, y: 7, }],
	["machete", { atlas: "ui/icons2", x: 3, y: 7, }],
	["javelin", { atlas: "ui/icons2", x: 4, y: 7, }],
	["greatsword", { atlas: "ui/icons2", x: 5, y: 7, }],
	["war hammer", { atlas: "ui/icons2", x: 6, y: 7, }],
	["spear", { atlas: "ui/icons2", x: 7, y: 7, }],

	["siangham", { atlas: "ui/icons3", x: 0, y: 0, }],
	["glaive", { atlas: "ui/icons3", x: 1, y: 0, }],
	["naginata", { atlas: "ui/icons3", x: 2, y: 0, }],
	["war scythe", { atlas: "ui/icons3", x: 3, y: 0, }],
	["katana", { atlas: "ui/icons3", x: 4, y: 0, }],
	["wakizashi", { atlas: "ui/icons3", x: 5, y: 0, }],
	["cutlass", { atlas: "ui/icons3", x: 6, y: 0, }],
	["scimitar", { atlas: "ui/icons3", x: 7, y: 0, }],

	["dao", { atlas: "ui/icons3", x: 0, y: 1, }],
	["claymore", { atlas: "ui/icons3", x: 1, y: 1, }],
	["longsword", { atlas: "ui/icons3", x: 2, y: 1, }],
	["shortsword", { atlas: "ui/icons3", x: 3, y: 1, }],
	["claws", { atlas: "ui/icons3", x: 4, y: 1, }],
	["saber", { atlas: "ui/icons3", x: 5, y: 1, }],
	["musket", { atlas: "ui/icons3", x: 6, y: 1, }],
	["rifle", { atlas: "ui/icons3", x: 7, y: 1, }],

	["arquebus", { atlas: "ui/icons3", x: 0, y: 2, }],
	["blunderbuss", { atlas: "ui/icons3", x: 1, y: 2, }],
	["handgonne", { atlas: "ui/icons3", x: 2, y: 2, }],
	["empty hand", { atlas: "ui/icons3", x: 3, y: 2, }],
	["fist", { atlas: "ui/icons3", x: 4, y: 2, }],
	["empty hand disabled", { atlas: "ui/icons3", x: 5, y: 2, }],
	["fist disabled", { atlas: "ui/icons3", x: 6, y: 2, }],
	["wrench", { atlas: "ui/icons3", x: 7, y: 2, }],

	["cobweb", { atlas: "ui/icons4", x: 0, y: 0, }],
	["winged badge", { atlas: "ui/icons4", x: 1, y: 0, }],
	["silver brooch", { atlas: "ui/icons4", x: 2, y: 0, }],
	["shield logo", { atlas: "ui/icons4", x: 3, y: 0, }],
	["active rune", { atlas: "ui/icons4", x: 4, y: 0, }],
	["trigger rune", { atlas: "ui/icons4", x: 5, y: 0, }],
	["pristine book", { atlas: "ui/icons4", x: 6, y: 0, }],
	["book of plants", { atlas: "ui/icons4", x: 7, y: 0, }],

	["deformed skull", { atlas: "ui/icons4", x: 0, y: 1, }],
	["silver medallion", { atlas: "ui/icons4", x: 1, y: 1, }],
	["vial pendant", { atlas: "ui/icons4", x: 2, y: 1, }],
	["book of mana", { atlas: "ui/icons4", x: 3, y: 1, }],
	["singed textbook", { atlas: "ui/icons4", x: 4, y: 1, }],
	["book of water", { atlas: "ui/icons4", x: 5, y: 1, }],
	["manual of poisons", { atlas: "ui/icons4", x: 6, y: 1, }],
	["prismatic book", { atlas: "ui/icons4", x: 7, y: 1, }],

	["book of traps", { atlas: "ui/icons4", x: 0, y: 2, }],
	["monastic book", { atlas: "ui/icons4", x: 1, y: 2, }],
	["self-help booklet", { atlas: "ui/icons4", x: 2, y: 2, }],
	["barrier textbook", { atlas: "ui/icons4", x: 3, y: 2, }],
	["peace book", { atlas: "ui/icons4", x: 4, y: 2, }],
	["book of the dead", { atlas: "ui/icons4", x: 5, y: 2, }],
	["book of light", { atlas: "ui/icons4", x: 6, y: 2, }],
	["enormous bone", { atlas: "ui/icons4", x: 7, y: 2, }],

	["rose", { atlas: "ui/icons4", x: 1, y: 3, }],
	["wisteria", { atlas: "ui/icons4", x: 2, y: 3, }],
	["medicinal herb", { atlas: "ui/icons4", x: 3, y: 3, }],
	["flower pot", { atlas: "ui/icons4", x: 4, y: 3, }],

	["large pile of coins", { atlas: "ui/icons4", x: 1, y: 4, }],
	["small pile of coins", { atlas: "ui/icons4", x: 2, y: 4, }],

	["damaged web", { atlas: "ui/icons4", x: 0, y: 5, }],
]);

function drawImageOnButtons(containerId, ply) {
	const container = document.getElementById(containerId);
	const buttons = container.querySelectorAll('.img-btnQ');
	const bars = container.querySelectorAll('.img-text');

	// each player has 3 buttons - thumb, dominant hand, offhand
	// 2 bars, top and bottom
	bars[0].textContent = ply.defaults.name;

	for (let i = 0; i < 3; i++) {
		const btn = buttons[i];
		const canvas = btn.querySelector('.btn-canvas');
		const ctx = canvas.getContext('2d');

		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.imageSmoothingEnabled = false;
		globs.sprites.ctx = ctx;

		switch (i) {
			case 0:
				{
					const fr = globs.sprites.getFrame(ply.defaults.thumbimg);
					globs.sprites.drawSprite(fr, globs.sprites, (canvas.width - fr.spriteSourceSize.w * 2) / 2, (canvas.height - fr.spriteSourceSize.h * 2) / 2);
				}
				break;
			default:
				{
					const ic = offsetTable.get(ply.defaults.inv[i - 1] || "empty hand");
					const fr = globs.sprites.getFrame(ic.atlas);
					globs.sprites.drawIcon(fr, globs.sprites, (canvas.width - 64) / 2, (canvas.height - 64) / 2, ic.x*32, ic.y*32);
				}
				break;
		}

	};
}
