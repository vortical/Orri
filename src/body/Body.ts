import { Mesh } from 'three';
import { toRad } from '../system/geometry.ts';
import { Vec3D } from '../system/vecs.ts';

/**
 * G is the universal gravitational constant 
 * in exp(m,3) * exp(kg,-1) * exp(s, -2)
 */
const G: number = 6.674e-11;



// {
//     "id": 3,
//     "name": "Earth",
//     "diameter": 12756,
//     "mass": 5.97,
//     "gravity": 9.8,
//     "density": 5514,
//     "rotationPeriod": 23.9,
//     "lengthOfDay": 24,
//     "distanceFromParent": 149600000,
//     "orbitalPeriod": 365.2,
//     "orbitalVelocity": 29.8,
//     "orbitalInclination": 0,
//     "axialTilt": 23.4,
//     "orbitPositionOffset": 0,
//     "meanTemperature": 15,
//     "surfaceTemps": {
//         "min": 185,
//         "mean": 288,
//         "max": 331
//     },
//     "rings": false,
//     "satellites": [

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

interface MaterialProperties {
    name: string;
    textureUri?: string;
    bumpMapUri?: string;
    normalUri?: string;
    atmosphereUri?: string;
    alphaUri?: string;
    color?: string;

}

interface LightProperties {
    color?:  string;
    intensity?: number;
    distance?: number;
    decay?: number ;  

}

interface BodyArguments {
    name: string;
    mass: number;
    radius: number;
    position: Vec3D;
    speed: Vec3D;
    orbitInclination?: number;
    obliquityToOrbit?: number;
    /**
     * Period of rotation around axis in seconds
     */
    sideralRotationPeriod?: number; 
    lightProperties?: LightProperties;
    color?: string;
}


// https://nssdc.gsfc.nasa.gov/planetary/planetfact.html
// https://en.wikipedia.org/wiki/Orbital_inclination

class Body {
    name: string;
    mass: number;
    radius: number;
    position: Vec3D;
    // speed would be based off have orbital plane
    speed: Vec3D;
    // color: string;
    orbitInclination: number;
    obliquityToOrbit: number; 
    sideralRotationPeriod: number;
    acceleration: number;

    lightProperties?: LightProperties;
    color: string;

    mesh: Mesh; 
  


    constructor({name, mass, radius, position, speed, color="lightgrey", orbitInclination=0, obliquityToOrbit=0, sideralRotationPeriod=0, lightProperties}: BodyArguments) {
      this.name = name;
      this.mass = mass;
      this.radius = radius;
      this.position = position;
      this.speed = speed;
      this.orbitInclination = orbitInclination;
      this.obliquityToOrbit = obliquityToOrbit;
      this.sideralRotationPeriod = sideralRotationPeriod;
    //   this.color = color;
      this.acceleration = 0;
      this.lightProperties = lightProperties;
      this.color = color;

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