import { Quaternion, Vector3 } from 'three';
import { toRad } from '../system/geometry.ts';
import { Vector } from '../system/Vector.ts';
import { RingProperties, BodyProperties, LightProperties, KinematicObject, BodyType, VectorComponents, MaterialProperties, GLTFModelProperties, TimePeriod, MissionWindow, Vec3, Ephemeris } from '../domain/models.ts';
import { timePeriodToMs } from '../system/time.ts';
import { degToRad } from 'three/src/math/MathUtils.js';
import { BODY_ACTIVE_TOPIC } from '../system/event-types.ts';

/**
 * G is the universal gravitational constant 
 */
const G: number = 6.674e-11;

interface RotationCalculator {
    (timeMs: number): Vector;
}



// export  function handleActivityTransitions(bodies: Body[], timeMs: number, timestep: number): boolean{
//     for(const body of bodies){
//       const shouldBeActive = body.isActiveAt(timeMs);
//       if(body.isActive() == shouldBeActive) continue;
//       // body is not active yet!

//       if(shouldBeActive){
//         const missionWindow = body.missionWindow;
//         // use SpaceCracftTrajectoryUpdater hermit sample.
//         if(missionWindow){
//           if(timestep >= 0 && missionWindow.startKinematics){
//             body.setKinematics(missionWindow.startKinematics);
//           } else if(timestep < 0 && missionWindow.endKinematics){
//             body.setKinematics(missionWindow.endKinematics);
//           }
//         }
//         body.setIsActive(true);
//       } else {
//         body.setIsActive(false);
//       }

//       PubSub.publish(BODY_ACTIVE_TOPIC, {body: body, isActive: shouldBeActive});
//       return true;
//       // this.gravAccelerations = undefined;
//     }
//     return false;
//   }

/**
 * Represents the non 3D characteristics of a body: position, speed, mass, axis tilt, rotation period etc...
 * 
 */


interface GravitationalMass {
  position: VectorComponents;
  mass: number;
}

export class Body {
    type: BodyType
    name: string;
    parentName: string;
    parent?: Body;
    mass: number;
    /**
     * in meters
     */
    radius: number;
    castShadow?: boolean;
    receiveShadow?: boolean;

    /** 
     * in meters
     */
    position: Vector;

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
    velocity: Vector;
    acceleration?: Vector;

    // rotation angle along its obliquity axis.
    sideralRotation!: Vector;

    // tilt
    obliquityToOrbit: number;

    /** time for a sideral rotation upon axis*/
    sideralRotationPeriodMs: number; // = Number.MAX_VALUE;
    orbitPeriod?: TimePeriod;
    lightProperties?: LightProperties;
    rings?: RingProperties;
    color: string;
    // things that change: speeds, postitions, axis directions...
    kinematics?: KinematicObject;
    textures?: MaterialProperties;
    gltf?: GLTFModelProperties;
    missionWindow?: MissionWindow;
    useTrajectory: boolean = false;

    _isActive: boolean = true;

    constructor({ type, name, parentName, mass, radius, castShadow = false, receiveShadow = false, position, velocity, color = "lightgrey", obliquityToOrbit = 0, sideralRotationPeriod = { seconds: Number.MAX_VALUE }, orbitPeriod, lightProperties, rings, textures, gltf, missionWindow }: BodyProperties) {
        this.type = type;
        this.name = name;
        this.parentName = parentName;
        this.mass = mass;
        this.radius = radius;
        this.castShadow = castShadow;
        this.receiveShadow = receiveShadow;
        this.position = Vector.fromVectorComponents(position)
        this.velocity = Vector.fromVectorComponents(velocity)
        this.obliquityToOrbit = obliquityToOrbit;
        this.sideralRotationPeriodMs = timePeriodToMs(sideralRotationPeriod);
        this.orbitPeriod = orbitPeriod;
        this.lightProperties = lightProperties;
        this.rings = rings;
        this.color = color;
        this.textures = textures;
        this.gltf = gltf;
        this.missionWindow = missionWindow;

    }


