import { BodySystem } from "../scene/BodySystem";
import { Body } from "../body/Body";
import { Box3, Group, Object3D, Sphere } from "three";
import { Model3DLoader } from "../services/Model3DLoader";
import { BodySurface } from "./BodySurface";
import { DistanceUnits, convertDistance } from "../system/distance";

/**
 * Represents the surface as a Object3D built from a glb/glsf model.
 */
export class ModelBodySurface extends BodySurface {

    constructor(body: Body, bodySystem: BodySystem) {
        super(body, bodySystem);
    }

    createSurfaceObject3D(body: Body, bodySystem: BodySystem): Object3D {
        const object3D = new Group();
        const uri = body.gltf?.uri!;
        new Model3DLoader(bodySystem).load(uri).then(m => {
            const naturalRadius = new Box3().setFromObject(m).getBoundingSphere(new Sphere()).radius;
            const targetRadiusKm = convertDistance(body.radius, DistanceUnits.m, DistanceUnits.km);
            const scale = naturalRadius > 0 ? targetRadiusKm / naturalRadius : 1;
            m.scale.set(scale, scale, scale);
            object3D.add(m);
        });
        return object3D;
    }
}
