import { BodyObject3D } from "../mesh/BodyObject3D";
import { Clock, TimeMark } from "../system/Clock";
import { BodySystemUpdater } from "./BodySystemUpdater";



/**
 * Just a container of updaters acting as a single updater.
 */
export class CompositeUpdater implements BodySystemUpdater {

    bodySystemUpdaters: BodySystemUpdater[];

    isOneTimeUpdate: boolean = false
    isEnabled: boolean = true;

    constructor(bodySystemUpdaters: BodySystemUpdater[] = []) {
        this.bodySystemUpdaters = Array.from(bodySystemUpdaters);
    }

    update(bodyObjects3D: BodyObject3D[], timeMark: TimeMark, doInvalidate: boolean): BodyObject3D[]{

        this.bodySystemUpdaters.forEach(updater => {
            if (updater.isEnabled) {
                updater.update(bodyObjects3D, timeMark, doInvalidate);
            }
        });

        // discard injected 'OneTimeUpdate' updaters.
        this.bodySystemUpdaters = this.bodySystemUpdaters.filter(updater => !updater.isOneTimeUpdate);
        return bodyObjects3D;

    }

    addUpdater(updater: BodySystemUpdater) {
        this.bodySystemUpdaters.push(updater);
    }

}
