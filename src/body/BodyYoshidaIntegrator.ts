import { VectorComponents } from "../domain/models";
import { timeMsToUnits, TimeUnit } from "../system/time";
import { Vector } from "../system/Vector";
import { Body } from "./Body";
import { BaseBodyIntegrator, BodyFrame, IntegratorLoopParam } from "./BodySystemUpdater";
import { defaulIntegratorLoopParamProvider } from "./BodyVerletIntegrator";

export class BodyYoshidaIntegrator extends BaseBodyIntegrator {
    // private gravityAccelerations?: VectorComponents[];
    
    totalstepMs: number = 0;
    
    integratorIntegratorLoopParamProvider: (timestepMs: number) => IntegratorLoopParam;

    constructor(loopParamProvider: (timestepMs: number) => IntegratorLoopParam = 
        (timestepMs) => defaulIntegratorLoopParamProvider(timestepMs, 1000, 120)) {
        super();
        this.integratorIntegratorLoopParamProvider = loopParamProvider;
    }

    invalidate(): void {
        // this.gravityAccelerations = undefined;
    }

    getIntegratorLoopParams(timestepMs: number): IntegratorLoopParam {
        return this.integratorIntegratorLoopParamProvider(timestepMs);
    }

    computeFrame(bodies: Body[], timestepMs: number): BodyFrame {
        this.totalstepMs += timestepMs;
        const dt = timeMsToUnits(timestepMs, TimeUnit.Seconds);

        // Yoshida 4th order constants
        const w1 = 1 / (2 - Math.pow(2, 1/3));
        const w0 = -Math.pow(2, 1/3) * w1;
        const c1 = w1 / 2;
        const c2 = (w0 + w1) / 2;
        const c3 = c2;
        const c4 = c1;
        const d1 = w1;
        const d2 = w0;
        const d3 = w1;

        const positions_i1 = bodies.map(b => b.position);

        // Stage 1 - c1 * dt
        bodies.forEach(b => b.position = b.nextPositionEuler(b.velocity, c1 * dt));
        const acc1 = this.bodyAccelerations(bodies);
        bodies.forEach((b, i) => b.velocity = b.nextSpeed(acc1[i], d1 * dt));

        // Stage 2 - c2 * dt
        bodies.forEach(b => b.position = b.nextPositionEuler(b.velocity, c2 * dt));
        const acc2 = this.bodyAccelerations(bodies);
        bodies.forEach((b, i) => b.velocity = b.nextSpeed(acc2[i], d2 * dt));

        // Stage 3 - c3 * dt
        bodies.forEach(b => b.position = b.nextPositionEuler(b.velocity, c3 * dt));
        const acc3 = this.bodyAccelerations(bodies);
        bodies.forEach((b, i) => b.velocity = b.nextSpeed(acc3[i], d3 * dt));

        // Stage 4 — final position correction
        bodies.forEach(b => b.position = b.nextPositionEuler(b.velocity, c4 * dt));

        // this.gravityAccelerations = acc3;

        return { bodies, positions_i1 };
    }

    private bodyAccelerations(bodies: Body[]): VectorComponents[] {
        // same as Verlet
        const accContributions: VectorComponents[][] = [];
        const accs: VectorComponents[] = [];

        for (let i = 0; i < bodies.length; i++) {
            for (let j = i + 1; j < bodies.length; j++) {
                const aij_ji = Body.twoBodyAccelerations(bodies[i], bodies[j]);
                if (!accContributions[i]) accContributions[i] = [];
                if (!accContributions[j]) accContributions[j] = [];
                accContributions[i][j] = aij_ji.get("ij")!;
                accContributions[j][i] = aij_ji.get("ji")!;
            }
            accs[i] = (accContributions[i] || []).reduce(
                (sum, a) => ({ x: sum.x + a.x, y: sum.y + a.y, z: sum.z + a.z }),
                { x: 0, y: 0, z: 0 }
            );
        }
        return accs;
    }
}

