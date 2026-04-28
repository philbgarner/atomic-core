[atomic-core](../README.md) / resolveTheme

# Function: resolveTheme()

> **resolveTheme**(`selector`, `ctx`): [`ThemeDef`](../type-aliases/ThemeDef.md)

Defined in: [dungeon/themes.ts:98](https://github.com/philbgarner/atomic-core/blob/498d6b46e9389c84d1eb5047eb7861b469b0e47a/src/lib/dungeon/themes.ts#L98)

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
