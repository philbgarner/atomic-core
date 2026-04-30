[atomic-core](../README.md) / ThemeSelector

# Type Alias: ThemeSelector

> **ThemeSelector** = `string` \| `string`[] \| \[`string`, `number`\][] \| ((`ctx`) => `string`)

Defined in: [dungeon/themes.ts:30](https://github.com/philbgarner/atomic-core/blob/1bb7352f63a0c3e8eeda04e7cdd7e1472e67e7bf/src/lib/dungeon/themes.ts#L30)

Theme selector for a dungeon config:
- string: a single theme key from the registry
- string[]: uniform random pick from the list each time a room is themed
- [string, number][]: weighted random pick (pairs of [key, weight])
- callback: called per room, receives the room id and an rng function
