[atomic-core](../README.md) / MissionCompleteCallback

# Type Alias: MissionCompleteCallback

> **MissionCompleteCallback** = (`mission`) => `void`

Defined in: [missions/types.ts:70](https://github.com/philbgarner/atomic-core/blob/22b32c79f9172ace1f5895d025ae991a6d07ad0a/src/lib/missions/types.ts#L70)

Optional callback invoked immediately after the mission transitions to
'complete'. Use this to run bookkeeping, manipulate game state, update the
UI, log messages, or anything else that should happen exactly once when the
condition is met.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `mission` | [`Mission`](Mission.md) |

## Returns

`void`
