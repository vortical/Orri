import { BufferAttribute, BufferGeometry, Float32BufferAttribute, InterleavedBuffer, InterleavedBufferAttribute, Line, LineBasicMaterial, Object3D, SRGBColorSpace, Vector3 } from "three";
import { CelestialBodyPart } from "./CelestialBodyPart";
import { BodyObject3D } from "./BodyObject3D";
import { Vector } from "../system/Vector";
import { Body } from '../body/Body.ts';


const MAX_VERTICES = 360 * 20*10;


function hashCode(s: String) {
    for(var i = 0, h = 0; i < s.length; i++)
        h = Math.imul(31, h) + s.charCodeAt(i) | 0;
    return h;
}

export class OrbitalOutline  {
    line: Line;
    material: LineBasicMaterial;
    _colorHue!: number;
    index: number = 0;

    p0!: Vector3;
    p1!: Vector3;

    constructor(maxVertices=MAX_VERTICES, enabled = true, colorHue = 0.5, opacity = 0.7) {        
        const geometry = new BufferGeometry();
        const positionAttribute = new Float32BufferAttribute(new Float32Array(MAX_VERTICES * 3), 3);
        geometry.setAttribute('position', positionAttribute);
        this.material = new LineBasicMaterial({ color: 0xffffff, opacity: opacity, transparent: true });
        this.line = new Line(geometry, this.material);
        this.enabled = enabled;
        this.opacity = opacity;
    }

    getObject3D(): Object3D {
        return this.line;
    }

    resetOrbit(){
        this.index = 0;
    }


    addPosition(position: Vector3) {

        
        const positionAttributeBuffer: BufferAttribute = this.line.geometry.getAttribute('position') as BufferAttribute;
        
        // Grab 2 previous positions and current body position
        // Create 2 vectors from those 3 positions.
        // If the angle between the first and second vector surpasses a threshold,
        // then add a new point to the orbit
        // else extend the second vector by replacing the last point in the buffer
        // with the current position.
        

       

        position = position.clone().multiplyScalar(0.001);

        if (this.index == 0) {
            this.p0 = position;                
            positionAttributeBuffer.setXYZ(this.index++, position.x, position.y, position.z);
        } else if(this.index == 1){
            if(position.equals(this.p0)){
                return;
            }
            this.p1 = position;
            positionAttributeBuffer.setXYZ(this.index++, position.x, position.y, position.z);    
            
        } else {
            if(position.equals(this.p1)){
                return;
            }
            const v1 = Vector.substract(this.p0, this.p1);
            const v2 = Vector.substract(this.p1, position);
            const angle = Math.abs(v1.angleTo(v2));

            // 0.25 degrees
            if(angle > Math.PI/720) {
                // add position, our draw range is increased by 1
                this.p0 = this.p1.clone();
                this.p1 = position;
                positionAttributeBuffer.setXYZ(this.index++, position.x, position.y, position.z);
            } else {
                // replace p1 with position, draw range remains the same
                this.p1 = position;
                positionAttributeBuffer.setXYZ(this.index-1, position.x, position.y, position.z);    
            }

        }
    }

    getPositionAttribute():BufferAttribute | InterleavedBufferAttribute {
        return this.line.geometry.attributes['position'];
    }
    
    setPositionAttributeBuffer(positionAttribute: Float32Array, index: number){
        this.line.geometry.attributes['position'].array.set(positionAttribute);
        this.index = index;
    }
    
    needsUpdate(){
        const positionAttributeBuffer = this.line.geometry.getAttribute('position') as BufferAttribute;
        this.line.geometry.setDrawRange(0, this.index);
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



// // Main thread

// const geometry = new BufferGeometry();
// const vertices = new Float32Array(MAX_VERTICES * 3);
// const positionAttribute = new Float32BufferAttribute(vertices, 3);
// geometry.setAttribute('position', positionAttribute);


// const geometry = new THREE.BufferGeometry();
// const vertices = new Float32Array([ ... ]); // Your vertex data
// const positionAttribute = new THREE.BufferAttribute(vertices, 3);
// geometry.setAttribute('position', positionAttribute);

// const worker = new Worker('worker.js');

// worker.postMessage({ buffer: positionAttribute.array }, [positionAttribute.array.buffer]); // Transfer ownership

// worker.onmessage = (event) => {
//   const updatedVertices = new Float32Array(event.data.buffer);
//   attribute.array.set(updatedVertices);
//   attribute.needsUpdate = true;
// };

// // Worker thread (worker.js)
// self.onmessage = (event) => {
//   const vertices = new Float32Array(event.data.buffer);
//   // Perform computations on vertices
//   self.postMessage({ buffer: vertices.buffer }, [vertices.buffer]); // Transfer back
// };