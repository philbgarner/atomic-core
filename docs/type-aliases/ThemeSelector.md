[atomic-core](../README.md) / ThemeSelector

# Type Alias: ThemeSelector

> **ThemeSelector** = `string` \| `string`[] \| \[`string`, `number`\][] \| ((`ctx`) => `string`)

Defined in: [dungeon/themes.ts:30](https://github.com/philbgarner/atomic-core/blob/f8e5a1712339d89f8c0fc24685360b41bb8a8d3b/src/lib/dungeon/themes.ts#L30)

Theme selector for a dungeon config:
- string: a single theme key from the registry
- string[]: uniform random pick from the list each time a room is themed
- [string, number][]: weighted random pick (pairs of [key, weight])
- callback: called per room, receives the room id and an rng function
