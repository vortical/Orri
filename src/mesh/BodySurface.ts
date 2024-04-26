import { Object3D } from "three";
import { CelestialBodyPart } from "./CelestialBodyPart";
import { Body } from '../body/Body.ts';
import { BodySystem } from "../scene/BodySystem.ts";


export abstract class BodySurface extends CelestialBodyPart {

    
    readonly object3D: Object3D;
    readonly body: Body;

    constructor(body: Body,  bodySystem: BodySystem) {
        super();
        const object3D = this.createSurfaceObject3D(body, bodySystem);
        object3D.name = body.name;
        object3D.userData = { type: "surface" };
        object3D.receiveShadow = body.receiveShadow;
        object3D.castShadow = body.castShadow;
        this.object3D = object3D;
        this.body = body;
    }

    getObject3D(): Object3D {
        return this.object3D;
    }

    /**
     * Calculate sideral rotation
     */
    updatePart(): void {
        this.getObject3D().rotation.set(this.body.sideralRotation.x, this.body.sideralRotation.y, this.body.sideralRotation.z);
    }

    abstract createSurfaceObject3D(body: Body,  bodySystem: BodySystem): Object3D;    
}
