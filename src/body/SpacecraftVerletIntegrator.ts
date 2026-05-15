import { VectorComponents } from "../domain/models";
import { timeMsToUnits, TimeUnit } from "../system/time";
import { BodyFrame } from "./BodySystemUpdater";
import { Body } from "./Body";
import { Vector } from "../system/Vector";

export class SpacecraftVerletIntegrator {
  private gravityAccelerations?: VectorComponents[];

  invalidate(): void {
    this.gravityAccelerations = undefined;
  }

  computeFrame(spacecrafts: Body[], frame: BodyFrame, timestepMs: number, stepTimeMs: number): void {
    const timeStep = timeMsToUnits(timestepMs, TimeUnit.Seconds);
    const burnAccelerations = spacecrafts.map(sc => sc.getActiveBurnAcceleration(stepTimeMs));

    // i1 gravity - bodies at i1 positions
    const gravityAccelerations_i1 = this.gravityAccelerations ?? spacecrafts.map(sc => spacecraftGravity(sc, frame.bodies, frame.positions_i1));

    // Update positions using i1
    spacecrafts.forEach((sc, idx) => {
      sc.position = sc.nextPosition(addBurn(gravityAccelerations_i1[idx], burnAccelerations[idx]), timeStep);
    });

    // i2 gravity - body.position is already i2
    const gravityAccelerations_i2 = spacecrafts.map(sc =>
      spacecraftGravity(sc, frame.bodies)
    );
      
    // Update velocities using avg(i1, i2)
    spacecrafts.forEach((sc, idx) => {
      const avgGrav = Vector.average(gravityAccelerations_i1[idx], gravityAccelerations_i2[idx]);
      sc.velocity = sc.nextSpeed(addBurn(avgGrav, burnAccelerations[idx]), timeStep);
  });

    // i2 becomes next step's i1
    this.gravityAccelerations = gravityAccelerations_i2;
  }

}


 function spacecraftGravity(spacecraft: Body, bodies: Body[], positions: VectorComponents[] | undefined = undefined): VectorComponents {
    let ax = 0, ay = 0, az = 0;
    for (let i = 0; i < bodies.length; i++) {
      // overide body with passed in positions if not undefined
      const f = positions != undefined ? Body.twoBodyForce(spacecraft, {mass: bodies[i].mass, position: positions[i]}): Body.twoBodyForce(spacecraft, bodies[i]);
      ax += f.x;
      ay += f.y;
      az += f.z;
    }
    return { x: ax / spacecraft.mass, y: ay / spacecraft.mass, z: az / spacecraft.mass };
  }


function addBurn(gravAcc: VectorComponents, burnAcc: VectorComponents | undefined): VectorComponents {
  if (!burnAcc) return gravAcc;
  return { x: gravAcc.x + burnAcc.x, y: gravAcc.y + burnAcc.y, z: gravAcc.z + burnAcc.z };
}