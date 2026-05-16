import { RenderableBody } from "./RenderableBody";
import { Vector } from "../system/Vector";
import { Body } from '../body/Body.ts';
import { BodySystem } from "../scene/BodySystem.ts";
import { BodyProperties } from "../domain/models.ts";
import { ExecutorPool } from "../system/ExecutorPool.ts";
import { TrajectoryOutline } from "./TrajectoryOutline";

const MAX_VERTICES = 360 * 50 * 4;
const NB_WORKERS = 8;

export type NamedArrayBuffer = {
    name: string,
    buffer: ArrayBufferLike | undefined,
    index: number,
}

export enum OrbitLengthType {
    AngleDegrees = "AngleDegrees",
    Time = "Time"
};


export type OrbitLength = {
    lengthType: OrbitLengthType,
    value: number
};

class OrbitOutlinerWorker {

    worker: Worker;

    constructor(){
        this.worker = new Worker(new URL('./worker.ts', import.meta.url), {
            type: 'module',
        });
    };

    run(desiredOrbitBodyName: string, orbitLength: OrbitLength, orbitingBodies: BodyProperties[], origin: OrbitOrigin): Promise<NamedArrayBuffer[]>{
        return new Promise<NamedArrayBuffer[]>((resolve) => {
            this.worker.onmessage = (event) => resolve(event.data.response);
            this.worker.postMessage({desiredOrbitBodyName: desiredOrbitBodyName, orbitLength: orbitLength, bodies: orbitingBodies, origin: origin })
        });
    }
}

/** Scene-km offset the worker stores the orbit vertices relative to (see TrajectoryOutline.origin). */
export type OrbitOrigin = { x: number, y: number, z: number };

type OrbitOutlineWorkerParams = {desiredOrbitBodyName: string, orbitLength: OrbitLength,  orbitingBodies: BodyProperties[], origin: OrbitOrigin};

let workerPool: ExecutorPool<OrbitOutlineWorkerParams, NamedArrayBuffer[]>;

export function getworkerExecutorPool(): ExecutorPool<OrbitOutlineWorkerParams,NamedArrayBuffer[]> {
    if(workerPool == undefined){
        const workers = Array.from({length: NB_WORKERS}).map(() => {
            const runner = new OrbitOutlinerWorker();
            return (s: OrbitOutlineWorkerParams) => runner.run(s.desiredOrbitBodyName, s.orbitLength, s.orbitingBodies, s.origin);
        });
        workerPool = new ExecutorPool(workers);
    }
    return workerPool;
}


export class OrbitTrajectoryOutline extends TrajectoryOutline {
    _orbitLength: OrbitLength;

    constructor(bodyObject?: RenderableBody, maxVertices = MAX_VERTICES, enabled = false, colorHue = 0.5, opacity = 0.7, orbitLength: OrbitLength = {value: 350, lengthType: OrbitLengthType.AngleDegrees}) {
        super(bodyObject, maxVertices, enabled, colorHue, opacity);
        this._orbitLength = orbitLength;
    }

    set orbitLength(value: OrbitLength) {
        this._orbitLength = value;
        if (this.enabled) {
            this.createTrajectory();
        }
    }

    get orbitLength(): OrbitLength {
        return this._orbitLength;
    }

    createTrajectory() {
        if (this.bodyObject == undefined) {
            return;
        }
        this.reset();

        

        const bodySystem = this.bodyObject.bodySystem;
        const bodyPlanetSystem = planetSystem(this.bodyObject.body, this.bodyObject.bodySystem);

        const orbitingBodies = bodyPlanetSystem.map(b => b.getBodyProperties());

        const sun = bodySystem.getBody("Sun")!;
        orbitingBodies.forEach(body => body.velocity = Vector.substract(sun.velocity, body.velocity!));

        // The worker emits vertices relative to this origin (the camera target) so that
        // near-camera segments are small-magnitude and Float32-precise.
        const origin = bodySystem.getTargetSceneOrigin();

        getworkerExecutorPool().execute({desiredOrbitBodyName: this.bodyObject.getName(), orbitLength: this.orbitLength, orbitingBodies: orbitingBodies, origin: {x: origin.x, y: origin.y, z: origin.z}})
            .then(namedOrbitArrayBuffers => {
                namedOrbitArrayBuffers
                    .filter(o => o.buffer != undefined)
                    .forEach(o => {
                        const bodyObject3D: RenderableBody = bodySystem.getRenderableBody(o.name);
                        // setOrigin first: setPositionAttributeBuffer rebuilds the float64
                        // master as `buffer + origin`, so the origin must already be set.
                        bodyObject3D.trajectoryOutline.setOrigin(origin);
                        bodyObject3D.trajectoryOutline.setPositionAttributeBuffer(new Float32Array(o.buffer!), o.index);
                        bodyObject3D.trajectoryOutline.nbVertices = o.index;
                        bodyObject3D.trajectoryOutline.needsUpdate();
                    });
        });
    }
}


/**
 * partition each planet with the sun and its moon (todo: along with moons)
 *
 * @param body A planet or sun for which we want an orbit.
 */
function planetSystem(body: Body, bodySystem: BodySystem): Body[] {
    const group = [body];
    while (body.parentName != undefined) {
        body = bodySystem.getBody(body.parentName);
        group.push(body);
    }
    return group;
}
