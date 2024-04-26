import { Body } from "../body/Body.ts";
import { BodySystem } from "../scene/BodySystem.ts";
import { BodySurface } from "./BodySurface.ts";
import { ModelBodySurface } from "./ModelBodyObject3D.ts";
import { SphereBodySurface } from "./SphereBodySurface.ts";


export const BodySurfaceBuilder = {
    create(body: Body, bodySystem: BodySystem): BodySurface {

        if (body.textures != undefined) {
            return new SphereBodySurface(body, bodySystem);
        }

        if (body.gltf != undefined) {
            return new ModelBodySurface(body, bodySystem);
        }

        throw Error();
    }
};
