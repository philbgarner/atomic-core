import * as THREE from "three";
/** Six face image URLs for a standard cube-map skybox. */
export type SkyboxFaces = {
    /** +X face (right). */
    px: string;
    /** -X face (left). */
    nx: string;
    /** +Y face (top). */
    py: string;
    /** -Y face (bottom). */
    ny: string;
    /** +Z face (front). */
    pz: string;
    /** -Z face (back). */
    nz: string;
};
export type SkyboxOptions = {
    /**
     * Six face images — either URL strings or a pre-loaded `THREE.CubeTexture`.
     * When URLs are supplied the textures are fetched asynchronously; when a
     * `CubeTexture` is supplied it is used directly (ownership remains with the
     * caller — the renderer will NOT dispose it on `destroy()` or `setSkybox()`).
     */
    faces: SkyboxFaces | THREE.CubeTexture;
    /**
     * Y-axis rotation applied to the skybox in radians. Useful for aligning
     * the "front" face with the dungeon's north direction. Default: `0`.
     * Callers needing full Euler control can access `renderer.scene.background`
     * directly after the skybox is attached.
     */
    rotationY?: number;
};
/**
 * Load a `THREE.CubeTexture` from 6 face image URLs and apply an optional
 * Y-axis rotation. The returned texture is ready to assign to `scene.background`.
 */
export declare function loadSkybox(opts: SkyboxOptions): Promise<THREE.CubeTexture>;
//# sourceMappingURL=skybox.d.ts.map