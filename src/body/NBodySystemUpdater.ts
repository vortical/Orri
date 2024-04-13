import { Body } from '../domain/Body.ts';
import { BodySystemUpdater } from './BodySystemUpdater.ts';
import { zipCombine } from '../system/arrays.ts';
import { Clock, TimeUnit, timeMsToUnits } from '../system/timing.ts';
import { BodyObject3D } from '../mesh/BodyObject3D.ts';
import { VectorComponents } from '../domain/models.ts';
import { max } from 'three/examples/jsm/nodes/Nodes.js';


type UpdaterLoopParam = {
  iterations: number,
  timestep: number
};

type loopParamProvider = (timestepMs: number) => UpdaterLoopParam;


/**
 * Generally, for celestial bodies, a step of about 600 seconds is pretty stable
 * break down the update so that we don't exceed maxStableTimestepMs per update.
 * if this is exceeded, then break down the update into 'iterations' loops.
 *
 * @param timestepMs 
 * @returns 
 */
const defaulUpdaterLoopParamProvider = (timestepMs: number): UpdaterLoopParam => {
  if (timestepMs == 0){
    return {iterations: 0, timestep: 0 }
  }

  const maxStableTimestepMs = 200 * 1000; // make this adjustable.
  const iterations = Math.ceil(Math.abs(timestepMs / maxStableTimestepMs));
  return { timestep: timestepMs / iterations, iterations: iterations};
}

/**
 * Use this for satellites etc... 
 * 
 * It optimizes the resource available (i.e: the number of iterations). So given a desiredTimestep and
 * a maxIterations.  It will attempt to minimize the timestep size once the timestep argument exceeds
 * the desiredTimeStep. 
 * 
 * @param timestepMs 
 */
const desiredLoopParamProviderProvider = (timestepMs: number): UpdaterLoopParam => {
  if (timestepMs == 0){
    return {iterations: 0, timestep: 0 }
  }

  const maxIterations = 100; 
  const desiredTimestepMs = 1 * 1000;
  const desiredIterations = Math.abs(timestepMs / desiredTimestepMs);
  const desiredStepFactor = Math.ceil(desiredIterations/maxIterations);
  const iterations = Math.ceil(Math.abs(timestepMs)/(desiredTimestepMs * desiredStepFactor));
  return {iterations: iterations, timestep: timestepMs/iterations };
}

/**
 * Each body in a system influences all other bodies, regardless of size and distance. 
 * If there are m bodies, there will be m*(m-1) forces taken into account...
 * 
 * Todo: Introduce a few different implementations, each with their own use cases:
 * - using center of mass/barycenters (this would be best)
 * - using parent/child hierachies where a child's acceleration comes only from its parent/grandparents and siblings. This
 *   would be quite pertinent in the case of our solar system (i.e.: this way we'd not introduce earth's contribution to io's orbit anmd view versa)
 */
class NBodySystemUpdater implements BodySystemUpdater {
  isOneTimeUpdate = false;
  isEnabled = true;


  /**
   * TO do, all updates should be put in webworkers. Each layer can be done in parallel in its 
   * own webworker. (we have one layer, so not needed yet)
   * 

   * @param bodyObject3Ds 
   * @param timestepMs 
   * @param clock 
   * @returns 
   */
  update(bodyObject3Ds: Map<string, BodyObject3D>, timestepMs: number, clock: Clock): Map<string, BodyObject3D> {
    const { timestep, iterations} = defaulUpdaterLoopParamProvider(timestepMs);
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
   * 
   * Calculates and updates the positions and velocities of the (n-bodies). Accelerations are
   * based on F = GMiMj/(R*R).
   * Ax for (Mi) = (GMj/R*R*R)* [x/mag(R)]
   * Ay for (Mi) = (GMj/R*R*R)* [y/mag(R)]
   * ...
   * For each body we currently sum up all the acceleration values with all the other bodies. 
   * 
   * For positions:
   * Xi+1 = Xi + Vi*dt + Ai*(dt*dt)/2
   * 
   * Once positions at i+1 are determined, we calculate velocities using the averages of
   * accelerations at i and i+1; which requires another pass at gathering accelerations 
   * based on the positions at i+1.
   *     
   * So for velocities we use:
   * Vi+1 = Vi + (Ai + Ai+1)/2*dt
   * 
   * We do this as acceleration is not constant between i and i+1. We improve precision by at least
   * a few orders of magnitude by using speeds determined from accelerations at 
   * i and i+1.
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

    const accelerations_i1 = nBodyAccelerations(bodies);
    bodies.forEach((body, index) => {
      body.position = body.nextPosition(accelerations_i1[index], time);
    });

    const accelerations_i2 = nBodyAccelerations(bodies);
    const avgAccelerations = zipCombine(accelerations_i1, accelerations_i2, (a, b) => {
      return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 }
    });

    bodies.forEach((body, index) => {
      body.velocity = body.nextSpeed(avgAccelerations[index], time)
    });

    return bodies;
  }
}

export { NBodySystemUpdater };