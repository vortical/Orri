import { VectorComponents } from "../domain/models";
import { timeMsToUnits, TimeUnit } from "../system/time";
import { Vector } from "../system/Vector";
import { Body } from "./Body";
import { BaseBodyIntegrator, BodyFrame, IntegratorLoopParam } from "./BodySystemUpdater";


export class BodyVerletIntegrator extends BaseBodyIntegrator {
  private gravityAccelerations?: VectorComponents[];
  
  totalstepMs: number = 0; // use this to ensure we have no time drift with clocks.

  integratorIntegratorLoopParamProvider: (timestepMs:number) => IntegratorLoopParam;

  constructor(loopParamProvider:(timestepMs:number)=>IntegratorLoopParam =  (timestepMs) => defaulIntegratorLoopParamProvider(timestepMs,1000,100)){
    super();
    this.integratorIntegratorLoopParamProvider = loopParamProvider;

  }
  invalidate(): void {
    this.gravityAccelerations = undefined;
  }


  getIntegratorLoopParams(timestepMs: number): IntegratorLoopParam{
    return this.integratorIntegratorLoopParamProvider(timestepMs);

  }
   

  computeFrame(bodies: Body[], timestepMs: number): BodyFrame {
    // ... verlet integration ...
    this.totalstepMs += timestepMs;
    const timeStep = timeMsToUnits(timestepMs, TimeUnit.Seconds);

    const gravityAccelerations_i1 = this.gravityAccelerations ?? this.bodyAccelerations(bodies);

    // Capture i1 positions before mutation
    const positions_i1 = bodies.map(b => b.position);

    // update positions
    bodies.forEach((body, idx) => {
      body.position = body.nextPosition(gravityAccelerations_i1[idx], timeStep);
    });


    const gravityAccelerations_i2 = this.bodyAccelerations(bodies);

    // update velocities
    bodies.forEach((body, idx) => {      
      body.velocity = body.nextSpeed(Vector.average(gravityAccelerations_i1[idx], gravityAccelerations_i2[idx]) , timeStep);
    });    

    this.gravityAccelerations = gravityAccelerations_i2;

    const frame = { bodies, positions_i1};
    
    return frame;
  }


  private bodyAccelerations(bodies: Body[]): VectorComponents[] {
      const accContributions: VectorComponents[][] = [];
      const accs: VectorComponents[] = [];

      for (let i = 0; i < bodies.length; i++) {
        for (let j = 0; j < bodies.length; j++) {
          if (i < j) {
            const aij_ji = Body.twoBodyAccelerations(bodies[i], bodies[j]);
            if (!accContributions[i]) accContributions[i] = [];
            if (!accContributions[j]) accContributions[j] = [];
            accContributions[i][j] = aij_ji.get("ij")!;
            accContributions[j][i] = aij_ji.get("ji")!;
          }
        }
        accs[i] = (accContributions[i] || []).reduce(
          (sum, a) => ({ x: sum.x + a.x, y: sum.y + a.y, z: sum.z + a.z }),
          { x: 0, y: 0, z: 0 }
        );

        // faster?
        // let ax = 0, ay = 0, az = 0;
        // const contributions = accContributions[i] || [];
        // for (let j = 0; j < contributions.length; j++) {
        //   ax += contributions[j].x;
        //   ay += contributions[j].y;
        //   az += contributions[j].z;
        // }
        // accs[i] = { x: ax, y: ay, z: az };

      }
      return accs;

  }



}

// export const defaulIntegratorLoopParamProvider = (timestepMs: number, desiredMaxTimestepMs:number=1000, maxIterations:number=100, ): IntegratorLoopParam => {
//   if (timestepMs == 0) {
//     return { iterations: 0, timestep: 0 };
//   }
//   const desiredIterations = Math.abs(timestepMs / desiredMaxTimestepMs);
//   const desiredStepFactor = Math.ceil(desiredIterations / maxIterations);
//   const iterations = Math.ceil(Math.abs(timestepMs) / (desiredMaxTimestepMs * desiredStepFactor));
//   return { iterations: iterations, timestep: timestepMs / iterations };
// };


export const defaulIntegratorLoopParamProvider = (
  timestepMs: number,
  desiredMaxTimestepMs: number = 1000,
  maxIterations: number = 100,
): IntegratorLoopParam => {
  if (timestepMs === 0) {
    return { iterations: 0, timestep: 0 };
  }

  const absTimestepMs = Math.abs(timestepMs);
  const desiredIterations = absTimestepMs / desiredMaxTimestepMs;
  const desiredStepFactor = Math.ceil(desiredIterations / maxIterations);
  const iterations = Math.ceil(absTimestepMs / (desiredMaxTimestepMs * desiredStepFactor));

  return { iterations, timestep: timestepMs / iterations };
};