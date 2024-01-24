import { Vec3D } from "./vecs";

function toRad(degrees:number): number{
    return degrees * Math.PI / 180;
}



class Dim {
    w: number;
    h: number;

    constructor(w: number, h: number){
        this.w = w;
        this.h = h;
    }

    ratio(): number {
        return this.w/this.h;
    }
};

/**
 * 
 * @param angleDeg The reference is the orbital plane of the object. 
 * @returns 
 */
function rotationForObliquityToOrbit(angleDeg: number): Vec3D{
    return new Vec3D(toRad(angleDeg),0 , 0);    
}



type WindowSizeObserver = (size: Dim) => void;

export { Dim, toRad, rotationForObliquityToOrbit };
export type { WindowSizeObserver };
