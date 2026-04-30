[atomic-core](../README.md) / IS\_BLOCKED

# Variable: IS\_BLOCKED

> `const` **IS\_BLOCKED**: `2` = `0x02`

Defined in: [dungeon/colliderFlags.ts:17](https://github.com/philbgarner/atomic-core/blob/1bb7352f63a0c3e8eeda04e7cdd7e1472e67e7bf/src/lib/dungeon/colliderFlags.ts#L17)

No entity may enter this cell by any means — forced or voluntary.
Solid walls carry this flag.  Pits do NOT: they can be entered via forced
movement (e.g. a shove) even though they are not IS_WALKABLE.
