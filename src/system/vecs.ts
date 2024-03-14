import { Vector3 } from "three";
import { toRad } from "./geometry";
import { VectorComponents } from "../domain/models.ts";


/**
 * We just wrap the three.js Vector. 
 */
class Vector extends Vector3 implements VectorComponents {


    magnitude(): number {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }

    /**
     * TODO: three js does pos1 - pos2. Use the three.js substract
     * 
     * @param pos1 
     * @param pos2 
     * @returns (pos2 - pos1) vector
     */
    static substract(pos1: VectorComponents, pos2: VectorComponents): Vector {
        return new Vector(pos2.x - pos1.x, pos2.y - pos1.y, pos2.z - pos1.z);
    }

    static addition(pos1: VectorComponents, pos2: VectorComponents): Vector {
        return new Vector(pos2.x + pos1.x, pos2.y + pos1.y, pos2.z + pos1.z);
    }


    static fromVectorComponents(v?: VectorComponents): Vector {
        return v == undefined? new Vector():new Vector(v.x, v.y, v.z)
    }
}


export { Vector };