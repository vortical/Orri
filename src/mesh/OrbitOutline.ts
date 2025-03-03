import { BufferAttribute, BufferGeometry, Float32BufferAttribute, InterleavedBufferAttribute, Line, LineBasicMaterial, Object3D, SRGBColorSpace, Vector3 } from "three";
import { BodyObject3D } from "./BodyObject3D";
import { Vector } from "../system/Vector";
import { Body } from '../body/Body.ts';
import { BodySystem } from "../scene/BodySystem.ts";
import { BodyProperties } from "../domain/models.ts";
import { ExecutorPool } from "../system/ExecutorPool.ts";
// import MyWorker from './worker?worker';

const MAX_VERTICES = 360 * 20*10;
// const MAX_VERTICES = 360 * 5;
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

    run(desiredOrbitBodyName: string, orbitLength: OrbitLength, orbitingBodies: BodyProperties[]): Promise<NamedArrayBuffer[]>{
        return new Promise<NamedArrayBuffer[]>((resolve) => {
            this.worker.onmessage = (event) => resolve(event.data.response);                
            this.worker.postMessage({desiredOrbitBodyName: desiredOrbitBodyName, orbitLength: orbitLength, bodies: orbitingBodies })    
        });
    }
}


type OrbitOutlineWorkerParams = {desiredOrbitBodyName: string, orbitLength: OrbitLength,  orbitingBodies: BodyProperties[]};

let workerPool: ExecutorPool<OrbitOutlineWorkerParams, NamedArrayBuffer[]>;

