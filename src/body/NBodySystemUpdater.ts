import { Body } from './Body.ts';
import { BodySystemUpdater } from './BodySystemUpdater.ts';
import { zipCombine } from '../system/functions.ts';
import { TimeUnit, timeMsToUnits } from '../system/time.ts';
import { Clock } from "../system/Clock.ts";
import { BodyObject3D } from '../mesh/BodyObject3D.ts';
import { VectorComponents } from '../domain/models.ts';



/**
 * Each body in a system has an effect on all other bodies, regardless of size and distance. 
 * If there are m bodies, there will be m*(m-1) forces taken into account... 
 * 
 * The plan is:
 * Introduce a few different implementations, each with their own use cases:
 * - Leveraging octree
 * - Leveraging webworkers
 *  
 */
export class NBodySystemUpdater implements BodySystemUpdater {
  isOneTimeUpdate = false;
  isEnabled = true;
  accelerations?: VectorComponents[];


  update(bodyObject3Ds: Map<string, BodyObject3D>, timestepMs: number, clock: Clock): Map<string, BodyObject3D> {
    const { timestep, iterations } = defaulUpdaterLoopParamProvider(timestepMs);
    // const { timestep, iterations} = desiredLoopParamProviderProvider(timestepMs);
    const bodies = Array.from(bodyObject3Ds.values()).map(o => o.body);

    for (let i = 0; i < iterations; i++) {
      this.updateBodyProperties(bodies, timestep);
    }

    bodies.forEach((body) => {
      body.sideralRotation = body.rotationAtTime(clock.getTime());
    });

    bodyObject3Ds.forEach(b => b.update());
    return bodyObject3Ds;
  }

  /**
   * updateBodyProperties based on a Leapfrog algorithm (https://en.wikipedia.org/wiki/Leapfrog_integration)
   * 
   * Calculates and updates the positions and velocities of the (n-bodies). Accelerations are
   * based on the usual F = GMiMj/(R*R).
   * 
   * For each body: update positions, velocities and accelerations for time i+1 
   * such that:
   * 
   * Ai = Accelerations(Xi) is the accelereration from previous update. If there is no 
   * previous update: calculate it with existing positions.
   * 
   * For positions:
   * Xi+1 = Xi + Vi*dt + Ai*(dt*dt)/2
   * 
   * Once positions at i+1 are determined, we calculate velocities using the averages of
   * accelerations at i and i+1;  so we calcualte accelerations based on the positions at i+1.
   * 
   * A(i+1) = Accelerations(Xi+1)
   *     
   * So for velocities we use:
   * Vi+1 = Vi + (Ai + Ai+1)/2*dt
   * 
   * 
   *       
   * @param bodies 
   * @param time delta 
   * 
   * @returns side effect: bodies are updated...
   */
  updateBodyProperties(bodies: Body[], timeMs: number): Body[] {
    // our units are seconds in the formulas.
    const time = timeMsToUnits(timeMs, TimeUnit.Seconds);

    /**
     * Calculate accelerations of all bodies given their current
     * position and speed properties.
     * 
     * @param bodies 
     * @returns each body's acceleration vector.
     */
    function nBodyAccelerations(bodies: Body[]): VectorComponents[] {
      let accelerationContributions: VectorComponents[][] = [];
      let bodyAccelerations: VectorComponents[] = [];

      for (let i = 0; i < bodies.length; i++) {
        for (let j = 0; j < bodies.length; j++) {
          if (i < j) {

            // is a 'symetric' matrix, twoBodyAccelerations returns 2 accelerations:
            // [a(i,j) and a(j,i)], so we just skip looping on j,i 

            const aij_ji = Body.twoBodyAccelerations(bodies[i], bodies[j]);
            if (!accelerationContributions[i]) {
              accelerationContributions[i] = [];
            }

            // a(i,j)
            accelerationContributions[i][j] = aij_ji.get("ij")!;
            if (!accelerationContributions[j]) {
              accelerationContributions[j] = [];
            }

            // a(j,i) 
            accelerationContributions[j][i] = aij_ji.get("ji")!;
          }
        }
        // And here we are: A body's total acceleration is the sum of ALL
        // other contributions.
        bodyAccelerations[i] = accelerationContributions[i].reduce((accumulator, current) => {
          return {
            x: (current.x + accumulator.x),
            y: (current.y + accumulator.y),
            z: (current.z + accumulator.z)
          }
        }, { x: 0, y: 0, z: 0 });
      }
      return bodyAccelerations;
    }

    //   Ai = Accelerations(Xi) is the accelereration from previous update. If there is no 
    //   previous update: calculate it with existing positions.
    const accelerations_i1 = this.accelerations || nBodyAccelerations(bodies);

    bodies.forEach((body, index) => {
      body.position = body.nextPosition(accelerations_i1[index], time);
    });

    const accelerations_i2 = nBodyAccelerations(bodies);

    // const avgAccelerations = zipCombine(accelerations_i1, accelerations_i2, (a, b) => {
    //   return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 }
    // });

    bodies.forEach((body, index) => {
      const a = accelerations_i1[index];
      const b = accelerations_i2[index];
      const avgAcceleration = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 };
      body.velocity = body.nextSpeed(avgAcceleration, time)
    });

    // save accelerations for next iteration.
    this.accelerations = accelerations_i2;

    return bodies;
  }
}

type UpdaterLoopParam = {
  iterations: number,
  timestep: number
};

type loopParamProvider = (timestepMs: number) => UpdaterLoopParam;


/**
 * Generally, for celestial bodies, a step of about 600 seconds is pretty 'stable'.
 * So break down the update so that we don't exceed maxStableTimestepMs per update.
 * If this is exceeded, then break down the update into 'iterations' loops.
 *
 * @param timestepMs 
 * @returns 
 */
const defaulUpdaterLoopParamProvider = (timestepMs: number): UpdaterLoopParam => {
  if (timestepMs == 0) {
    return { iterations: 0, timestep: 0 }
  }

  const maxStableTimestepMs = 200 * 1000; // make this adjustable.
  const iterations = Math.ceil(Math.abs(timestepMs / maxStableTimestepMs));
  return { timestep: timestepMs / iterations, iterations: iterations };
}

/**
 * It optimizes the resource available (i.e: the number of iterations). So given a desiredTimestep and
 * a maxIterations.  It will attempt to minimize the timestep size once the timestep argument exceeds
 * the desiredTimeStep.
 * 
 * @param timestepMs 
 */
const desiredLoopParamProviderProvider = (timestepMs: number): UpdaterLoopParam => {
  if (timestepMs == 0) {
    return { iterations: 0, timestep: 0 }
  }

  const maxIterations = 100;
  const desiredTimestepMs = 1 * 1000;
  const desiredIterations = Math.abs(timestepMs / desiredTimestepMs);
  const desiredStepFactor = Math.ceil(desiredIterations / maxIterations);
  const iterations = Math.ceil(Math.abs(timestepMs) / (desiredTimestepMs * desiredStepFactor));
  return { iterations: iterations, timestep: timestepMs / iterations };
}
