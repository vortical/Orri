import { BufferAttribute, Vector3 } from "three";
import { VectorComponents } from "../domain/models.ts";
import { sub } from "three/examples/jsm/nodes/Nodes.js";


export class Vector extends Vector3 implements VectorComponents {

    magnitude(): number {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }

    static substract(pos1: VectorComponents|Vector3|Vector, pos2: VectorComponents|Vector3|Vector): Vector {
        return new Vector(pos2.x - pos1.x, pos2.y - pos1.y, pos2.z - pos1.z);
    }

    static addition(pos1: VectorComponents|Vector3, pos2: VectorComponents|Vector3): Vector {
        return new Vector(pos2.x + pos1.x, pos2.y + pos1.y, pos2.z + pos1.z);
    }

    static fromVectorComponents(v?: VectorComponents|Vector3): Vector {
        return v == undefined? new Vector():new Vector(v.x, v.y, v.z)
    }

    static fromBufferAttribute(attribute: BufferAttribute , index: number): Vector {
        return new Vector().fromBufferAttribute(attribute, index);
        
    }

    static fromV3(v3: [number, number, number]): Vector {
        return new Vector(v3[0], v3[1], v3[2]);
        
    }


    static lerp(a: Vector, b: Vector, ratio: number): Vector {
      // go from a TO b / ratio
      const diff = Vector.substract(a, b);
      return new Vector(a.x + ratio* diff.x, a.y + ratio * diff.y, a.z + ratio * diff.z);

        
    }    

    toString(): string {
        return `[${this.x}, ${this.y}, ${this.z}]`;
    }

}