    isActive(): boolean {
      return this._isActive;
    }

    setIsActive(value: boolean){
      this._isActive = value;
    }

    isActiveAt(timeMs: number): boolean {
      if(this.missionWindow){
        return this.missionWindow.startMs <= timeMs && this.missionWindow.endMs >= timeMs;
      }
      return true;
    }


    getActiveBurnAcceleration(timeMs: number): VectorComponents | undefined {
      const burns = this.missionWindow?.burnEvents;
      if (!burns) return undefined;
      const burn = burns.find(b => b.startMs <= timeMs && b.endMs > timeMs);
      if (!burn) return undefined;
      const elapsedTimeMs = timeMs - burn.startMs;
      const idx = Math.floor(elapsedTimeMs / 60000);
      
      if (idx >= burn.accelerations.length - 1) {
        return burn.accelerations[burn.accelerations.length - 1];
      }


      // Linear interpolation between adjacent samples
      const t = (elapsedTimeMs % 60000) / 60000;  // 0..1 within the current minute
      const a0 = burn.accelerations[idx];
      const a1 = burn.accelerations[idx + 1];


      return {     
        x: a0.x + t * (a1.x - a0.x),
        y: a0.y + t * (a1.y - a0.y),
        z: a0.z + t * (a1.z - a0.z)
      }
    }


    
    getBodyProperties(): BodyProperties {
        return {
            type: this.type,
            name: this.name,
            mass: this.mass,
            radius: this.radius,
            position: this.position,        
            velocity: this.velocity,
            parentName: this.parentName,
            orbitPeriod: this.orbitPeriod,
            // needsOrbit: sourceBodyObject.body.type == "planet"|| sourceBodyObject.body.type  == "star"
            missionWindow: this.missionWindow,

        } as BodyProperties;
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

    /**
     * If this body had an axisDirection provided, then we simply return it.
     * 
     * If not, then we calculate an arbitrary one based on the obliquity and orbital
     * plane. This will result in a realistic axis angle but will not necessarily match 
     * the orientation (at the clock time).
     * @returns 
     */
    getAxisDirection(): Vector {
        if (this.axisDirection !== undefined) {
            return this.axisDirection;
        }
        // Tilt the body using the body's obliquity 
        const up = new Vector(0, 1, 0).applyQuaternion(this.obliquityOrientation());

        // Another tilt, this one to match the body's orbital plane.
        const body_orbital_norm = this.get_orbital_plane_normal() || new Vector(0, 1, 0);
        return up.applyQuaternion(new Quaternion().setFromUnitVectors(new Vector(0, 1, 0), body_orbital_norm));
    }

    getKinematics(): KinematicObject | undefined {
        return this.kinematics;
    }

    /**
     * Reset a body's velocity, position, rotation.
     * @param kinematics 
     */
    setKinematics(kinematics: KinematicObject | undefined) {
        this.kinematics = kinematics;
        if(kinematics == undefined) {
          return;
        }

        const baseTimeMs = kinematics.datetime.getTime()
        const baseRotation = toRad(kinematics.axis?.rotation || 0);

        this.axisDirection = kinematics.axis?.direction ? Vector.fromVectorComponents(kinematics.axis.direction) : undefined;
        this.velocity = Vector.fromVectorComponents(kinematics.ephemeris?.velocity);
        this.position = Vector.fromVectorComponents(kinematics.ephemeris?.position);

        // RotationCalculator; rotation are calculated from:
        //  baseRotation,
        //  rotation period, and 
        //  time delta since baseRotation.
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
     * A 'planetary system' is a planet with its moons. E.g. Earth planetary system is set
     * of bodies that include Moon and Earth.
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
            case "spacecraft":
                return this.parent!;
            default:
              return this;
        }
    }

    
    /**
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
    static twoBodyForce(body1: GravitationalMass, body2: GravitationalMass): Vector {
        const vec = Vector.substract(body1.position, body2.position);
        const mag = vec.magnitude();

        const numerator = G * body1.mass * body2.mass;
        const denominator = mag * mag * mag;

        return new Vector(
            (numerator * vec.x) / denominator,
            (numerator * vec.y) / denominator,
            (numerator * vec.z) / denominator
        );
    }

    /**
     * 
     *  @returns acceleration on body1
     */
    static twoBodyAcceleration(body1: GravitationalMass, body2: GravitationalMass):Vector {
        const f = Body.twoBodyForce(body1, body2);
        return new Vector(f.x / body1.mass, f.y / body1.mass, f.z / body1.mass);
    }

