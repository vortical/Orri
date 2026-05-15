import { RenderableBody } from "../mesh/RenderableBody";
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

    update(renderableBodies: RenderableBody[], timeMark: TimeMark, doInvalidate: boolean): void{

        this.bodySystemUpdaters.forEach(updater => {
            if (updater.isEnabled) {
                updater.update(renderableBodies, timeMark, doInvalidate);
            }
        });

        // discard injected 'OneTimeUpdate' updaters.
        this.bodySystemUpdaters = this.bodySystemUpdaters.filter(updater => !updater.isOneTimeUpdate);
        

    }

    addUpdater(updater: BodySystemUpdater) {
        this.bodySystemUpdaters.push(updater);
    }

}
