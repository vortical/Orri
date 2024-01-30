import { Vector3 } from "three";
import { toRad } from "./geometry";


type Vector = {
    x: number,
    y: number,
    z?: number
}

type EulerVector = Vector | {
    inDegrees?: boolean
};

class Vec3D implements Vector {
    x: number;
    y: number;
    z: number;

    constructor(x: number, y: number, z: number=0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    static magnitude(vec: Vec3D): number {
        return Math.sqrt(vec.x * vec.x + vec.y * vec.y + vec.z * vec.z);
    }

    /**
     * 
     * @param pos1 
     * @param pos2 
     * @returns (pos2 - pos1) vector
     */
    static substract(pos1: Vec3D, pos2: Vec3D): Vec3D {
        return new Vec3D(pos2.x - pos1.x, pos2.y - pos1.y, pos2.z - pos1.z);
    }

    static add(pos1: Vec3D, pos2: Vec3D): Vec3D {
        return new Vec3D(pos2.x + pos1.x, pos2.y + pos1.y, pos2.z + pos1.z);
    }

    toVector3(): Vector3 {
        return new Vector3(this.x, this.y, this.z);
    }

    static fromVector(v: Vector): Vec3D {
        return new Vec3D(v.x, v.y, v.z);
    }

    static toRad(v: Vector): Vec3D {
        return new Vec3D(toRad(v.x), toRad(v.y), toRad(v.z));
    }
}


export type {Vector, EulerVector};
export { Vec3D };