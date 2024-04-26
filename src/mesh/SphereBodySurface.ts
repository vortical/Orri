import { Material, Mesh, MeshPhongMaterial, MeshPhongMaterialParameters, Object3D, SphereGeometry, Vector2 } from "three";
import { Body } from '../body/Body.ts';
import { DistanceUnits, convertDistance } from "../system/distance.ts";
import { BodySystem } from "../scene/BodySystem.ts";
import { BodySurface } from "./BodySurface.ts";

import { MaterialProperties } from "../domain/models.ts";
import { textureLoader } from "../services/textureLoader.ts";


export const WIDTH_SEGMENTS = 64;
export const HEIGHT_SEGMENTS = 64;


/**
 * Represents the surface as a Mesh built using the properties and textures from the Body
 */
export class SphereBodySurface extends BodySurface {

    model?: Promise<Object3D>;

    constructor(body: Body, bodySystem: BodySystem) {
        super(body, bodySystem);
    }

    createSurfaceObject3D(body: Body, bodySystem: BodySystem) {
        const radiuskm = convertDistance(body.radius, DistanceUnits.m, DistanceUnits.km);
        const materialProperties = body.textures;
        const geometry = new SphereGeometry(radiuskm, WIDTH_SEGMENTS, HEIGHT_SEGMENTS);
        const material = createBodySurfaceMaterial(materialProperties!);
        const mesh = new Mesh(geometry, material);
        return mesh;
    }

}

function createBodySurfaceMaterial(materialProperties: MaterialProperties): Material {

    const params: MeshPhongMaterialParameters = {};

    if (materialProperties.textureUri) {
        params.map = textureLoader.load(materialProperties.textureUri);
    }

    if (materialProperties.normalUri) {
        params.normalMap = textureLoader.load(materialProperties.normalUri);
        params.normalScale = materialProperties.normalMapScale ? new Vector2(materialProperties.normalMapScale, materialProperties.normalMapScale) : new Vector2(1, 1);
    }

    if (materialProperties.bumpMapUri) {
        params.bumpMap = textureLoader.load(materialProperties.bumpMapUri);
        params.bumpScale = materialProperties.bumpMapScale || 1;
    }

    if (materialProperties.specularMapUri) {
        params.specularMap = textureLoader.load(materialProperties.specularMapUri);
    }

    if (materialProperties.color) {
        params.color = materialProperties.color;
    }

    return new MeshPhongMaterial(params);
}

