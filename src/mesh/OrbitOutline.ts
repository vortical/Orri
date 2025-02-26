import { BufferAttribute, BufferGeometry, Float32BufferAttribute, InterleavedBufferAttribute, Line, LineBasicMaterial, Object3D, SRGBColorSpace, Vector3 } from "three";
import { BodyObject3D } from "./BodyObject3D";
import { Vector } from "../system/Vector";
import { Body } from '../body/Body.ts';
import { BodySystem } from "../scene/BodySystem.ts";
import { BodyProperties } from "../domain/models.ts";
import { ExecutorPool } from "../system/ExecutorPool.ts";
// import MyWorker from './worker?worker';

// const MAX_VERTICES = 360 * 20*10;
const MAX_VERTICES = 360 * 5;
const NB_WORKERS = 8;

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
};

class OrbitOutlinerWorker {

    worker: Worker;

    constructor(){
        this.worker = new Worker(new URL('./worker.ts', import.meta.url), {
            type: 'module',
        });
    };

    run(orbitLength: OrbitLength, orbitingBodies: BodyProperties[]): Promise<NamedArrayBuffer[]>{
        return new Promise<NamedArrayBuffer[]>((resolve) => {
            this.worker.onmessage = (event) => resolve(event.data.response);                
            this.worker.postMessage({orbitLength: orbitLength, bodies: orbitingBodies })    
        });
    }
}


type OrbitOutlineWorkerParams = {orbitLength: OrbitLength,  orbitingBodies: BodyProperties[]};

let workerPool: ExecutorPool<OrbitOutlineWorkerParams, NamedArrayBuffer[]>;

export function getworkerExecutorPool(): ExecutorPool<OrbitOutlineWorkerParams,NamedArrayBuffer[]> {
    if(workerPool == undefined){
        const workers = Array.from({length: NB_WORKERS}).map(() => {
            const runner = new OrbitOutlinerWorker();
            return (s: OrbitOutlineWorkerParams) => runner.run(s.orbitLength, s.orbitingBodies);        
        });
        workerPool = new ExecutorPool(workers);
    }
    return workerPool;
}
    



export class OrbitalOutline  {
    line: Line;
    material: LineBasicMaterial;
    _colorHue!: number;
    startIndex: number = 0;
    endIndex: number = 0;
    /**
     * Size of the buffer holding the position attribute.
     */
    maxVertices: number;
    // nbOf vertices representing this orbit. Defaults to nearly a full circle.
    nbVertices: number = 355 * 4

    /**
     * Full circle is 2PI.
     */
    totalAngle = 0;
    // sampleAngle = 0;

    p0!: Vector3;
    p1!: Vector3;

    constructor(maxVertices=MAX_VERTICES, enabled = true, colorHue = 0.5, opacity = 0.7) {        
        const geometry = new BufferGeometry();
        const positionAttribute = new Float32BufferAttribute(new Float32Array(maxVertices * 3), 3);
        geometry.setAttribute('position', positionAttribute);
        this.material = new LineBasicMaterial({ color: 0xffffff, opacity: opacity, transparent: true });
        this.line = new Line(geometry, this.material);
        this.enabled = enabled;
        this.opacity = opacity;
        this.maxVertices=maxVertices
    }

    getObject3D(): Object3D {
        return this.line;
    }

    resetOrbit(){
        this.endIndex = 0;
    }

    /**
     * Set up an orbital circumference with a length based on degrees. 360 means an entire orbit.
     * 
     * @param angleDegrees the degrees to render
     */
    createOrbitForAngle(angleDegrees: number, bodyObject: BodyObject3D, bodySystem: BodySystem ){
        this.createOrbit({type: OrbitLengthType.Angle, value: angleDegrees }, bodyObject, bodySystem);

    }

    /**
     * Draw an orbit circumferance with a length that would be covered for a specific time. E.g. 1
     * day Orbit would represent the orbit distance covered in a day.
     * @param timeMs 
     */
    createOrbitForTime(timeMs: number, bodyObject: BodyObject3D, bodySystem: BodySystem ){
        this.createOrbit({type: OrbitLengthType.Time, value: timeMs }, bodyObject, bodySystem);

    }


    createOrbit(orbitLength: OrbitLength, bodyObject: BodyObject3D, bodySystem: BodySystem){

        // collection of bodies needed to create a credible orbit of this body
        const bodyPlanetSystem = planetSystem(bodyObject.body, bodySystem);

        // We send data transfer objects to the webworkers. 
        const orbitingBodies = bodyPlanetSystem.map(b => b.getBodyProperties());

        // Determine the orbits using a stationary sun, substract its velocity. (commented out for now)
        // const sun = bodySystem.getBody("Sun")!;
        // orbitingBodies.forEach(body => body.velocity = Vector.substract(sun.velocity, body.velocity!));

        getworkerExecutorPool().execute({orbitLength:orbitLength, orbitingBodies:orbitingBodies})
            .then(namedOrbitArrayBuffers => { 
                namedOrbitArrayBuffers
                    .filter( o => o.buffer != undefined)
                    .forEach( o => {
                        const bodyObject3D: BodyObject3D = bodySystem.getBodyObject3D(o.name);
                        bodyObject3D.orbitOutline.setPositionAttributeBuffer(new Float32Array(o.buffer!), o.index);
                        bodyObject3D.orbitOutline.nbVertices = o.index; // createOrbit determines the length of the orbit.
                        bodyObject3D.orbitOutline.needsUpdate();
                    });
        });
        
    }
 

