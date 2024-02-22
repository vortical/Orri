

// Clean this up, this file is a heterogenous hodgepuge...

function toRad(degrees:number): number{
    return degrees * Math.PI / 180;
}



// todo: move this directly where its uses
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




// todo: get rid of this
type WindowSizeObserver = (size: Dim) => void;

export { Dim, toRad };
export type { WindowSizeObserver };
