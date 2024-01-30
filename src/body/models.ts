
type Vector = {
    x: number,
    y: number,
    z: number
}



type TimePeriod = {
    days?:number,
    hours?: number,
    minutes?: number,
    seconds?: number
};




type MaterialProperties = {
    name: string;
    textureUri?: string;
    bumpMapUri?: string;
    normalUri?: string;
    atmosphereUri?: string;
    alphaUri?: string;
    color?: string;


}

type LightProperties = {
    color?:  string;
    intensity?: number;
    distance?: number;
    decay?: number ;  

};


type RingProperties = {
    opacity: number;
    minRadius: number;
    maxRadius: number;

    alphaMapUri?: string;
    colorMapUri?: string;
};



type BodyProperties = {
    name: string;
    parent: string;
    mass: number;
    radius: number;
    
    /**
     * position in 2D relative to parent and local to this body's orbital plane.
     */
    position: Vector;

    /**
     * position in 2D relative to parent and local to this body's oribital plane.
     */

    speed: Vector;
    /**
     * The orbital plane of this body in degrees. 
     * 
     * TODO: Note that this should be a quaternion in
     * order to establish precise initial position (especially the y component) and speed vectors. For now the initial
     * position will be at a position intersecting the parent's plane at y=0 (i.e. one of two points, depending on
     * orientation of inclination (i.e. negative or position))
     *  
     */
    orbitInclination?: number;

    /**
     * 
     * TODO: This should be a euler vector (or a quaternion) to establish initial axis 
     * direction (not just scalar angle, which leads us to establish an arbitrary axis direction). 
     * 
     * Obliquity to Orbit (degrees) - The angle in degrees of the axis of a body
     * (the imaginary line running through the center of the planet from the north
     * to south poles) is tilted relative to a line perpendicular to the planet's 
     * orbit around its parent, with north pole defined by right hand rule.
     * 
     * Thus, given this right hand rule, Venus rotates in a retrograde direction, opposite
     * the other planets, so the obliquity is almost 180 degrees and spinning with a north pole
     * pointing "downward" (southward). 
     * 
     * 
     * Uranus rotates almost on its side relative to the orbit.
     * 
     * Pluto is pointing slightly "down". 
     */
    obliquityToOrbit?: number;


    /**
     * Period of rotation around axis in seconds
     * 
     * TODO: Note this should be a quaternion or euler vector in order to determine an
     * initial rotation value.
     */
    sideralRotationPeriod?: TimePeriod; 
    sideralRotation?: Vector,    
    lightProperties?: LightProperties;
    /**
     * Rings may be partitioned/broken into sections with different oribital periods.
     */
    rings?: RingProperties[];
    color?: string;


}


export type { RingProperties, BodyProperties, LightProperties, MaterialProperties, TimePeriod};