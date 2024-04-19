import { Mesh, MeshPhongMaterial, SphereGeometry } from "three";
import { CelestialBodyPart } from "./CelestialBodyPart";
import { Clock } from "../system/Clock.ts";
import { Body } from '../domain/Body.ts';
import { textureLoader } from "../services/textureLoader.ts";
import { DistanceUnits, convertDistance } from "../system/distance.ts";
import { toRad } from "../system/geometry.ts";

const WIDTH_SEGMENTS = 64;
const HEIGHT_SEGMENTS = 64;

export class Atmosphere extends CelestialBodyPart {

    readonly mesh: Mesh;
    readonly clock: Clock;

    constructor(body: Body, clock: Clock, altitude: number = 15) {
        super();
        this.clock = clock;
        const radiuskm = convertDistance(body.radius, DistanceUnits.m, DistanceUnits.km);
        const materialProperties = body.textures;

        const mesh = new Mesh(
            new SphereGeometry(radiuskm + altitude, WIDTH_SEGMENTS, HEIGHT_SEGMENTS),
            createAtmosphereMateriel(materialProperties.atmosphereUri!)
        );

        mesh.userData = { type: "atmosphere" };
        mesh.receiveShadow = body.receiveShadow;
        this.mesh = mesh;
    }

    static create(body: Body, clock: Clock): Atmosphere | undefined {
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


function createAtmosphereMateriel(textureUri: string) {
    return new MeshPhongMaterial({
        map: textureLoader.load(textureUri),
        transparent: true,
        opacity: 0.9
    })
}
