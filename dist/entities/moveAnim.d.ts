import { EasingFn, EasingName } from '../animations/easing';
export type EntityMoveAnimState = {
    fromX: number;
    fromZ: number;
    toX: number;
    toZ: number;
    /** `performance.now()` timestamp the transition began. */
    startTime: number;
};
export declare function computeEntityMovePosition(anim: EntityMoveAnimState, now: number, durationMs: number, easing: EasingName | EasingFn | undefined): {
    x: number;
    z: number;
};
//# sourceMappingURL=moveAnim.d.ts.map