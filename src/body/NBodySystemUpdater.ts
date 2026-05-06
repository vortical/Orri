import { Body } from './Body.ts';
import { BodySystemUpdater } from './BodySystemUpdater.ts';
import { TimeUnit, timeMsToUnits } from '../system/time.ts';
import { Clock, TimeMark } from "../system/Clock.ts";
import { BodyObject3D } from '../mesh/BodyObject3D.ts';
import { VectorComponents } from '../domain/models.ts';
import { BODY_ACTIVE_TOPIC } from '../system/event-types.ts';






export class NBodySystemUpdater implements BodySystemUpdater {
  isOneTimeUpdate = false;
  isEnabled = true;
  gravAccelerations?: VectorComponents[];

  totalstepMs: number = 0;
  invalidateNextUpdate: boolean = false;

  invalidate(){
    this.invalidateNextUpdate = true;

  }


  update(bodyObject3Ds: BodyObject3D[], timeMark: TimeMark,  doInvalidate: boolean=false): BodyObject3D[] {
    const { timestep, iterations } = defaulUpdaterLoopParamProvider(timeMark.deltaMs);
    const timeMs = timeMark.timeMs; // this is now - we have have to catch up to this time.
    const timestepMs = timeMark.deltaMs;

    const startTimeMs = timeMs - timestepMs; // Our start time
    if(doInvalidate || this.invalidateNextUpdate){
      // we cache accelerations at previous time, some constraints can force us to invalidate them
      // e.g.: adding/removing bodies from our system...
      this.gravAccelerations = undefined;
      this.invalidateNextUpdate = false;
    }

    const allBodyData: Body[] = Array.from(bodyObject3Ds.values())
      .map((o:BodyObject3D) => o.body)
      .filter(b => !b.useTrajectory);


    for (let i = 0; i < iterations; i++) {
      const stepTimeMs = startTimeMs + i * timestep;
      this.updateBodyProperties(allBodyData, timestep, stepTimeMs);
    }

    allBodyData.forEach((body) => {
      if(body.isActive()){
        body.sideralRotation = body.rotationAtTime(timeMs);
      }
    });

    bodyObject3Ds.forEach(b => b.isActive() && !b.body.useTrajectory && b.update());
    return bodyObject3Ds;
  }

  updateBodyProperties(bodies: Body[], timeStepMs: number, timeMs: number): Body[] {
    this.totalstepMs += timeStepMs;
    const timeStep = timeMsToUnits(timeStepMs, TimeUnit.Seconds);

    const massiveBodies = bodies.filter(b => b.type !== 'spacecraft' && b.isActive());
    const spacecraft = bodies.filter(b => b.type === 'spacecraft' && b.isActive() && !b.useTrajectory);

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

  const maxIterations = 100;
  // const desiredTimestepMs = 1 * 50000;
  const desiredTimestepMs = 1 * 1000;
  const desiredIterations = Math.abs(timestepMs / desiredTimestepMs);
  const desiredStepFactor = Math.ceil(desiredIterations / maxIterations);
  const iterations = Math.ceil(Math.abs(timestepMs) / (desiredTimestepMs * desiredStepFactor));
  return { iterations: iterations, timestep: timestepMs / iterations };
}
