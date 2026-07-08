export type EasingFn = (t: number) => number;
export declare const linear: EasingFn;
export declare const easeInQuad: EasingFn;
export declare const easeOutQuad: EasingFn;
export declare const easeInOutQuad: EasingFn;
export declare const easeInCubic: EasingFn;
export declare const easeOutCubic: EasingFn;
export declare const easeInOutCubic: EasingFn;
export declare const EASINGS: {
    linear: EasingFn;
    easeInQuad: EasingFn;
    easeOutQuad: EasingFn;
    easeInOutQuad: EasingFn;
    easeInCubic: EasingFn;
    easeOutCubic: EasingFn;
    easeInOutCubic: EasingFn;
};
export type EasingName = keyof typeof EASINGS;
/** Resolve a named easing or pass a custom function through unchanged. */
export declare function resolveEasing(easing: EasingName | EasingFn | undefined): EasingFn;
//# sourceMappingURL=easing.d.ts.map