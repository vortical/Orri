import { BodySystem } from "../scene/BodySystem.ts";
import { PlanetaryBodyObject3D } from "./PlanetBodyObject3D.ts";
import { Body } from '../body/Body.ts';
import { BodyObject3D } from "./BodyObject3D.ts";

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

    update(): void {
        super.update();
    //    console.log("Moon update")
    }

    // planetarySystem(): BodyObject3D {
    //     return this.pa;
    // }
 
    // setOrbitOutlineEnabled(value: boolean): void {
    //     this.orbitOutline.enabled = value;
    //     console.log("Moon: setOrbitOutlineEnabled:"+this.getName());
    // }
}