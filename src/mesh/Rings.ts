import { DoubleSide, Mesh, MeshLambertMaterial, Object3D, RingGeometry, Vector3 } from "three";
import { DistanceUnits, convertLength } from "../system/geometry.ts";
import { CelestialBodyPart } from "./CelestialBodyPart.ts";
import { RingProperties } from "../domain/models.ts";
import { textureLoader } from "../services/textureLoader.ts";
import { Body } from '../domain/Body.ts';

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

