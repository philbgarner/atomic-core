[atomic-core](../README.md) / SetCellOptions

# Type Alias: SetCellOptions

> **SetCellOptions** = `object`

Defined in: [api/createGame.ts:140](https://github.com/philbgarner/atomic-core/blob/f8e5a1712339d89f8c0fc24685360b41bb8a8d3b/src/lib/api/createGame.ts#L140)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="applytextureto"></a> `applyTextureTo?` | [`ApplyTarget`](ApplyTarget.md)[] | Override which surfaces receive the texture. When omitted, defaults to floor+ceiling for open cells and wall for solid cells. | [api/createGame.ts:142](https://github.com/philbgarner/atomic-core/blob/f8e5a1712339d89f8c0fc24685360b41bb8a8d3b/src/lib/api/createGame.ts#L142) |
| <a id="ceilingheightoffset"></a> `ceilingHeightOffset?` | `number` | Lower (+) or raise (-) the ceiling surface by this many offset steps. Phase 3. | [api/createGame.ts:150](https://github.com/philbgarner/atomic-core/blob/f8e5a1712339d89f8c0fc24685360b41bb8a8d3b/src/lib/api/createGame.ts#L150) |
| <a id="ceilingpanelcount"></a> `ceilingPanelCount?` | `number` | Number of downward ceiling panels hanging below the ceiling. 0–4. | [api/createGame.ts:154](https://github.com/philbgarner/atomic-core/blob/f8e5a1712339d89f8c0fc24685360b41bb8a8d3b/src/lib/api/createGame.ts#L154) |
| <a id="ceilingskirt"></a> `ceilingSkirt?` | (`string` \| `null`)[] | Ceiling skirt slot tile names (up to 4). Null entries inherit the default. | [api/createGame.ts:158](https://github.com/philbgarner/atomic-core/blob/f8e5a1712339d89f8c0fc24685360b41bb8a8d3b/src/lib/api/createGame.ts#L158) |
| <a id="colliderflags"></a> `colliderFlags?` | [`ColliderFlags`](ColliderFlags.md) | Fine-grained collider flags. Phase 2. | [api/createGame.ts:146](https://github.com/philbgarner/atomic-core/blob/f8e5a1712339d89f8c0fc24685360b41bb8a8d3b/src/lib/api/createGame.ts#L146) |
| <a id="floorheightoffset"></a> `floorHeightOffset?` | `number` | Raise (+) or lower (-) the floor surface by this many offset steps. Phase 3. | [api/createGame.ts:148](https://github.com/philbgarner/atomic-core/blob/f8e5a1712339d89f8c0fc24685360b41bb8a8d3b/src/lib/api/createGame.ts#L148) |
| <a id="floorskirt"></a> `floorSkirt?` | (`string` \| `null`)[] | Floor skirt slot tile names (up to 4). Null entries inherit the default. | [api/createGame.ts:156](https://github.com/philbgarner/atomic-core/blob/f8e5a1712339d89f8c0fc24685360b41bb8a8d3b/src/lib/api/createGame.ts#L156) |
| <a id="hazard"></a> `hazard?` | `number` | Hazard ID to write into the hazards texture (0 = none). Phase 4. | [api/createGame.ts:160](https://github.com/philbgarner/atomic-core/blob/f8e5a1712339d89f8c0fc24685360b41bb8a8d3b/src/lib/api/createGame.ts#L160) |
| <a id="skipsync"></a> `skipSync?` | `boolean` | When true, skip syncing this change to the server. Defaults to false when a transport is configured. Set to true for bulk initialisation (e.g. generate callbacks) where the result is already deterministic across all clients. | [api/createGame.ts:168](https://github.com/philbgarner/atomic-core/blob/f8e5a1712339d89f8c0fc24685360b41bb8a8d3b/src/lib/api/createGame.ts#L168) |
| <a id="skypanelcount"></a> `skyPanelCount?` | `number` | Number of upward sky panels above the wall (open-sky cells). 0–4. | [api/createGame.ts:152](https://github.com/philbgarner/atomic-core/blob/f8e5a1712339d89f8c0fc24685360b41bb8a8d3b/src/lib/api/createGame.ts#L152) |
| <a id="solid"></a> `solid?` | `boolean` | Make this cell solid (true) or passable (false). Phase 2. | [api/createGame.ts:144](https://github.com/philbgarner/atomic-core/blob/f8e5a1712339d89f8c0fc24685360b41bb8a8d3b/src/lib/api/createGame.ts#L144) |
| <a id="temperature"></a> `temperature?` | `number` | Temperature value (0–255; 127 = neutral). Phase 4. | [api/createGame.ts:162](https://github.com/philbgarner/atomic-core/blob/f8e5a1712339d89f8c0fc24685360b41bb8a8d3b/src/lib/api/createGame.ts#L162) |
