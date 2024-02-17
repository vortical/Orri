import { Body } from "../body/Body.ts";
import { BodyObject3D } from "./BodyObject3D";
import { StarBodyObject3D } from "./StarBodyObject3D";
import { PlanetaryBodyObject3D } from "./PlanetBodyObject3D";

export  const BodyObject3DFactory  = {
    create: (body: Body): BodyObject3D => {
        switch(body.type){
            case "star":
                return new StarBodyObject3D(body);
            case "planet":
                return new PlanetaryBodyObject3D(body);
            default:
                throw new Error("Invalid body type: "+body.type);
        }
    }
}
