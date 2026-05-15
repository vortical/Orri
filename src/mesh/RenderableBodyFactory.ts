import { Body } from "../body/Body.ts";
import { RenderableBody } from "./RenderableBody.ts";
import { RenderableStar } from "./RenderableStar.ts";
import { RenderablePlanet } from "./RenderablePlanet.ts";
import { RenderableSpacecraft} from "./RenderableSpacecraft.ts"
import { RenderableMoon } from "./RenderableMoon.ts";
import { BodySystem } from "../scene/BodySystem.ts";
// import { ModelBodyObject3D } from "./ModelBodyObject3D.ts";

export const RenderableBodyFactory = {
    create: (body: Body, bodySystem: BodySystem): RenderableBody => {
        switch (body.type) {
            // case "model":
            //     return new ModelBodyObject3D(body, bodySystem);
            case "star":
                return new RenderableStar(body, bodySystem);
            case "planet":
                return new RenderablePlanet(body, bodySystem);
            case "moon":
                return new RenderableMoon(body, bodySystem);
            case "spacecraft":
              return new RenderableSpacecraft(body, bodySystem);
            default:
                throw new Error("Invalid body type: " + body.type);
        }
    }
}


