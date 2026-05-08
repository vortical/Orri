import { BodySystem } from "../scene/BodySystem.ts";
import { RenderablePlanet } from "./RenderablePlanet.ts";
import { Body } from '../body/Body.ts';
import { RenderableBody } from "./RenderableBody.ts";

export class RenderableMoon extends RenderablePlanet {

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

    // planetarySystem(): RenderableBody {
    //     return this.pa;
    // }
 
    // setOrbitOutlineEnabled(value: boolean): void {
    //     this.orbitOutline.enabled = value;
    //     console.log("Moon: setOrbitOutlineEnabled:"+this.getName());
    // }
}