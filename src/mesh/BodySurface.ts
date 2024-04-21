import { Material, Mesh, MeshPhongMaterial, MeshPhongMaterialParameters, SphereGeometry, Vector2 } from "three";
import { CelestialBodyPart } from "./CelestialBodyPart";
import { Body } from '../body/Body.ts';
import { MaterialProperties } from "../domain/models.ts";
import { textureLoader } from "../services/textureLoader.ts";
import { DistanceUnits, convertDistance } from "../system/distance.ts";


const WIDTH_SEGMENTS = 64;
const HEIGHT_SEGMENTS = 64;


export class BodySurface extends CelestialBodyPart {

    readonly mesh: Mesh;
    readonly body: Body;

    constructor(body: Body) {
        super();
        const radiuskm = convertDistance(body.radius, DistanceUnits.m, DistanceUnits.km);
        const materialProperties = body.textures;
        const geometry = new SphereGeometry(radiuskm, WIDTH_SEGMENTS, HEIGHT_SEGMENTS);
        const material = createBodySurfaceMaterial(materialProperties);
        const mesh = new Mesh(geometry, material);
        mesh.name = body.name;
        mesh.userData = { type: "surface" };
        mesh.receiveShadow = body.receiveShadow;
        mesh.castShadow = body.castShadow;
        this.mesh = mesh;
        this.body = body;
    }

    static create(body: Body): BodySurface {
        return new BodySurface(body);
    }

    getMesh(): Mesh {
        return this.mesh;
    }

    getObject3D(): Mesh {
        return this.getMesh();
    }

    updatePart(): void {
        this.getObject3D().rotation.set(this.body.sideralRotation.x, this.body.sideralRotation.y, this.body.sideralRotation.z);
    }
}

function createBodySurfaceMaterial(materialProperties: MaterialProperties): Material {

    const params: MeshPhongMaterialParameters = {}

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

