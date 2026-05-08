import { TimeMark } from "../system/Clock.ts";
import { BodyObject3D } from '../mesh/BodyObject3D.ts';
import { VectorComponents } from "../domain/models.ts";
import { Body } from "./Body";



export interface BodyFrame {
  bodies: Body[];
  positions_i1: VectorComponents[];  
}

export interface FrameListener {
  onFrame(frame: BodyFrame, timestep: number, stepTimeMs: number): void;
}

export interface BodyIntegrator {

  invalidate(): void;
  computeFrame(bodies: Body[], timestepMs: number, stepTimeMs: number): BodyFrame;
}



export abstract class BaseBodyIntegrator implements BodyIntegrator {
  protected isInvalidated = false;


  invalidate(): void {
    this.isInvalidated = true;
  }

 
  abstract computeFrame(bodies: Body[], timestepMs: number, stepTimeMs: number): BodyFrame;
}



// class BarnesHutBodyIntegrator extends BaseBodyIntegrator {
//   invalidate(): void { ... }

//   computeFrame(bodies: Body[], timestepMs: number, stepTimeMs: number): BodyFrame {
//     // ... barnes-hut integration ...
//     this.notifyListeners(frame, timestepMs, stepTimeMs);
//     return frame;
//   }
// }



// class VerletBodyIntegrator implements BodyIntegrator { ... }
// class BarnesHutBodyIntegrator implements BodyIntegrator { ... }

/**
 * Updaters are invoked within the animation loop. The role of a BodySystemUpdater
 * is to set the properties of each body based on the time.  
 */
export interface BodySystemUpdater {
    update(bodies: BodyObject3D[], timeMark: TimeMark, doInvalidate: boolean): void;
    isOneTimeUpdate: boolean;
    isEnabled: boolean;
}export type IntegratorLoopParam = {
  iterations: number;
  timestep: number;
};

