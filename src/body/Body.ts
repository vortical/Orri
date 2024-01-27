import { Euler, Mesh, Object3D, Quaternion, Vector3 } from 'three';
import { toRad } from '../system/geometry.ts';
import { Vec3D, Vector } from '../system/vecs.ts';
import { BodyProperties, LightProperties, TimePeriod } from './models.ts';

/**
 * G is the universal gravitational constant 
 * in exp(m,3) * exp(kg,-1) * exp(s, -2)
 */
const G: number = 6.674e-11;


/**
 * 
 * 
 * The reference plane is earths plane.
 * 
 * 
 * See https://en.wikipedia.org/wiki/Orbital_inclination
 * 
 */
function rotationFromOrbitalInclination(angleDegree: number){
    // todo, for now I consider everything is on earth orbital plane (2d...)

}

/**
 * We start the tilt aroud x axi
 * @param angleDeg 
 * @returns rotation vector based off x axis.
 */
function rotationFromAxialTilt(angleDeg: number): Vec3D{
    return new Vec3D(toRad(angleDeg),0 , 0);
    
}

// type TimePeriod = {
//     days:number,
//     hours: number,
//     minutes: number,
//     seconds: number
// };

// type MaterialProperties = {
//     name: string;
//     textureUri?: string;
//     bumpMapUri?: string;
//     normalUri?: string;
//     atmosphereUri?: string;
//     alphaUri?: string;
//     color?: string;

// }

// type LightProperties = {
//     color?:  string;
//     intensity?: number;
//     distance?: number;
//     decay?: number ;  

// }






// type BodyPayload = {
//     name: string;
//     parent?: Body;
//     mass: number;
//     radius: number;
    
//     /**
//      * position in 2D relative to parent and local to this body's orbital plane.
//      */
//     position: Vector;

//     /**
//      * position in 2D relative to parent and local to this body's oribital plane.
//      */

//     speed: Vector;
//     /**
//      * The orbital plane of this body in degrees. 
//      * 
//      * TODO: Note that this should be a quaternion in
//      * order to establish precise initial position (especially the y component) and speed vectors. For now the initial
//      * position will be at a position intersecting the parent's plane at y=0 (i.e. one of two points, depending on
//      * orientation of inclination (i.e. negative or position))
//      *  
//      */
//     orbitInclination?: number;

//     /**
//      * 
//      * TODO: This should be a euler vector (or a quaternion) to establish initial axis 
//      * direction (not just scalar angle, which leads us to establish an arbitrary axis direction). 
//      * 
//      * Obliquity to Orbit (degrees) - The angle in degrees of the axis of a body
//      * (the imaginary line running through the center of the planet from the north
//      * to south poles) is tilted relative to a line perpendicular to the planet's 
//      * orbit around its parent, with north pole defined by right hand rule.
//      * 
//      * Thus, given this right hand rule, Venus rotates in a retrograde direction, opposite
//      * the other planets, so the obliquity is almost 180 degrees and spinning with a north pole
//      * pointing "downward" (southward). 
//      * 
//      * 
//      * Uranus rotates almost on its side relative to the orbit.
//      * 
//      * Pluto is pointing slightly "down". 
//      */
//     obliquityToOrbit?: number;


//     /**
//      * Period of rotation around axis in seconds
//      * 
//      * TODO: Note this should be a quaternion or euler vector in order to determine an
//      * initial rotation value.
//      */
//     sideralRotationPeriod?: number; 
//     lightProperties?: LightProperties;
//     color?: string;
// }


// https://nssdc.gsfc.nasa.gov/planetary/planetfact.html
// https://en.wikipedia.org/wiki/Orbital_inclination

function timePeriodToMs(timePeriod: TimePeriod): number {
    const daysToMillis = (days?: number) => days? days * hoursToMillis(24) : 0
    const hoursToMillis = (hours?: number) => hours? hours * minutesToMillis(60) : 0;
    const minutesToMillis = (minutes?: number) => minutes? minutes * secondsToMillis(60): 0;
    const secondsToMillis = (seconds?: number) => seconds? seconds * 1000: 0;

    return daysToMillis(timePeriod.days) + hoursToMillis(timePeriod.hours)+minutesToMillis(timePeriod.minutes)+secondsToMillis(timePeriod.seconds);
}


class Body {
    name: string;
    parentName: string;
    parent?: Body;
    mass: number;
    /**
     * in meters
     */
    radius: number;

    /** in meters
     * 
     */
    position: Vec3D;
    // speed would be based off have orbital plane
    /**
     * in meters/s
     */
    speed: Vec3D;
    acceleration!: Vec3D;

    // rotation angle along its obliquity axis.
    sideralRotation = new Vec3D(0,0,0);
    
    // rotationQuaternion!: Quaternion; // using euler 


    orbitInclination: number;

    // tilt
    obliquityToOrbit: number; 
    
