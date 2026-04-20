[atomic-core](../README.md) / IS\_BLOCKED

# Variable: IS\_BLOCKED

> `const` **IS\_BLOCKED**: `2` = `0x02`

Defined in: [dungeon/colliderFlags.ts:17](https://github.com/philbgarner/atomic-core/blob/7b7463b8325930f15251c0be70e7a1d4211f3108/src/lib/dungeon/colliderFlags.ts#L17)

No entity may enter this cell by any means — forced or voluntary.
Solid walls carry this flag.  Pits do NOT: they can be entered via forced
movement (e.g. a shove) even though they are not IS_WALKABLE.
