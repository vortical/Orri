import { BodySystem, CameraLayer } from "../scene/BodySystem";
import { PlanetaryBodyObject3D } from "./PlanetBodyObject3D";
import { Body } from '../domain/Body.ts';


export class PlanetaryMoonBodyObject3D extends PlanetaryBodyObject3D {

    constructor(body: Body, bodySystem: BodySystem){
        super(body, bodySystem);
    }

    updateLabels(){
        this.labels.updateMoonLabels();
    };

}