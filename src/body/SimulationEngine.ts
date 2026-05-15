import { RenderableBody } from "../mesh/RenderableBody";
import { TimeMark } from "../system/Clock";
import { BaseBodyIntegrator, BodySystemUpdater } from "./BodySystemUpdater";
import { BodyVerletIntegrator } from "./BodyVerletIntegrator";
import { BodyYoshidaIntegrator } from "./BodyYoshidaIntegrator"

import { SpacecraftVerletIntegrator } from "./SpacecraftVerletIntegrator";




export class SimulationEngine implements BodySystemUpdater {

  isOneTimeUpdate = false;
  isEnabled = true;
  totalstepMs: number = 0;// += timeStepMs;

  private bodyIntegrator: BaseBodyIntegrator;
  private spacecraftIntegrator: SpacecraftVerletIntegrator;


  constructor() {
  
    this.bodyIntegrator = new BodyVerletIntegrator();
    // this.bodyIntegrator = new BodyYoshidaIntegrator();
    this.spacecraftIntegrator = new SpacecraftVerletIntegrator();
  }


  
  invalidate(){
    this.bodyIntegrator.invalidate();
    this.spacecraftIntegrator.invalidate();
  }


  update(bodyObject3Ds: RenderableBody[], timeMark: TimeMark,  doInvalidate: boolean=false): void {
    const { timestep, iterations } = this.bodyIntegrator.getIntegratorLoopParams(timeMark.deltaMs);
    // console.log(timestep, iterations);
    // timeMark.timeMs is the time after the update.
    const startTimeMs = timeMark.timeMs - timeMark.deltaMs; // Our start time

    if(doInvalidate){
      // we cache accelerations at previous time, some constraints can force us to invalidate them
      // e.g.: adding/removing bodies from our system...
      this.invalidate();
    }

    const activeObject3D = bodyObject3Ds
      .filter(o => !o.body.useTrajectory && o.isActive())

    const bodies = activeObject3D
      .map(o => o.body);

    const celestialBodies = bodies.filter(b => b.type !== 'spacecraft' );
    const spacecrafts = bodies.filter(b => b.type === 'spacecraft');      


    for (let i = 0; i < iterations; i++) {
      const stepTimeMs = startTimeMs + i * timestep;
      const frame = this.bodyIntegrator.computeFrame(celestialBodies, timestep, stepTimeMs);
      this.spacecraftIntegrator.computeFrame(spacecrafts, frame, timestep, stepTimeMs);
      this.totalstepMs += timestep;
      
    }

    bodies.forEach((body) => {
      if(body.isActive()){
        body.sideralRotation = body.rotationAtTime(timeMark.timeMs);
      }
    });

    activeObject3D.forEach(b => b.update());
    
  }

}



