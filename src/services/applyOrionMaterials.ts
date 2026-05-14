import {
    BufferAttribute,
    Color,
    InterleavedBufferAttribute,
    Material,
    Mesh,
    MeshStandardMaterial,
    Object3D,
    PMREMGenerator,
    Scene,
    SRGBColorSpace,
    Texture,
    WebGLRenderer,
} from "three";
import { textureLoader } from "./textureLoader";

/**
 * The Orion FBX ships geometry-only with UDIM-tiled PBR textures (tile 1001 in
 * U=[0,1], tile 1002 in U=[1,2]). Three.js has no native UDIM support, so we
 * use a pre-baked 2:1 side-by-side atlas and remap UV.x by 0.5 so the original
 * U-range [0,2] folds into [0,1] across the atlas.
 *
 * Atlas built by scripts/build_orion_atlas.py.
 */

const ATLAS_BASE = "/assets/gltf/spacecraft/orion_atlas";

let cachedMaterial: MeshStandardMaterial | undefined;
let cachedEnvMap: Texture | undefined;

function loadAtlasTexture(name: string, srgb: boolean): Texture {
    const texture = textureLoader.load(`${ATLAS_BASE}/${name}`);
    if (srgb) {
        texture.colorSpace = SRGBColorSpace;
    }
    texture.anisotropy = 8;
    return texture;
}

// Synthetic, omnidirectional dim environment so the spacecraft's metal panels
// have something to reflect (PBR metals have no diffuse term and would render
// black otherwise). Directional cues come from the scene's DirectionalLight,
// not the envMap, so reflections look consistent as the spacecraft moves.
function buildOrionEnvMap(renderer: WebGLRenderer): Texture {
    if (cachedEnvMap) return cachedEnvMap;
    const envScene = new Scene();
    envScene.background = new Color(0.04, 0.04, 0.05);
    const pmrem = new PMREMGenerator(renderer);
    cachedEnvMap = pmrem.fromScene(envScene).texture;
    pmrem.dispose();
    return cachedEnvMap;
}

function buildOrionMaterial(renderer: WebGLRenderer): MeshStandardMaterial {
    if (cachedMaterial) return cachedMaterial;
    cachedMaterial = new MeshStandardMaterial({
        map:          loadAtlasTexture("basecolor.jpg", true),
        metalnessMap: loadAtlasTexture("metalness.jpg", false),
        roughnessMap: loadAtlasTexture("roughness.jpg", false),
        normalMap:    loadAtlasTexture("normal.jpg",    false),
        envMap:       buildOrionEnvMap(renderer),
        envMapIntensity: 1.0,
        metalness: 1.0,
        roughness: 1.0,
    });
    return cachedMaterial;
}

function remapUdimUVs(mesh: Mesh): void {
    const uv = mesh.geometry.attributes.uv as BufferAttribute | InterleavedBufferAttribute | undefined;
    if (!uv) return;
    if ((mesh.geometry.userData as Record<string, unknown>)._orionUVRemapped) return;

    for (let i = 0; i < uv.count; i++) {
        uv.setX(i, uv.getX(i) * 0.5);
    }
    uv.needsUpdate = true;
    (mesh.geometry.userData as Record<string, unknown>)._orionUVRemapped = true;
}

function disposeMaterial(material: Material | Material[]): void {
    const list = Array.isArray(material) ? material : [material];
    for (const entry of list) entry.dispose();
}

export function applyOrionMaterials(model: Object3D, renderer: WebGLRenderer): void {
    const orionMaterial = buildOrionMaterial(renderer);
    model.traverse((child) => {
        if (!(child instanceof Mesh)) return;
        remapUdimUVs(child);
        disposeMaterial(child.material);
        child.material = orionMaterial;
    });
}
