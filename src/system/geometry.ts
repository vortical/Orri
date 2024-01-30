
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




type WindowSizeObserver = (size: Dim) => void;

export { Dim, toRad };
export type { WindowSizeObserver };
