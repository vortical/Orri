
import { Body } from './Body.ts';
import { BodySystemUpdater } from './BodySystemUpdater.ts';
import { zipCombine } from '../system/functions.ts';
import { TimeUnit, timeMsToUnits } from '../system/time.ts';
import { Clock } from "../system/Clock.ts";
import { BodyObject3D } from '../mesh/BodyObject3D.ts';
import { BodyProperties, BodyType, VectorComponents } from '../domain/models.ts';
import { Vector } from '../system/Vector.ts';

import MyWorker from './worker?worker'
import { BodySystem } from '../scene/BodySystem.ts';


/**
 * Just a simple clone of a body along with a selection of properties 
 * to be used only for determining orbit path
 */

export type  OrbitingBody = BodyProperties & {
    needsOrbit?: boolean
};

export type NamedArrayBuffer = {
    name: string,
    buffer: ArrayBufferLike | undefined,
    index: number,
}

export enum OrbitLengthType {
    Angle,
    Time
};

export type OrbitLength = {
    type: OrbitLengthType,
    value: number
}

function createOrbitingBodies(sourceBodyObjects: BodyObject3D[]): OrbitingBody[] {
    function createOrbitingBody(sourceBodyObject: BodyObject3D): OrbitingBody {    
        const body = sourceBodyObject.body;
        return {
            type: body.type,
            name: body.name,
            mass: body.mass,
            radius: body.radius,
            position: body.position,        
            velocity: body.velocity,
            parentName: body.parentName,
            needsOrbit: sourceBodyObject.body.type == "planet"|| sourceBodyObject.body.type  == "star"
            
        };
    }

    let bodies = sourceBodyObjects.map(b=> createOrbitingBody(b));
    return bodies;
}

export class OrbitPathUpdater { 

    bodySystem: BodySystem;
    workerRunnerPool: WorkerRunnerPool;

    constructor(bodySystem: BodySystem){
        this.bodySystem = bodySystem;
        this.workerRunnerPool = new WorkerRunnerPool ();
    }

    /**
     * Set up an orbital circumference with a length based on degrees. 360 means an entire orbit.
     * 
     * @param angleDegrees the degrees to render
     */
    renderOrbitForAngle(angleDegrees: number, bodyObjects: BodyObject3D[] ){
        this.drawOrbits({type: OrbitLengthType.Angle, value: angleDegrees }, bodyObjects);

    }

    /**
     * Draw an orbit circumferance with a length that would be covered for a specific time. E.g. 1
     * day Orbit would represent the orbit distance covered in a day.
     * @param timeMs 
     */
    renderOrbitsForTime(timeMs: number, bodyObjects: BodyObject3D[] ){
        this.drawOrbits({type: OrbitLengthType.Time, value: timeMs }, bodyObjects);

    }


    drawOrbits(orbitLength: OrbitLength, bodyObjects: BodyObject3D[]){

        bodyObjects = bodyObjects.filter(o => o.body.type == "planet"|| o.body.type  == "star")

        const orbitingBodies = createOrbitingBodies(bodyObjects);
        const partitions = partitionPlanets(orbitingBodies);

        partitions.forEach(partition => {
            // this in theory will block: so we need to make runnables retrieved as promises
            const runnable = this.workerRunnerPool.getRunnable();
            runnable.run(orbitLength, partition).then(namedOrbitArrayBuffers => { 
                namedOrbitArrayBuffers
                    .filter( o => o.buffer != undefined)
                    .forEach( o => {
                        const bodyObject3D: BodyObject3D = this.bodySystem.getBodyObject3D(o.name);
                        bodyObject3D.orbitOutline.setPositionAttributeBuffer(new Float32Array(o.buffer!), o.index);
                        bodyObject3D.orbitOutline.needsUpdate();
                    });

            });
        });
    }
}

function partitionPlanets( orbitingBodies: OrbitingBody[]):OrbitingBody[][] {
    // partition each planets into its own group (todo: along with moons)

    function findBody(name: String): OrbitingBody|undefined {
        return orbitingBodies.find(o => o.name == name);
    }

    return [...orbitingBodies.map(o => {
        // return an array with itself and the sun
        const group = [o];
        while(o.parentName != undefined){
            o = findBody(o.parentName)!;
            group.push(o);
        }
        return group;
    })];


}



// Add a queue and make getRunnable be a promise
class WorkerRunnerPool {
    size: number;
    pool: OrbittingOutlinerWorkerRunner[];
    // waitQueues = {};
    // activeRequests = {};
    count = 0;

    constructor(size: number=5){        
        this.size = size;
        this.pool = [];
        for(let i = 0; i < size; i++){
            this.pool.push(new OrbittingOutlinerWorkerRunner());
        }
    }

    /**
     * 
     */
    getRunnable(): OrbittingOutlinerWorkerRunner{
        const index = this.count++;
        this.count = (this.count % this.size)
        return this.pool[index];
    }


}




// Todo: definitely generalize this if needed.
class OrbittingOutlinerWorkerRunner {

    worker: Worker;

    constructor(){
        this.worker = new Worker(new URL('./worker.ts', import.meta.url), {
            type: 'module',
        });


    };

    run(orbitLength: OrbitLength, orbitingBodies: OrbitingBody[]): Promise<NamedArrayBuffer[]>{

        const p = new Promise<NamedArrayBuffer[]>((resolve) => {

            this.worker.onmessage = (event) => {
                // console.log('Result from worker:', event.data);
                const orbitArrayBuffers = event.data.response;                
                resolve(orbitArrayBuffers);
    
            };
    
            this.worker.postMessage({orbitLength: orbitLength, bodies: orbitingBodies })
    
        });
        return p;


    }


}

