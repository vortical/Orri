import { Clock } from "../system/Clock.ts";
import { BodyObject3D } from '../mesh/BodyObject3D.ts';


/**
 * Updaters are invoked within the animation loop. The role of a BodySystemUpdater
 * is to set the properties of each body based on the time.  
 */
export interface BodySystemUpdater {
    update(bodies: Map<string, BodyObject3D>, timeStepmS: number, clock: Clock): Map<string, BodyObject3D>
    isOneTimeUpdate: boolean;
    isEnabled: boolean;
}
