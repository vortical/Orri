import { Euler, Mesh, Object3D, Quaternion, Vector3 } from 'three';
import { toRad } from '../system/geometry.ts';
import { Vec3D, Vector } from '../system/vecs.ts';
import { RingProperties, BodyProperties, LightProperties, TimePeriod, KinematicObject } from './models.ts';
import { TimeUnit, timePeriodToMs, timePeriodToUnits } from '../system/timing.ts';
import { degToRad } from 'three/src/math/MathUtils.js';
import { KnotCurve } from 'three/examples/jsm/curves/CurveExtras.js';

/**
 * G is the universal gravitational constant 
 * in exp(m,3) * exp(kg,-1) * exp(s, -2)
 */
const G: number = 6.674e-11;



/**
 * Avoid error accumulation, use a base time and rotation for anything with
 * a constant period.
 */


interface RotationCalculator {
    (timeMs: number): Vec3D;
}






class Body {
    name: string;
    parentName: string;
    parent?: Body;

    timeMs!: number;

    mass: number;
    /**
     * in meters
     */
    radius: number;

    /** in meters
     * 
     */
    position!: Vec3D;
    
    /**
     * angle of rotation around its axis (i.e. its time of day)
     * rename to sideralRotation
     */
    rotation!: number;

    axisDirection?: Vector;

    rotationAtTime!: RotationCalculator;
    /**
     * in meters/s
     */
    velocity!: Vec3D;

    acceleration!: Vec3D;

    // rotation angle along its obliquity axis.
    sideralRotation: Vec3D;
    
    // rotationQuaternion!: Quaternion; // using euler 


    orbitInclination: number;

    // tilt
    obliquityToOrbit: number; 
    
    /** time for a sideral rotation upon axis*/
    sideralRotationPeriodMs: number; // = Number.MAX_VALUE;

    lightProperties?: LightProperties;
    rings?: RingProperties[];
    color: string;

    // todo: don't need this...don't want it.
    object3D!: Object3D; 
  

    
    constructor({name, parent, mass, radius, position, velocity, color="lightgrey", orbitInclination=0, 
                obliquityToOrbit=0, sideralRotationPeriod={seconds: Number.MAX_VALUE}, lightProperties,
                rings}: BodyProperties) {
      this.name = name;
      this.parentName = parent;

      this.mass = mass;
      this.radius = radius;
      this.position = Vec3D.fromVector(position)
      this.velocity = Vec3D.fromVector(velocity)
      this.orbitInclination = orbitInclination;
      this.obliquityToOrbit = obliquityToOrbit;
      
      this.sideralRotationPeriodMs = timePeriodToMs(sideralRotationPeriod);
      this.lightProperties = lightProperties;
      this.rings = rings;
      this.color = color;

    }

    /**
     * @returns The normal to the body's oribital plane (e.g. for earth this is the ecliptic plane)
     */
    get_orbital_plane_normal(){

        if (!this.parent){
            // we consider the plane to be based on an orbit around some parent
            // but we could infer the plane with two velocity vectors...
            return undefined;
        }

        const parent = this.parent;
        const parent_position = parent.position.toVector3();
        const parent_velocity = parent.velocity.toVector3();
  
        const this_position = this.position.toVector3();
        const this_velocity = this.velocity.toVector3();
  
        // a- b
        const rel_pos = new Vector3().subVectors(this_position, parent_position)
        const rel_vel = new Vector3().subVectors(this_velocity, parent_velocity);
  
        const cross = new Vector3().crossVectors(rel_pos, rel_vel)
        const plane_norm = cross.normalize();
        return plane_norm;
    }
  
  
    // kinematics should probably include sideral rotation period and sideral rotation angle
    setKinematics(kinematics: KinematicObject){

        const baseTimeMs = kinematics.datetime.getTime()

        const baseRotation = toRad(kinematics.axis?.rotation || 0) ;

        this.axisDirection = kinematics.axis?.direction;

        this.velocity = Vec3D.fromVector(kinematics.velocity);
        this.position = Vec3D.fromVector(kinematics.position);
        
        this.rotationAtTime = function(periodMs: number) {
            return (timeMs: number) => {
                const PI_2 = 2 * Math.PI;

                return new Vec3D(0, (baseRotation + (PI_2 * (timeMs - baseTimeMs)/periodMs) ) % PI_2,0);
            }
        }(this.sideralRotationPeriodMs);
    }

    obliquityOrientation(): Quaternion { 
        return new Quaternion().setFromAxisAngle(new Vector3(0,0,1), degToRad(-this.obliquityToOrbit));
        
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
            x: this.velocity.x + acc.x * time,
            y: this.velocity.y + acc.y * time,
            z: this.velocity.z + acc.z * time
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
            x: this.position.x + (this.velocity.x * time) + (acc.x * time * time) / 2,
            y: this.position.y + (this.velocity.y * time) + (acc.y * time * time) / 2,
            z: this.position.z + (this.velocity.z * time) + (acc.z * time * time) / 2,              
        }
    }
}

export { Body, G };
// export type { MaterialProperties };