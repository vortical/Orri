import { TimeMark } from "../system/Clock.ts";
import { BodyObject3D } from '../mesh/BodyObject3D.ts';
import { VectorComponents } from "../domain/models.ts";




interface BodyFrame {
  bodies: Body[];
  gravityAccelerations_i1: VectorComponents[];
  gravityAccelerations_i2: VectorComponents[];
}


/**
 * Updaters are invoked within the animation loop. The role of a BodySystemUpdater
 * is to set the properties of each body based on the time.  
 */
export interface BodySystemUpdater {
    update(bodies: BodyObject3D[], timeMark: TimeMark, doInvalidate: boolean): BodyObject3D[];
    isOneTimeUpdate: boolean;
    isEnabled: boolean;
}
