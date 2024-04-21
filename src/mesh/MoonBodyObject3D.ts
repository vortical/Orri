import { BodySystem } from "../scene/BodySystem.ts";
import { PlanetaryBodyObject3D } from "./PlanetBodyObject3D.ts";
import { Body } from '../body/Body.ts';

export class MoonBodyObject3D extends PlanetaryBodyObject3D {

    constructor(body: Body, bodySystem: BodySystem) {
        super(body, bodySystem);
    }

    /**
     * Moon labels disappear once a distance threshold is met. 
     */
    updateLabels() {
        this.labels.updateMoonLabels();
    };
}