import { BodySystemUpdater } from './BodySystemUpdater.ts';
import { Clock, TimeMark } from "../system/Clock.ts";
import { BodyObject3D } from '../mesh/BodyObject3D.ts';
import { KinematicObject } from '../domain/models.ts';
import { hermiteSample } from './SpacecraftTrajectoryUpdater.ts';



/**
 * This updater is used to reset all positions,velocities, orientations for a time time.
 * This would be used, for example, after a clock time is changed by some external agent.
  */
export class BodiesAtTimeUpdater implements BodySystemUpdater {  
 
  kinematics: KinematicObject[];

  isOneTimeUpdate = true
  isEnabled = true;


  constructor(kinematics: KinematicObject[]){
    this.kinematics = kinematics; 

  }

  /**
   * Update all: positions, velocities, rotations and the clock time!
   */
  update(bodyObject3Ds: BodyObject3D[], timeMark: TimeMark,  doInvalidate: boolean): BodyObject3D[] {
    // this updater is a 'OneTimeUpdate'. It disables itself once it starts to run.
    this.isEnabled = false;

    const bodySystem = bodyObject3Ds[0].bodySystem;
    this.kinematics.forEach(kinematic => {
      const body = bodySystem.getBody(kinematic.name)
      // console.log(body.name);
      body.setKinematics(kinematic);
    });

    return bodyObject3Ds;

  }
}