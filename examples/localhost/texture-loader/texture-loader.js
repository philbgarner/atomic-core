// texture-loader.js — atomic-core texture loader demo
//
// Demonstrates loadTextureAtlas():
//   1. Fetches textureAtlas.json and textureAtlas.png from the local server.
//   2. Shelf-packs all sprites into a power-of-two OffscreenCanvas.
//   3. Displays the baked texture and lists the first 20 sprite names with UV data.
//   4. Demonstrates resolveSprite() by both name and insertion-order id.

const { loadTextureAtlas, resolveSprite } = AtomicCore;

const statusEl = document.getElementById("status");
const countEl = document.getElementById("sprite-count");
const texSizeEl = document.getElementById("tex-size");
const spriteListEl = document.getElementById("sprite-list");
const outputCanvas = document.getElementById("packed-canvas");

async function main() {
  statusEl.textContent = "loading...";

  const atlasJson = await fetch("../textureAtlas.json").then((r) => r.json());

  const atlas = await loadTextureAtlas("../textureAtlas.png", atlasJson, {
    showLoadingScreen: true,
    loadingText: "Packing sprites...",
    onProgress: (loaded, total) => {
      statusEl.textContent = `step ${loaded}/${total}`;
    },
  });

  // --- Draw baked texture onto the visible canvas ---
  const src = atlas.texture;
  const w = src.width;
  const h = src.height;

  outputCanvas.width = w;
  outputCanvas.height = h;

  const ctx = outputCanvas.getContext("2d");

  if (src instanceof OffscreenCanvas) {
    const bmp = src.transferToImageBitmap();
    ctx.drawImage(bmp, 0, 0);
    bmp.close();
  } else {
    ctx.drawImage(src, 0, 0);
  }

  // --- Update sidebar stats ---
  statusEl.textContent = "ready";
  countEl.textContent = atlas.sprites.size;
  texSizeEl.textContent = `${w}×${h}`;

  // --- List first 20 sprites ---
  const names = [...atlas.sprites.keys()].slice(0, 20);
  spriteListEl.innerHTML = names
    .map((name) => {
      const s = atlas.getByName(name);
      return (
        `<span>${name}</span><br>` +
        `id:${s.id} uv:(${s.uvX.toFixed(3)},${s.uvY.toFixed(3)})<br>`
      );
    })
    .join("");

  // --- Demonstrate resolveSprite with both name and id ---
  const byName = resolveSprite(atlas, "bat_placeholder1.png");
  const byId = resolveSprite(atlas, byName?.id ?? 0);

  console.log("[texture-loader] resolveSprite by name:", byName);
  console.log("[texture-loader] resolveSprite by id:  ", byId);
  console.log(`[texture-loader] same sprite? ${byName === byId}`);
}

main().catch((err) => {
  statusEl.textContent = "error";
  console.error("[texture-loader]", err);
});
