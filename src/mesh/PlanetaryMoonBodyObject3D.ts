import { BodySystem } from "../scene/BodySystem";
import { PlanetaryBodyObject3D } from "./PlanetBodyObject3D";
import { Body } from '../domain/Body.ts';

export class PlanetaryMoonBodyObject3D extends PlanetaryBodyObject3D {

    constructor(body: Body, bodySystem: BodySystem){
        super(body, bodySystem);
    }

    /**
     * Moon labels disappear once a distance threshold is met. 
     */
    updateLabels(){
        this.labels.updateMoonLabels();
    };
}