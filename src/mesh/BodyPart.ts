import { BufferGeometry, DoubleSide, Material, Mesh, MeshBasicMaterial, MeshBasicMaterialParameters, MeshLambertMaterial, MeshPhongMaterial, MeshPhongMaterialParameters, NormalBufferAttributes, Object3D, Object3DEventMap, RingGeometry, SphereGeometry, Vector2, Vector3 } from "three";

import { Body } from '../domain/Body.ts';
import { DistanceUnits, convertLength, toRad } from "../system/geometry.ts";
import { MaterialProperties, RingProperties } from "../domain/models.ts";
import { textureLoader } from '../services/textureLoader.ts';
import { Clock } from "../system/timing.ts";
import { AsciiEffect } from "three/examples/jsm/Addons.js";

const WIDTH_SEGMENTS = 64;
const HEIGHT_SEGMENTS = 64;


function createBodySurfaceMaterial(materialProperties: MaterialProperties): Material {

    const params: MeshPhongMaterialParameters = {}

    if (materialProperties.textureUri) {
        params.map = textureLoader.load(materialProperties.textureUri);
    }

    if (materialProperties.normalUri) {
        params.normalMap = textureLoader.load(materialProperties.normalUri);
        params.normalScale = materialProperties.normalMapScale ? new Vector2(materialProperties.normalMapScale, materialProperties.normalMapScale) : new Vector2(1,1);
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



function createAtmosphereMateriel(textureUri: string) {
    return new MeshPhongMaterial({
        map: textureLoader.load(textureUri),
        transparent: true,
        opacity: 0.9
    })
}


/**
 * Map texture UV based on distance from center
 * 
 * @param mesh 
 * @param midpoint 
 * @returns 
 */
function mapRingTextureUV(mesh: Mesh, midpoint: number): Mesh {
    const positions = mesh.geometry.attributes.position;
    let verticePosition = new Vector3();
    const angle = new Vector3(1, 0, 0);

    for (let i = 0; i < positions.count; i++) {
        verticePosition.fromBufferAttribute(positions, i);
        const verticeAngle = verticePosition.angleTo(angle);
        const distanceFromCenter = verticePosition.fromBufferAttribute(positions, i).length();
        mesh.geometry.attributes.uv.setXY(i, Math.abs(distanceFromCenter) < midpoint ? 0 : 1, verticeAngle / Math.PI);
    }
    return mesh;
}
/**
 * 3D object but with an update
 * method and child parts.
 * 
 */
export abstract class CelestialBodyPart {
    readonly childParts: CelestialBodyPart[] = []

    abstract getObject3D(): Object3D;
    abstract updatePart(): void;

    addPart(part: CelestialBodyPart|undefined): CelestialBodyPart {
        if (part != undefined) {
            this.getObject3D().add(part.getObject3D());
            this.childParts.push(part);
        }
        return this;
    }

    update(): void {
        this.updatePart();
        this.childParts.forEach(p => p.update())
    }
}

export class Rings extends CelestialBodyPart {

    readonly mesh: Mesh;

    constructor(ringProperties: RingProperties){
        super();

        const minRadius = convertLength(ringProperties.minRadius, DistanceUnits.m, DistanceUnits.km);
        const maxRadius = convertLength(ringProperties.maxRadius, DistanceUnits.m, DistanceUnits.km);

        const geometry = new RingGeometry(minRadius, maxRadius, 128);

        const colorMap = textureLoader.load(ringProperties.colorMapUri!);
        const alphaMap = textureLoader.load(ringProperties.alphaMapUri!);
        const material = new MeshLambertMaterial({
            map: colorMap,
            alphaMap: alphaMap,
            transparent: true,
            opacity: ringProperties.opacity,
            side: DoubleSide,
            wireframe: false
        });

        const mesh = new Mesh(geometry, material);
        this.mesh = mapRingTextureUV(mesh, (minRadius + maxRadius) / 2);
        // rotate rings to be on equatorial plane.
        this.mesh.rotation.set(-Math.PI / 2, 0, 0);

    }

    static create(body: Body): Rings|undefined {
        if(body.rings == undefined) return undefined;
        return new Rings(body.rings);
    }

    updatePart(): void {
    }    


    getObject3D(): Object3D {
        return this.mesh;
    }
}

export class Atmosphere extends CelestialBodyPart{
    

    readonly mesh: Mesh;
    readonly clock: Clock;

    constructor(body: Body, clock: Clock){
        super();
        this.clock = clock;
        const radiuskm = convertLength(body.radius, DistanceUnits.m, DistanceUnits.km);
        const materialProperties = body.textures; 
        
        
        const altitude = 15; 
        const mesh = new Mesh(
            new SphereGeometry(radiuskm  + altitude, WIDTH_SEGMENTS, HEIGHT_SEGMENTS),
            createAtmosphereMateriel(materialProperties.atmosphereUri!)
        );

        mesh.userData = { type: "atmosphere" };
        mesh.receiveShadow = body.receiveShadow;
        this.mesh = mesh;
    }

    static create(body: Body, clock: Clock ): Atmosphere | undefined {
        if (body.textures.atmosphereUri == undefined) return undefined;
        return new Atmosphere(body, clock);
    }

    getObject3D(): Mesh {
        return this.mesh;
    }

    /**
     * Rotate the clouds relative to clock scale.
     */
    updatePart(): void {
        this.mesh.rotateY(toRad(this.clock.scale * 0.00005));        
    }
}


export class BodySurface extends CelestialBodyPart{

    readonly mesh: Mesh;
    readonly body: Body;

    constructor(body: Body){ 
        super();
        const radiuskm = convertLength(body.radius, DistanceUnits.m, DistanceUnits.km);
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



export class StarSurface extends CelestialBodyPart{

    readonly mesh: Mesh;
    readonly body: Body;

    constructor(body: Body){ 
        super();
        const radiuskm = convertLength(body.radius, DistanceUnits.m, DistanceUnits.km);
        const materialProperties = body.textures; 
        const geometry = new SphereGeometry(radiuskm, WIDTH_SEGMENTS, HEIGHT_SEGMENTS);
        const material = createStarSurfaceMaterial(materialProperties);
        const mesh = new Mesh(geometry, material);
        mesh.name = body.name;
        mesh.userData = { type: "star" };
        
        
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