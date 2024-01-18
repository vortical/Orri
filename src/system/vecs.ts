
class Vec3D {
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

    scalarMultiplication(value)
    
}

class Vec2D {
    x: number;
    y: number;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    static magnitude(vec: Vec2D): number {
        return Math.sqrt(vec.x * vec.x + vec.y * vec.y);
    }

    /**
     * 
     * @param pos1 
     * @param pos2 
     * @returns (pos2 - pos1) vector
     */
    static substract(pos1: Vec2D, pos2: Vec2D): Vec2D {
        return new Vec2D(pos2.x - pos1.x, pos2.y - pos1.y);
    }

}

export { Vec2D, Vec3D };