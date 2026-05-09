/* 	
	anything connected with sprites, sprite atlas, or textures. this handles rotates too.
*/

// ---------------------------------------------------------------------------------------------
// ENTRY class
// ---------------------------------------------------------------------------------------------
export class SpriteSheet {
	constructor(imagePath, jsonPath) {
		this.imagePath = imagePath;
		this.jsonPath = jsonPath;
		this.image = null;
		this.frames = {};
	}

	async load() {
		const [img, data] = await Promise.all([
			this.loadImage(this.imagePath),
			fetch(this.jsonPath).then(r => r.json())
		]);
		this.image = img;
		this.frames = data.frames;
	}

	loadImage(src) {
		return new Promise((resolve, reject) => {
			const img = new Image();
			img.onload = () => resolve(img);
			img.onerror = reject;
			img.src = src;
		});
	}

	getFrame(name) {
		return this.frames[name];
	}

	drawSprite(frameData, sheet, x, y) {
		if (!frameData) return;

		const f = frameData.frame;
		const rotated = frameData.rotated;
		const scale = 2;
		const w = f.w;
		const h = f.h;
		const dw = w * scale;
		const dh = h * scale;

		this.ctx.save();
		this.ctx.translate(x + dw / 2, y + dh / 2);

		if (rotated) {
			this.ctx.rotate(-Math.PI / 2);
			this.ctx.drawImage(
				sheet.image,
				f.x, f.y, h, w,
				-dh/2, -dw/2,
				dh, dw
			);
		} else {
			this.ctx.drawImage(
				sheet.image,
				f.x, f.y, w, h,
				-dw / 2, -dh / 2,
				dw, dh
			);
		}

		this.ctx.restore();
	}

	drawIcon(frameData, sheet, x, y, offx=0, offy=0, wid=32, hei=32) {
		if (!frameData) return;

		const f = frameData.frame;
		const rotated = frameData.rotated;
		const scale = 2;
		const w = wid;
		const h = hei;
		const dw = w * scale;
		const dh = h * scale;

		this.ctx.save();
		this.ctx.translate(x + dw / 2, y + dh / 2);

		if (rotated) {
			this.ctx.rotate(-Math.PI / 2);
			this.ctx.drawImage(
				sheet.image,
				f.x+offx, f.y+offy, h, w,
				-dh/2, -dw/2,
				dh, dw
			);
		} else {
			this.ctx.drawImage(
				sheet.image,
				f.x+offx, f.y+offy, w, h,
				-dw / 2, -dh / 2,
				dw, dh
			);
		}

		this.ctx.restore();
	}

}