export function getworkerExecutorPool(): ExecutorPool<OrbitOutlineWorkerParams,NamedArrayBuffer[]> {
    if(workerPool == undefined){
        const workers = Array.from({length: NB_WORKERS}).map(() => {
            const runner = new OrbitOutlinerWorker();
            return (s: OrbitOutlineWorkerParams) => runner.run(s.desiredOrbitBodyName, s.orbitLength, s.orbitingBodies);        
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
    nbVertices: number = 355 * 4;

    /**
     * Full circle is 2PI.
     */
    totalAngle = 0;
    // sampleAngle = 0;

    p0!: Vector3;
    p1!: Vector3;
    bodyObject?: BodyObject3D;
    _orbitLength: OrbitLength;
    // _enabled: boolean;

    set orbitLength(value: OrbitLength){

        this._orbitLength = value;

        if(this.enabled){
            this.createOrbit();
        }
        

    }

    get orbitLength(): OrbitLength {
        return this._orbitLength;
    }

    constructor(bodyObject?: BodyObject3D, maxVertices=MAX_VERTICES, enabled = false, colorHue = 0.5, opacity = 0.7, orbitLength={value: 350, lengthType:OrbitLengthType.AngleDegrees}) {        

        this.bodyObject = bodyObject;

        const geometry = new BufferGeometry();
        const positionAttribute = new Float32BufferAttribute(new Float32Array(maxVertices * 3), 3);
        geometry.setAttribute('position', positionAttribute);
        this.material = new LineBasicMaterial({ color: 0xffffff, opacity: opacity, transparent: true });
        this.line = new Line(geometry, this.material);
        this.enabled = enabled;
        this.opacity = opacity;
        this.maxVertices = maxVertices
        this._orbitLength = orbitLength;
        this.enabled = enabled;
    }

    getObject3D(): Object3D {
        return this.line;
    }

    resetOrbit(){
        this.startIndex = 0;
        this.endIndex = 0;
    }

 
    createOrbit(){

        if(this.bodyObject == undefined){
            return;
        }
        this.resetOrbit();

        console.log("Create Orbit:"+this.bodyObject.getName());

        const bodySystem = this.bodyObject.bodySystem;
        // collection of bodies needed to create a credible orbit of this body
        const bodyPlanetSystem = planetSystem(this.bodyObject.body, this.bodyObject.bodySystem);

        // We send data transfer objects to the webworkers. 
        const orbitingBodies = bodyPlanetSystem.map(b => b.getBodyProperties());

        // Determine the orbits using a stationary sun, substract its velocity. (commented out for now)
        const sun = bodySystem.getBody("Sun")!;
        orbitingBodies.forEach(body => body.velocity = Vector.substract(sun.velocity, body.velocity!));

        getworkerExecutorPool().execute({desiredOrbitBodyName: this.bodyObject.getName(), orbitLength: this.orbitLength, orbitingBodies:orbitingBodies})
            .then(namedOrbitArrayBuffers => { 
                namedOrbitArrayBuffers
                    .filter( o => o.buffer != undefined)
                    .forEach( o => {
                        // todo: just return the orbit for this body!
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
    addPosition(position: Vector3, maintainLength: boolean = false) {
        // if(!this.enabled){
        //     return;
        // }
        
        
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
                // this assume we keep a constant nb of vertices - we add a vertex, we remove one
                if(this.endIndex-this.startIndex > this.nbVertices){
                    // this does not insure we remove the proper distance
                    this.startIndex++;
                    // console.log(this.nbVertices+": "+this.startIndex+" -> "+this.endIndex)

                    // has our endIndex reached the end of our buffer?
                    if(this.endIndex >= this.maxVertices){                        
                        this.shiftPositionBufferAttribute();
                    }

                }
            
            } else {
                // replace p1 with position, draw range/index remains the same
                // todo: we should move the position of the first vertice by an equal distance instead of just removing it when we add a vertex

                // calculate distance between p1 and position

                const that = this;

                // function selectFirstPoint(startIndex: number, distance: number): [Vector, number] {
                //     let p1 = that.positionAtIndex(startIndex);
                //     const p2 = that.positionAtIndex(startIndex+1);

                //     const firstSegment = Vector.substract(p1, p2);
                //     const firstSegmentLength = firstSegment.magnitude();

                //     // keep this debug
                //     // console.log(`i: ${startIndex} - p1:${p1.toString()}, p2:${p2.toString()} - segment:${firstSegment.toString()}`)
                    
                //     if(firstSegmentLength < distance){
                //             // increaseStartIndex
                //             console.log("First Segment distance too short: removing it ");
                    
                //             return selectFirstPoint(startIndex+1, distance-firstSegmentLength);
                //     }
                                        
                //     p1 = p1.add(firstSegment.normalize().multiplyScalar(distance));                        
                //     return [p1, startIndex];
                        
                // }
                        
                // if(maintainLength){
                //         const addedDistance = v2.magnitude();
                //         const oldP0 = that.positionAtIndex(this.startIndex);
                //         // this.p0 = selectFirstPoint(addedDistance);
                //         const [newP0, index] = selectFirstPoint(this.startIndex, addedDistance);
                //         const newSegment0 = Vector.substract(newP0, oldP0);
                //         const diff = addedDistance-newSegment0.magnitude();
                //         // console.log(newSegment0.magnitude() +" vs "+addedDistance);
                //         // console.log("Diff: "+ diff.toFixed(4));
                //         if(Math.abs(diff) > 1){
                //                 // should not happen - TODO: fix me
                //             console.log("OUPSSSS")
                //         } else {
                //             this.startIndex = index;                    
                //             positionAttributeBuffer.setXYZ(index, newP0.x, newP0.y, newP0.z)
                //         }
                            
                //     }
                            
                            
                    this.p1 = position;
                    positionAttributeBuffer.setXYZ(this.endIndex-1, position.x, position.y, position.z);    
                }
                        
            }
    }
    
    positionAtIndex(i: number): Vector {
        const sourcePositionArray: Float32Array = this.getPositionAttribute().array as Float32Array;
        const arrayIndex = i*3;
        //todo: Use Vector.fromBufferAttribute(attribute, index)
        return new Vector(sourcePositionArray[arrayIndex], sourcePositionArray[arrayIndex+1], sourcePositionArray[arrayIndex+2]);
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
        this.p0 =  this.positionAtIndex(index-2);
        this.p1 =  this.positionAtIndex(index-1);
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
        if(this.line.visible != value){
            if(value){
                this.createOrbit();
            }
            this.line.visible = value;
        }
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
