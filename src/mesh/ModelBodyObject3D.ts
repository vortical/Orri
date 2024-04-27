import { BodySystem } from "../scene/BodySystem";
import { Body } from "../body/Body";
import { Box3, Group, Object3D, Sphere, Spherical, Vector3 } from "three";
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
            const scale = body.gltf?.baseScale || 1;
            m.scale.set(scale, scale, scale);
            const box = new Box3().setFromObject( m ); 
            // body.radius based on model's bounding sphere; not an actual radius.
            body.radius = convertDistance(box.getBoundingSphere(new Sphere()).radius, DistanceUnits.km, DistanceUnits.m);
            object3D.add(m)
        });
        return object3D;
    }
}