    /**
     *  Grab 2 previous positions and current body position
     *  Create 2 vectors from those 3 positions: v1 and v2
     *  If the angle between the first and second vector surpasses a threshold,
     *  then add a new point to the orbit
     *  else extend the second vector by replacing the last point in the buffer
     *  with the current position.
     *
     * @param position 
     */
    addPosition(position: Vector3) {
        
        const positionAttributeBuffer: BufferAttribute = this.line.geometry.getAttribute('position') as BufferAttribute;

        // Positions are in km in the scene...
        position = position.clone().multiplyScalar(0.001);

        if (this.endIndex == 0) { 
            this.p0 = position;                
            positionAttributeBuffer.setXYZ(this.endIndex++, position.x, position.y, position.z);
        } else if(this.endIndex == 1){
            if(position.equals(this.p0)){
                return;
            }
            this.p1 = position;
            positionAttributeBuffer.setXYZ(this.endIndex++, position.x, position.y, position.z);    
            
        } else {
            if(position.equals(this.p1)){
                return;
            }
            const v1 = Vector.substract(this.p0, this.p1);
            const v2 = Vector.substract(this.p1, position);
            const angle = Math.abs(v1.angleTo(v2));
            
            // Add a new vertex for every ~0.25degrees. If the angle is less then
            // extend the existing line with this position
            if(angle > Math.PI/720) {
                this.totalAngle += angle;
                // add position, our draw range/index is increased by 1
                this.p0 = this.p1.clone();
                this.p1 = position;
                positionAttributeBuffer.setXYZ(this.endIndex++, position.x, position.y, position.z);
                if(this.endIndex-this.startIndex > this.nbVertices){
                    this.startIndex++;
                    // console.log(this.nbVertices+": "+this.startIndex+" -> "+this.endIndex)

                    // has our endIndex reached the end of our buffer?
                    if(this.endIndex >= this.maxVertices){                        
                        this.shiftPositionBufferAttribute();
                    }

                }
            
            } else {
                // replace p1 with position, draw range/index remains the same
                this.p1 = position;
                positionAttributeBuffer.setXYZ(this.endIndex-1, position.x, position.y, position.z);    
            }

        }
    }

    /**
     * 
     * Move startIndex to 0. This happens when the endIndex reached the maxNBVertices.
     * 
     */
    shiftPositionBufferAttribute(){
        const sourcePositionArray: Float32Array = this.getPositionAttribute().array as Float32Array;
        // 3 components per index
        sourcePositionArray.copyWithin(0, this.startIndex*3, this.endIndex*3);        
        // const start = this.startIndex;

        this.endIndex = this.endIndex - this.startIndex;
        this.startIndex = 0;
    } 

    flipPositionBufferAttribute() {
        const sourcePositionArray: Float32Array = this.getPositionAttribute().array as Float32Array;
        const targetPositionArray = new Float32Array(this.maxVertices * 3);

        for(let sourceIndex = 3*(this.endIndex-1), targetIndex=0; sourceIndex >= 0; sourceIndex-=3, targetIndex+=3){
            for(let c = 0; c < 3; c++) {
                targetPositionArray[targetIndex+c] = sourcePositionArray[sourceIndex+c];

            }


        }        
        this.setPositionAttributeBuffer(targetPositionArray, this.endIndex);
    }

    getPositionAttribute():BufferAttribute | InterleavedBufferAttribute {
        return this.line.geometry.attributes['position'];
    }
    
    setPositionAttributeBuffer(positionAttribute: Float32Array, index: number){
        this.line.geometry.attributes['position'].array.set(positionAttribute);
        this.endIndex = index;
        this.startIndex = 0;
    }
    
    needsUpdate(){
        const positionAttributeBuffer = this.line.geometry.getAttribute('position') as BufferAttribute;
        this.line.geometry.setDrawRange(this.startIndex, this.endIndex-this.startIndex);
        positionAttributeBuffer.needsUpdate = true;
        this.line.geometry.computeBoundingSphere();
    }

    set opacity(value: number) {
        this.material.opacity = value;
    }

    get opacity(): number {
        return this.material.opacity;
    }    

    set colorHue(value: number) {
        this._colorHue = value;
        this.material.color.setHSL(value, 0.8, 0.5, SRGBColorSpace);
    }
    get colorHue(): number {
        return this._colorHue;
    }

    set enabled(value: boolean) {
        this.line.visible = value;
    }

    get enabled(): boolean {
        return this.line.visible;
    }    
}



/**
 * partition each planet with the sun and its moon (todo: along with moons)
 * 
 * @param body A planet or sun for which we want an orbit. 
 */
function planetSystem( body: Body, bodySystem: BodySystem): Body[] {
    const group = [body];
    while(body.parentName != undefined){
            body = bodySystem.getBody(body.parentName);
            group.push(body);
    }
    return group;    
}
