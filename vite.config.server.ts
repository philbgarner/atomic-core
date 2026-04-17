// vite.config.server.ts
//
// Builds a Node-compatible dungeon module for the multiplayer server.
// 'three' is aliased to a minimal shim (no GPU, no browser context required).
// Output: dist/server/dungeon.js  (ESM, importable by src/server/index.js)

import { defineConfig } from 'vite'
import { resolve } from 'path'
import type { Plugin } from 'vite'

function shebangPlugin(): Plugin {
  return {
    name: 'shebang',
    renderChunk(code, chunk) {
      if (chunk.fileName === 'index.js') {
        return { code: '#!/usr/bin/env node\n' + code, map: null }
      }
      return null
    },
  }
}

export default defineConfig({
  resolve: {
    alias: {
      three: resolve(__dirname, 'src/server/three-shim.js'),
    },
  },
  plugins: [shebangPlugin()],
  build: {
    lib: {
      entry: {
        dungeon: resolve(__dirname, 'src/server/dungeon-entry.ts'),
        index: resolve(__dirname, 'src/server/index.js'),
      },
      formats: ['es'],
    },
    outDir: 'dist/server',
    emptyOutDir: true,
    rollupOptions: {
      external: ['express', 'ws', 'node:http', 'node:path', 'node:url', 'node:os'],
    },
    sourcemap: true,
    minify: false,
  },
})
