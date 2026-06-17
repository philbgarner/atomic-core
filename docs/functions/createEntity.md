[atomic-core](../README.md) / createEntity

# Function: createEntity()

> **createEntity**(`opts`): [`EntityBase`](../type-aliases/EntityBase.md)

Defined in: [entities/factory.ts:57](https://github.com/philbgarner/atomic-core/blob/f8e5a1712339d89f8c0fc24685360b41bb8a8d3b/src/lib/entities/factory.ts#L57)

Create a game entity.

Supply the engine-level fields via `EntityCoreOpts` plus any game-specific
attributes (hp, maxHp, attack, xp, …) as additional keys. All extra keys
are spread onto the returned entity verbatim and accessible via the index
signature on `EntityBase`.

```ts
const orc = createEntity({
  kind: "enemy", faction: "enemy", spriteName: "orc_idle", x: 8, z: 2,
  hp: 15, maxHp: 15, attack: 5, xp: 25,
});
```

## Parameters

| Parameter | Type |
| ------ | ------ |
| `opts` | [`EntityCoreOpts`](../type-aliases/EntityCoreOpts.md) & `Record`\<`string`, `unknown`\> |

## Returns

[`EntityBase`](../type-aliases/EntityBase.md)
