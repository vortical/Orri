import { Body } from '../body/Body.ts';
import { Mesh, Object3D, Quaternion, Vector3 } from "three";
import { BodyObject3D } from './BodyObject3D.ts';
import { BodySystem } from '../scene/BodySystem.ts';
import { BodySurface } from './BodySurface.ts';
import { BodySurfaceBuilder } from './BodySurfaceBuilder.ts';

export class SpacecraftBodyObject3D extends BodyObject3D {
    readonly surface: BodySurface;

    constructor(body: Body, bodySystem: BodySystem) {
        super(body, bodySystem);

        const surface = BodySurfaceBuilder.create(body, bodySystem);
        this.surface = surface;
        this.addPart(surface);
        const axis = body.getAxisDirection();
        this.getObject3D().applyQuaternion(new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), new Vector3(axis.x, axis.y, axis.z)));
    }

    isTarget(): boolean {
        return this.bodySystem.getTarget() == this;
    }


    getSurface(): Object3D {
        return this.surface.getObject3D();
    }

    setOrbitOutlineEnabled(value: boolean): void {
        console.log("Starcraft: setOrbitOutlineEnabled:"+this.getName());
    }   
}