    /**
     * Calculate the accelerations vectors for body 1 and body 1. The 
     * accelerations are of opposite directions.
     * 
     * @param body1 
     * @param body2 
     * @returns 2 Accelerations: [acceleration on body1, acceleration on body2]
     */
    static twoBodyAccelerations(body1: GravitationalMass, body2: GravitationalMass): Map<string, Vector> {
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
        const time2 = (time * time) / 2;
        return new Vector(
            this.position.x + (this.velocity.x * time) + (acc.x * time2),
            this.position.y + (this.velocity.y * time) + (acc.y * time2),
            this.position.z + (this.velocity.z * time) + (acc.z * time2),
        );
    }


    nextPositionEuler(vel: VectorComponents, dt: number): Vector {
      return new Vector(
        this.position.x + vel.x * dt,
        this.position.y + vel.y * dt,
        this.position.z + vel.z * dt
      );
    }
    
  /**
   * Hermite cubic interpolation between two trajectory points.
   *
   * Returns interpolated [position, velocity] at time `t`, or undefined if `t` falls
   * outside the trajectory's covered range.
   */
  hermiteInterpolate(timeMs: number): Ephemeris| undefined {
    const trajectory = this.missionWindow?.trajectory;
    if(trajectory == undefined) return undefined;

    const last = trajectory.length - 1;

    if (timeMs < trajectory[0].timeMs || timeMs > trajectory[last].timeMs) return undefined;

    const span = trajectory[1].timeMs - trajectory[0].timeMs;
    let idx = Math.floor((timeMs - trajectory[0].timeMs) / span);
    if (idx < 0) idx = 0;
    if (idx > last - 1) idx = last - 1;

    const a = trajectory[idx];
    const b = trajectory[idx + 1];

    const dtMs = b.timeMs - a.timeMs;
    const dt = dtMs / 1000; // seconds — velocities are m/s
    const s = (timeMs - a.timeMs) / dtMs;

    const s2 = s * s;
    const s3 = s2 * s;

    const h00 = 2 * s3 - 3 * s2 + 1;
    const h10 = s3 - 2 * s2 + s;
    const h01 = -2 * s3 + 3 * s2;
    const h11 = s3 - s2;

    // dp/dt = (1/dt) * dp/ds
    const dh00 = (6 * s2 - 6 * s) / dt;
    const dh10 = 3 * s2 - 4 * s + 1;
    const dh01 = (-6 * s2 + 6 * s) / dt;
    const dh11 = 3 * s2 - 2 * s;

    const p: Vec3 = [0, 0, 0];
    const v: Vec3 = [0, 0, 0];
    for (let i = 0; i < 3; i++) {
      p[i] = h00 * a.position[i] + h10 * dt * a.velocity[i] + h01 * b.position[i] + h11 * dt * b.velocity[i];
      v[i] = dh00 * a.position[i] + dh10 * a.velocity[i] + dh01 * b.position[i] + dh11 * b.velocity[i];
    }

    return {position: Vector.fromV3(p), velocity: Vector.fromV3(v)};
  }


}

// export type PlanetarySystem = Body;