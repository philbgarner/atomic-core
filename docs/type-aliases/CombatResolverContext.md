[atomic-core](../README.md) / CombatResolverContext

# Type Alias: CombatResolverContext

> **CombatResolverContext** = `object`

Defined in: [combat/combat.ts:26](https://github.com/philbgarner/atomic-core/blob/a6de11b1799150a5470ffc41a28474d2e2819c48/src/lib/combat/combat.ts#L26)

Context passed to every CombatResolver invocation.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="emit"></a> `emit` | [`EventEmitter`](../interfaces/EventEmitter.md) | Event emitter for 'damage', 'miss', 'death', 'audio', etc. | [combat/combat.ts:28](https://github.com/philbgarner/atomic-core/blob/a6de11b1799150a5470ffc41a28474d2e2819c48/src/lib/combat/combat.ts#L28) |
| <a id="factions"></a> `factions` | [`FactionRegistry`](FactionRegistry.md) | Faction registry for hostility checks. | [combat/combat.ts:30](https://github.com/philbgarner/atomic-core/blob/a6de11b1799150a5470ffc41a28474d2e2819c48/src/lib/combat/combat.ts#L30) |
