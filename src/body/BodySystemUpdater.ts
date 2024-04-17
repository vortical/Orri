import { Clock } from "../system/Clock.ts";
import { BodyObject3D } from '../mesh/BodyObject3D.ts';


/**
 * These are invoked within the animation loop.
 * 
 * Uses are to update dynamic aspects of things in a scene such as velocities, speed ...even the clock.
 * 
 */
interface BodySystemUpdater {
    update(bodies: Map<string, BodyObject3D>, timeStepmS: number, clock: Clock): Map<string, BodyObject3D> 
    isOneTimeUpdate: boolean;
    isEnabled: boolean;
}

export type { BodySystemUpdater }