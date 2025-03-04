import { BufferAttribute, Vector3 } from "three";
import { VectorComponents } from "../domain/models.ts";


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

    toString(): string {
        return `[${this.x}, ${this.y}, ${this.z}]`;
    }

}