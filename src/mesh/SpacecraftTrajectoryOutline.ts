import { BodyObject3D } from "./BodyObject3D";
import { Vector } from "../system/Vector";
import { Body } from '../body/Body.ts';
import { BodySystem } from "../scene/BodySystem.ts";
import { BodyProperties, MissionWindow } from "../domain/models.ts";
import { ExecutorPool } from "../system/ExecutorPool.ts";
import { TrajectoryOutline } from "./TrajectoryOutline";
import { SpacecraftBodyObject3D } from "./SpaceCraftBodyObject3D.ts";
import { Vector3 } from "three";

const MAX_VERTICES = 360 * 50 * 4;


export class SpacecraftTrajectoryOutline extends TrajectoryOutline {
   missionWindow: MissionWindow;   

   

    constructor(spacecraft: SpacecraftBodyObject3D, maxVertices = MAX_VERTICES, enabled = false, colorHue = 0.5, thrustColorHue = 0.7, opacity = 0.7) {
        super(spacecraft, maxVertices, enabled, colorHue, opacity);
        this.missionWindow = spacecraft.body.missionWindow!;
        
    }

    
    createTrajectory() {
        if (this.bodyObject == undefined) {
            return;
        }
        this.reset();


        console.log("Create Spacecraft Trajectory:" + this.bodyObject.getName());

        const bodySystem = this.bodyObject.bodySystem;


        // get the start and end date of the mission


        // get positions up to the the timeMs

        const timeMs = this.bodyObject.bodySystem.clock.getTime();

        
        const trajectory = this.missionWindow.trajectory;
        if(trajectory !== undefined){
          // once this is reached (it won't be reached), the lines stops growing.
          this.nbVertices = trajectory?.length;
          let index = 0;
          while(index < trajectory.length && trajectory[index].timeMs <= timeMs) {
            // positions are in km
            const point = trajectory[index].position;
            this.addPosition(new Vector(point[0], point[1], point[2]), false);
            index++;

          }

          this.needsUpdate();
        }
    }



  
}


