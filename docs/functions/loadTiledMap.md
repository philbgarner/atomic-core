[atomic-core](../README.md) / loadTiledMap

# Function: loadTiledMap()

> **loadTiledMap**(`tiledJson`, `options`): `TiledMapOutputs`

Defined in: [dungeon/tiled.ts:150](https://github.com/philbgarner/atomic-core/blob/f1012ab8b30529b38b517f49f682599c72c34307/src/lib/dungeon/tiled.ts#L150)

Convert a parsed Tiled JSON export to `TiledMapOutputs` (a `DungeonOutputs`
superset that also carries the parsed object placements).

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `tiledJson` | `unknown` | Raw object from `JSON.parse` of a Tiled .tmj / .json export. |
| `options` | `TiledMapOptions` | Developer-supplied channel map, GID→value map, and object-type map. |

## Returns

`TiledMapOutputs`