    /** time for a rotation upon axis in seconds */
    sideralRotationPeriod: number = Number.MAX_VALUE;

    lightProperties?: LightProperties;
    color: string;

    // todo: don't need this...don't want it.
    object3D!: Object3D; 
  


    
    constructor({name, parent, mass, radius, position, speed, color="lightgrey", orbitInclination=0, obliquityToOrbit=0, sideralRotationPeriod={seconds: Number.MAX_VALUE} , lightProperties}: BodyProperties) {
      this.name = name;
      this.parentName = parent;

      this.mass = mass;
      this.radius = radius;
      this.position = Vec3D.fromVector(position);
      this.speed = Vec3D.fromVector(speed);
      this.orbitInclination = orbitInclination;
      this.obliquityToOrbit = obliquityToOrbit;
      // this is seconds...
      this.sideralRotationPeriod = timePeriodToMs(sideralRotationPeriod)/1000;
      this.lightProperties = lightProperties;
      this.color = color;

    }

        // when we start, 
        // we need to have the time of the start of the simulation. Given we have the period of a body's
        // orbit
        //

        // when:
        // *  during an object' orbit around its parent body does it
        // experience northern (right hand rule) winter solstice? This is to help us 
        // This should be a modulus time (e.g 358/365). It helps us establish the orientation
        // of the axis (i.e.: around what axis to we apply the obliquityToOrbit property?). 
        // Also of note is that we need to calculate that axis based on the body's orbital plane
        // which is the same as the speed vectors.
        // 
        //* during an object's orbit does it experience apoapsis/periaps... unless we have
        //  exact speed figures for the time we start simulation.

    obliquityOrientation(): Vec3D{ 
        // this is the sumer solstice for earth cause its at (-1, 0, 0)
        return {x: 0, y: 0, z: toRad(-this.obliquityToOrbit )};       
    }

    /**
     * 
     * @param time in seconds
     * @returns 
     */
    nextSideralRotation(time: number): Vec3D {
        // todo: just use three.js vectors...
        // todo: all internal angles are to be in rads
        // we consider the rotation to be local to the body's axis

        // if()
        const yAngleIncrement = 2 * Math.PI * time / this.sideralRotationPeriod;
        return new Vec3D(this.sideralRotation.x,  (this.sideralRotation.y+yAngleIncrement) % (2 * Math.PI), this.sideralRotation.z);
        
    }
    

    /**
     * 
     * @param body 
     * @returns Distance from this body to body 
     */
    distanceTo(body: Body): Vec3D {
        return  Vec3D.substract(this.position, body.position);
    }

    /**
     *  Calculates force of body1 on body2
     * @param body1 
     * @param body2 
     */
    static twoBodyForce(body1: Body, body2: Body): Vec3D{
        const vec = body1.distanceTo(body2);
        const mag = Vec3D.magnitude(vec);

        const numerator = G * body1.mass * body2.mass;
        const denominator = Math.pow(mag, 3);

        return {
            x: (numerator * vec.x) / denominator, 
            y: (numerator * vec.y) / denominator, 
            z: (numerator * vec.z) / denominator
        };
    }

    /**
     * Calculate the accelerations vectors for body 1 and body 1. The 
     * accelerations are of opposite directions.
     * 
     * @param body1 
     * @param body2 
     * @returns 2 Accelerations: [acceleration on body1, acceleration on body2]
     */
    static twoBodyAccelerations(body1: Body, body2: Body): Map<string,Vec3D> {
        const f = Body.twoBodyForce(body1, body2);        
        return  new Map(
            [
            ["ij", {
                x: f.x / body1.mass, 
                y: f.y / body1.mass, 
                z: f.z / body1.mass}],
            ["ji", {
                x: -f.x / body2.mass,
                y: -f.y / body2.mass,
                z: -f.z / body2.mass

            }]
        ]);
    }
           

    /**
     * Calculate a speed after time delta and constant acceleration.
     * 
     * @param acc the acceleration on body 
     * @param time increment
     * @returns vo + acc * time
     */
    nextSpeed(acc: Vec3D, time: number): Vec3D {
        return {
            x: this.speed.x + acc.x * time,
            y: this.speed.y + acc.y * time,
            z: this.speed.z + acc.z * time
        };
    }

    /**
     * Calculate a position after time delta and constant acceleration.
     * 
     * @param body 
     * @param acc 
     * @param time 
     * @returns so + vo * t + a * (t * t)/2
     */
    nextPosition(acc: Vec3D, time: number): Vec3D {
        return {
            x: this.position.x + (this.speed.x * time) + (acc.x * time * time) / 2,
            y: this.position.y + (this.speed.y * time) + (acc.y * time * time) / 2,
            z: this.position.z + (this.speed.z * time) + (acc.z * time * time) / 2,              
        }
    }


    



}

export { Body, G };
export type { MaterialProperties };