import { Quaternion, Vector3 } from 'three';
import { toRad } from '../system/geometry.ts';
import { Vector } from '../system/vecs.ts';
import { RingProperties, BodyProperties, LightProperties, KinematicObject, BodyType, VectorComponents, MaterialProperties } from './models.ts';
import { timePeriodToMs } from '../system/timing.ts';
import { degToRad } from 'three/src/math/MathUtils.js';

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
    (timeMs: number): Vector;
}

class Body {
    type: BodyType
    name: string;

    parentName: string;
    parent?: Body;

    timeMs!: number;

    mass: number;
    /**
     * in meters
     */
    radius: number;

    castShadow: boolean;

    receiveShadow: boolean;

    /** in meters
     * 
     */
    position!: Vector;

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
    velocity!: Vector;

    acceleration!: Vector;

    // rotation angle along its obliquity axis.
    sideralRotation!: Vector;

    // rotationQuaternion!: Quaternion; // using euler 


    orbitInclination: number;

    // tilt
    obliquityToOrbit: number;

    /** time for a sideral rotation upon axis*/
    sideralRotationPeriodMs: number; // = Number.MAX_VALUE;

    lightProperties?: LightProperties;
    rings?: RingProperties[];
    color: string;

    kinematics!: KinematicObject;
    textures: MaterialProperties;


    constructor({ type, name, parent, mass, radius, castShadow = false, receiveShadow = false, position, velocity, color = "lightgrey", orbitInclination = 0, obliquityToOrbit = 0, sideralRotationPeriod = { seconds: Number.MAX_VALUE }, lightProperties, rings, textures }: BodyProperties) {
        this.type = type;
        this.name = name;
        this.parentName = parent;

        this.mass = mass;
        this.radius = radius;
        this.castShadow = castShadow;
        this.receiveShadow = receiveShadow;

        this.position = Vector.fromVectorComponents(position)
        this.velocity = Vector.fromVectorComponents(velocity)
        this.orbitInclination = orbitInclination;
        this.obliquityToOrbit = obliquityToOrbit;

        this.sideralRotationPeriodMs = timePeriodToMs(sideralRotationPeriod);
        this.lightProperties = lightProperties;
        this.rings = rings;
        this.color = color;
        this.textures = textures;
    }

    /**
     * @returns The normal to the body's oribital plane (e.g. for earth this is the ecliptic plane)
     */
    get_orbital_plane_normal(): Vector | undefined {
        if (!this.parent) {
            return undefined;
        }

        const parent = this.parent;
        const rel_pos = Vector.substract(parent.position, this.position);
        const rel_vel = Vector.substract(parent.velocity, this.velocity);
        return new Vector().crossVectors(rel_pos, rel_vel).normalize();
    }

    getAxisDirection(): Vector {

        // If an axis was given, then we honor it else we calculate an arbitrary one
        // based on the obliquity and orbital plane. This will result in a realistic
        // axis angle but will not necessarily match the orientation (at the clock time).
        if (this.axisDirection !== undefined) {
            return this.axisDirection;
        }
        // Tilt the body using the body's obliquity 
        const up = new Vector(0, 1, 0).applyQuaternion(this.obliquityOrientation());

        // Another tilt, this one to match the body's orbital plane.
        const body_orbital_norm = this.get_orbital_plane_normal() || new Vector(0, 1, 0);
        return up.applyQuaternion(new Quaternion().setFromUnitVectors(new Vector(0, 1, 0), body_orbital_norm));
    }

    getKinematics(): KinematicObject {
        return this.kinematics;
    }

    setKinematics(kinematics: KinematicObject) {
        this.kinematics = kinematics;

        const baseTimeMs = kinematics.datetime.getTime()

        const baseRotation = toRad(kinematics.axis?.rotation || 0);

        this.axisDirection = kinematics.axis?.direction ? Vector.fromVectorComponents(kinematics.axis.direction) : undefined;

        this.velocity = Vector.fromVectorComponents(kinematics.velocity);
        this.position = Vector.fromVectorComponents(kinematics.position);

        this.rotationAtTime = function (periodMs: number) {
            return (timeMs: number) => {
                const PI_2 = 2 * Math.PI;
                return new Vector(0, (baseRotation + (PI_2 * (timeMs - baseTimeMs) / periodMs)) % PI_2, 0);
            }
        }(this.sideralRotationPeriodMs);
    }

    obliquityOrientation(): Quaternion {
        return new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), degToRad(-this.obliquityToOrbit));

    }

    /**
     * 
     * A 'planetary system' is a planet with its moons. E.g. Earth planetary system is set
     * of bodies that include Moon and Earth.
     * 
     * 
     * @returns Planetary System this body belongs to.
     */
    planetarySystem(): Body {
        switch (this.type) {
            case "planet":
                return this;
            case "star":
                return this;
            case "moon":
                return this.parent!;
        }
    }

    /**
     * 
     * @param body 
     * @returns Distance from this body to body 
     */
    distanceTo(body: Body): Vector {
        return Vector.substract(this.position, body.position);
    }

    /**
     *  Calculates force of body1 on body2
     * @param body1 
     * @param body2 
     */
    static twoBodyForce(body1: Body, body2: Body): Vector {
        const vec = body1.distanceTo(body2);
        const mag = vec.magnitude();

        const numerator = G * body1.mass * body2.mass;
        const denominator = Math.pow(mag, 3);

        return new Vector(
            (numerator * vec.x) / denominator,
            (numerator * vec.y) / denominator,
            (numerator * vec.z) / denominator
        );
    }

    /**
     * Calculate the accelerations vectors for body 1 and body 1. The 
     * accelerations are of opposite directions.
     * 
     * @param body1 
     * @param body2 
     * @returns 2 Accelerations: [acceleration on body1, acceleration on body2]
     */
    static twoBodyAccelerations(body1: Body, body2: Body): Map<string, Vector> {
        const f = Body.twoBodyForce(body1, body2);
        return new Map(
            [
                ["ij", new Vector(f.x / body1.mass, f.y / body1.mass, f.z / body1.mass)],
                ["ji", new Vector(-f.x / body2.mass, -f.y / body2.mass, -f.z / body2.mass)]
            ]);
    }


    /**
     * Calculate a speed after time delta and constant acceleration.
     * 
     * @param acc the acceleration on body 
     * @param time increment
     * @returns vo + acc * time
     */
    nextSpeed(acc: VectorComponents, time: number): Vector {
        return new Vector(
            this.velocity.x + acc.x * time,
            this.velocity.y + acc.y * time,
            this.velocity.z + acc.z * time
        );
    }

    /**
     * Calculate a position after time delta and constant acceleration.
     * 
     * @param body 
     * @param acc 
     * @param time 
     * @returns so + vo * t + a * (t * t)/2
     */
    nextPosition(acc: VectorComponents, time: number): Vector {
        return new Vector(
            this.position.x + (this.velocity.x * time) + (acc.x * time * time) / 2,
            this.position.y + (this.velocity.y * time) + (acc.y * time * time) / 2,
            this.position.z + (this.velocity.z * time) + (acc.z * time * time) / 2,
        );
    }
}

export { Body, G };