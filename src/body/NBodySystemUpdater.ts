import { Body } from './Body.ts';
import { Vec3D } from '../system/vecs.ts';
import { BodySystemUpdater } from './BodySystemUpdater.ts';
import { zipCombine } from '../system/arrays.ts';
import { Clock, TimeUnit, timeMsToUnits } from '../system/timing.ts';
import { BodyObject3D } from '../mesh/BodyObject3D.ts';

/**
 * Each body in a system influences all other bodies, regardless of size and distance. 
 * If there are m bodies, there will be m*(m-1) forces taken into account...
 * 
 * Todo: Introduce a few different implementations, each with their own use cases:
 * - using center of mass/barycenters
 * - using parent/child hierachies where a child's acceleration comes only from its parent/grandparents and siblings. This
 *   would be quite pertinent in the case of our solar system (i.e.: this way we'd not introduce earth's contribution to io's orbit anmd view versa)
 */
class NBodySystemUpdater implements BodySystemUpdater {


  update(bodyObject3Ds: BodyObject3D[], timestepMs: number, clock: Clock): BodyObject3D[] {

    // each update can handle a step of about 600 seconds (todo: configure a stability param, we handle 
    // orbital steps of planets at 30 days per second on one pass...)
    // so if a timestep is 6000, then we loop 10 times for each 600.

    const maxStableTimestepMs = 600 * 1000; // make this adjustable.
    const iterations = Math.ceil(timestepMs / maxStableTimestepMs);
    const stableTimeStep = timestepMs / iterations;
    const bodies = bodyObject3Ds.map( o => o.body);

    for (let i = 0; i < iterations; i++) {
      this.updateBodyProperties(bodies, stableTimeStep);
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
    function nBodyAccelerations(bodies: Body[]): Vec3D[] {
      let accelerationContributions: Vec3D[][] = [];
      let bodyAccelerations: Vec3D[] = [];

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