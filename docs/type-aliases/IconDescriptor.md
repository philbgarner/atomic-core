[atomic-core](../README.md) / IconDescriptor

# Type Alias: IconDescriptor

> **IconDescriptor** = `string` \| \{ `rot?`: `number`; `url`: `string`; \} \| \{ `atlasCanvas`: `HTMLCanvasElement`; `rot?`: `number`; `sh`: `number`; `sw`: `number`; `sx`: `number`; `sy`: `number`; \}

Defined in: [ui/inventoryDialog.ts:73](https://github.com/philbgarner/atomic-core/blob/498d6b46e9389c84d1eb5047eb7861b469b0e47a/src/lib/ui/inventoryDialog.ts#L73)

Describes how to render an item icon.
- `string` — plain image URL.
- `{ url, rot? }` — URL with optional CW rotation in degrees (0/90/180/270).
- `{ atlasCanvas, sx, sy, sw, sh, rot? }` — source-rectangle crop from a canvas atlas.
