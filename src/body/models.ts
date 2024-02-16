
type Vector = {
    x: number,
    y: number,
    z: number
}


interface Axis {
    rotation: number
    //ICRS vector of the axis, body spins around this axis
    direction: Vector
}

interface KinematicObject {
    name: string;
    axis?: Axis,
    velocity: Vector
    position: Vector;
    datetime: Date;
  }


type TimePeriod = {
    days?:number
    hours?: number
    minutes?: number
    seconds?: number
    millis?: number
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
    position?: Vector;
    velocity?: Vector;
    
    /**
     * The orbital plane of this body in degrees. 
     * Note: Not USED, we calculate this based on velocities.
     */
    orbitInclination?: number;

    /**
     * 
     * 
     * Obliquity to Orbit (degrees) - The angle in degrees of the axis of a body
     * (the imaginary line running through the center of the planet from the north
     * to south poles) is tilted relative to a line perpendicular to the planet's 
     * orbit around its parent (orbital plane), with north pole defined by right hand rule.
     *  
     * This inclination defines is the equatorial plane
     * 
     * We only use this value to calculate a tilt an axis direction (in 3D) is not given
     */
    obliquityToOrbit?: number;


    /**
     * Period of rotation around axis in seconds
     */
    sideralRotationPeriod?: TimePeriod; 
    sideralRotation?: Vector,    
    lightProperties?: LightProperties;
    /**
     * Rings may be partitioned/broken into sections with different oribital periods..
     */
    rings?: RingProperties[];
    color?: string;


}


export type { RingProperties, BodyProperties, LightProperties, MaterialProperties, KinematicObject, TimePeriod};