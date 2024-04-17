import { Material, Mesh, MeshBasicMaterial, MeshBasicMaterialParameters, SphereGeometry } from 'three';
import { Body } from '../domain/Body.ts';
import { CelestialBodyPart } from './CelestialBodyPart.ts';

import { MaterialProperties } from '../domain/models.ts';
import { textureLoader } from '../services/textureLoader.ts';
import { DistanceUnits, convertDistance } from '../system/distance.ts';

const WIDTH_SEGMENTS = 64;
const HEIGHT_SEGMENTS = 64;

export class StarSurface extends CelestialBodyPart{

    readonly mesh: Mesh;
    readonly body: Body;

    constructor(body: Body){ 
        super();
        const radiuskm = convertDistance(body.radius, DistanceUnits.m, DistanceUnits.km);
        const materialProperties = body.textures; 
        const geometry = new SphereGeometry(radiuskm, WIDTH_SEGMENTS, HEIGHT_SEGMENTS);
        const material = createStarSurfaceMaterial(materialProperties);
        const mesh = new Mesh(geometry, material);
        mesh.name = body.name;
        mesh.userData = { type: "star" };
        this.mesh = mesh;
        this.body = body;
    }
    
    static create(body: Body): StarSurface {
        return new StarSurface(body);
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


function createStarSurfaceMaterial(materialProperties: MaterialProperties): Material {

    const params: MeshBasicMaterialParameters = {}

    if (materialProperties.textureUri) {
        params.map = textureLoader.load(materialProperties.textureUri);
    }

    if (materialProperties.alphaUri) {
        params.alphaMap = textureLoader.load(materialProperties.alphaUri);
    }

    return new MeshBasicMaterial(params);        
}