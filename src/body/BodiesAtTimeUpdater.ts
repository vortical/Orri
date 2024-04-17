import { BodySystemUpdater } from './BodySystemUpdater.ts';
import { Clock } from "../system/Clock.ts";
import { BodyObject3D } from '../mesh/BodyObject3D.ts';
import { KinematicObject } from '../domain/models.ts';



/**
 * 
 * This updater is used to reset all positions,velocities, orientations for a time time.
 * This would be used, for example, after a clock time is changed by some external agent.
 * 
 * 
 */
class BodiesAtTimeUpdater implements BodySystemUpdater {  
  // * We eventually should be able to swap body arrays in a simpler way.
  // * This has too many side effects with some shared state.
 
  kinematics: KinematicObject[];
  datetime: Date;
  isOneTimeUpdate = true
  isEnabled = true;

  constructor(kinematics: KinematicObject[], datetime: Date){
    this.kinematics = kinematics; 
    this.datetime = datetime;
  }


  /**
   * Update all positions, velocities, rotations and the clock time.
   */
  update(bodyObject3Ds: Map<string, BodyObject3D>, timestepMs: number, clock: Clock): Map<string, BodyObject3D> {
    // this updater runs once, so might as well disable ourselves after being invoked
    this.isEnabled = false;
    this.kinematics.forEach(kinematic => {
      const bodyObject3d = bodyObject3Ds.get(kinematic.name)
      bodyObject3d?.body.setKinematics(kinematic);
    });

    clock.setTime(this.datetime.getTime());
    return bodyObject3Ds;

  }
}

export { BodiesAtTimeUpdater };