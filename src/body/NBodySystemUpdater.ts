import { Body } from './Body.ts';
import { BodySystemUpdater } from './BodySystemUpdater.ts';
import { TimeUnit, timeMsToUnits } from '../system/time.ts';
import { Clock } from "../system/Clock.ts";
import { BodyObject3D } from '../mesh/BodyObject3D.ts';
import { VectorComponents } from '../domain/models.ts';
import { BODY_ACTIVE_TOPIC } from '../system/event-types.ts';



export class NBodySystemUpdater implements BodySystemUpdater {
  isOneTimeUpdate = false;
  isEnabled = true;
  gravAccelerations?: VectorComponents[];


  manageActivityStatus(bodies: BodyObject3D[], timeMs: number){
    for(const b of bodies){
      const isActiveAtTime = b.isActiveAt(timeMs);
      if(b.isActive() != isActiveAtTime){
        b.setIsActive(isActiveAtTime);
        PubSub.publish(BODY_ACTIVE_TOPIC, {body: b, isActive: isActiveAtTime});
      }
    }
  }

  update(bodyObject3Ds: Map<string, BodyObject3D>, timestepMs: number, clock: Clock): Map<string, BodyObject3D> {
    const { timestep, iterations } = defaulUpdaterLoopParamProvider(timestepMs);
    const timeMs = clock.getTime();
    const allBodies = Array.from(bodyObject3Ds.values());

    this.manageActivityStatus(allBodies, timeMs);

    const activeBodies = allBodies.map(o => o.body).filter(b => b.isActive());

    for (let i = 0; i < iterations; i++) {
      this.updateBodyProperties(activeBodies, timestep, timeMs + i * timestep);
    }

    activeBodies.forEach((body) => {
      body.sideralRotation = body.rotationAtTime(timeMs);
    });

    bodyObject3Ds.forEach(b => b.isActive() && b.update());
    return bodyObject3Ds;
  }

  updateBodyProperties(bodies: Body[], timeStepMs: number, timeMs: number): Body[] {
    const timeStep = timeMsToUnits(timeStepMs, TimeUnit.Seconds);

    const massiveBodies = bodies.filter(b => b.type !== 'spacecraft');
    const spacecraft = bodies.filter(b => b.type === 'spacecraft');

    function massiveBodyAccelerations(): VectorComponents[] {
      const accContributions: VectorComponents[][] = [];
      const accs: VectorComponents[] = [];

      for (let i = 0; i < massiveBodies.length; i++) {
        for (let j = 0; j < massiveBodies.length; j++) {
          if (i < j) {
            const aij_ji = Body.twoBodyAccelerations(massiveBodies[i], massiveBodies[j]);
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
      }
      return accs;
    }

    function spacecraftGravity(sc: Body): VectorComponents {
      return massiveBodies.reduce((acc, mb) => {
        const a = Body.twoBodyAcceleration(sc, mb);
        return { x: acc.x + a.x, y: acc.y + a.y, z: acc.z + a.z };
      }, { x: 0, y: 0, z: 0 });
    }

    function allGravAccelerations(): VectorComponents[] {
      return [
        ...massiveBodyAccelerations(),
        ...spacecraft.map(spacecraftGravity)
      ];
    }

    function addBurn(gravAcc: VectorComponents, sc: Body, t: number): VectorComponents {
      const burn = sc.getActiveBurnAcceleration(t);
      if (!burn) return gravAcc;
      return { x: gravAcc.x + burn.x, y: gravAcc.y + burn.y, z: gravAcc.z + burn.z };
    }

    const gravAccs_i1 = this.gravAccelerations || allGravAccelerations();
    const mLen = massiveBodies.length;

    massiveBodies.forEach((body, idx) => {
      body.position = body.nextPosition(gravAccs_i1[idx], timeStep);
    });
    spacecraft.forEach((sc, idx) => {
      sc.position = sc.nextPosition(addBurn(gravAccs_i1[mLen + idx], sc, timeMs), timeStep);
    });

    const gravAccs_i2 = allGravAccelerations();

    massiveBodies.forEach((body, idx) => {
      const avgAcc = { x: (gravAccs_i1[idx].x + gravAccs_i2[idx].x) / 2, y: (gravAccs_i1[idx].y + gravAccs_i2[idx].y) / 2, z: (gravAccs_i1[idx].z + gravAccs_i2[idx].z) / 2 };
      body.velocity = body.nextSpeed(avgAcc, timeStep);
    });
    spacecraft.forEach((sc, idx) => {
      const a1 = addBurn(gravAccs_i1[mLen + idx], sc, timeMs);
      const a2 = addBurn(gravAccs_i2[mLen + idx], sc, timeMs);
      const avgAcc = { x: (a1.x + a2.x) / 2, y: (a1.y + a2.y) / 2, z: (a1.z + a2.z) / 2 };
      sc.velocity = sc.nextSpeed(avgAcc, timeStep);
    });

    this.gravAccelerations = gravAccs_i2;

    return bodies;
  }
}

type UpdaterLoopParam = {
  iterations: number,
  timestep: number
};


const defaulUpdaterLoopParamProvider = (timestepMs: number): UpdaterLoopParam => {
  if (timestepMs == 0) {
    return { iterations: 0, timestep: 0 }
  }

  const maxStableTimestepMs = 200 * 1000;
  const iterations = Math.ceil(Math.abs(timestepMs / maxStableTimestepMs));
  return { timestep: timestepMs / iterations, iterations: iterations };
}
