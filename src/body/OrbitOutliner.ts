
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
import { ExecutorPool } from '../system/ExecutorPool.ts';


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
    workerExecutorPool: ExecutorPool<{orbitLength: OrbitLength,  orbitingBodies: OrbitingBody[]},NamedArrayBuffer[]>;

    constructor(bodySystem: BodySystem){
        this.bodySystem = bodySystem;
        this.workerExecutorPool = new ExecutorPool(Array.from({length: 6}).map(() => {
            const runner = new OrbittingOutlinerWorker();
            return (s) => runner.run(s.orbitLength, s.orbitingBodies);        
        }));
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
        const partitions = partitionPlanetsBySystem(orbitingBodies);

        partitions.forEach(partition => {
            this.workerExecutorPool.execute({orbitLength:orbitLength, orbitingBodies:partition})
                .then(namedOrbitArrayBuffers => { 
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


/**
 * partition each planet with the sun and its moon (todo: along with moons)
 */
function partitionPlanetsBySystem( orbitingBodies: OrbitingBody[]):OrbitingBody[][] {

    function findBody(name: String): OrbitingBody|undefined {
        return orbitingBodies.find(o => o.name == name);
    }

    return [...orbitingBodies.map(o => {
        const group = [o];
        while(o.parentName != undefined){
            o = findBody(o.parentName)!;
            group.push(o);
        }
        return group;
    })];
}

class OrbittingOutlinerWorker {

    worker: Worker;

    constructor(){
        this.worker = new Worker(new URL('./worker.ts', import.meta.url), {
            type: 'module',
        });
    };

    run(orbitLength: OrbitLength, orbitingBodies: OrbitingBody[]): Promise<NamedArrayBuffer[]>{
        return new Promise<NamedArrayBuffer[]>((resolve) => {
            this.worker.onmessage = (event) => resolve(event.data.response);                
            this.worker.postMessage({orbitLength: orbitLength, bodies: orbitingBodies })    
        });
    }
}
