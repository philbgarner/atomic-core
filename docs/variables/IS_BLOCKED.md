[atomic-core](../README.md) / IS\_BLOCKED

# Variable: IS\_BLOCKED

> `const` **IS\_BLOCKED**: `2` = `0x02`

Defined in: [dungeon/colliderFlags.ts:17](https://github.com/philbgarner/atomic-core/blob/dc624b092583294a2eaec014536f09464d781db3/src/lib/dungeon/colliderFlags.ts#L17)

No entity may enter this cell by any means — forced or voluntary.
Solid walls carry this flag.  Pits do NOT: they can be entered via forced
movement (e.g. a shove) even though they are not IS_WALKABLE.
