import { BodyObject3D } from "../mesh/BodyObject3D";
import { Clock } from "../system/timing";
import { BodySystemUpdater } from "./BodySystemUpdater";



/**
 * Just a container of updaters acting as a single updater.
 */
export class CompositeUpdater implements BodySystemUpdater {

    bodySystemUpdaters: BodySystemUpdater[];

    isOneTimeUpdate: boolean = false
    isEnabled: boolean = true;

    constructor(bodySystemUpdaters: BodySystemUpdater[] = []){
        this.bodySystemUpdaters = Array.from(bodySystemUpdaters);
    }

    update(bodyObjects3D: Map<string, BodyObject3D>, timeStepmS: number, clock: Clock): Map<string, BodyObject3D> {
        
        this.bodySystemUpdaters.forEach(updater => {
            if (updater.isEnabled) {
                updater.update(bodyObjects3D, timeStepmS, clock);
            }
        });

        this.bodySystemUpdaters = this.bodySystemUpdaters.filter(updater => !updater.isOneTimeUpdate);
        return bodyObjects3D;
    
    }

    addUpdater(updater: BodySystemUpdater){
        this.bodySystemUpdaters.push(updater);
    }

}
