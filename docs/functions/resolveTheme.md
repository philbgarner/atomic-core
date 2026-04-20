[atomic-core](../README.md) / resolveTheme

# Function: resolveTheme()

> **resolveTheme**(`selector`, `ctx`): [`ThemeDef`](../type-aliases/ThemeDef.md)

Defined in: [dungeon/themes.ts:98](https://github.com/philbgarner/atomic-core/blob/7b7463b8325930f15251c0be70e7a1d4211f3108/src/lib/dungeon/themes.ts#L98)

Resolve a ThemeSelector to a theme name for a given room.
Falls back to "dungeon" if the resolved key is not in the registry.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `selector` | [`ThemeSelector`](../type-aliases/ThemeSelector.md) |
| `ctx` | \{ `rng`: () => `number`; `roomId`: `number`; \} |
| `ctx.rng` | () => `number` |
| `ctx.roomId` | `number` |

## Returns

[`ThemeDef`](../type-aliases/ThemeDef.md)
