import { RenderableBody } from "../mesh/RenderableBody";
import { BodySystem } from "./BodySystem";
import * as TWEEN from '@tweenjs/tween.js';
import { Vector3 } from "three";

export type MoveIntent = 'standard' | 'reapply' | number;

export interface CameraTargetingState {

    cameraMode: CameraMode;

    moveToTarget(bodyObject3D: RenderableBody, intent?:MoveIntent): void;
    followTarget(bodyObject3D: RenderableBody): void;

    /**
     * Called after a new target is set. 
     * 
     * Some modes may want to change minimum distance based on body sizes etc...
     * 
     * @param bodyObject3D 
     */
    postTargetSet(bodyObject3D: RenderableBody): void;
    computeDesiredCameraUp(): Vector3;
}



abstract class OrbitingCameraMode implements CameraTargetingState {

    readonly CAMERA_NEAR = 2000;
    bodySystem: BodySystem;
    abstract cameraMode: CameraMode;
    max_distance_ratio: number;
    private activeOrientationTween?: TWEEN.Tween<Vector3>;
    private activePositionTween?: TWEEN.Tween<Vector3>;

    constructor(bodySystem: BodySystem, max_distance_ratio: number = 50) {
        this.bodySystem = bodySystem;
        this.max_distance_ratio = max_distance_ratio;

        if (this.bodySystem.getLocationPin()) {
            this.bodySystem.getLocationPin()!.mesh.visible = true;
        }

        if (!this.bodySystem.controls.enabled) {
            this.bodySystem.controls.enabled = true;
        }

        bodySystem.setCameraUp(this.computeDesiredCameraUp());
        this.bodySystem.setCameraNear(this.CAMERA_NEAR);
    }

    computeDesiredCameraUp(): Vector3 {
        return this.bodySystem.getBody("earth").get_orbital_plane_normal()!;
    }

    postTargetSet(bodyObject3D: RenderableBody) {
        
        this.bodySystem.controls.minDistance = this.minCameraDistance(bodyObject3D);
        this.bodySystem.setCameraNear(bodyObject3D.body.radius / 1000);
    }

    /**
     * What is the desired min distance when camera targeting a 3d body.
     * 
     * Camera at (1.5 * radius) from surface.
     * 
     * @param bodyObject3D 
     * @returns 
     */
    minCameraDistance(bodyObject3D: RenderableBody) {
        const bodyRadius = bodyObject3D.body.radius / 1000
        return bodyRadius + (1.5 * bodyRadius);
    }



    /**
     * Pretty Lerp of the camera towards the target and sets it!   * 
     * 
     * @param movetoRenderable 
     * @param force 
     * @returns 
     */

    moveToTarget(movetoRenderable: RenderableBody, intent:MoveIntent = "standard"): void {

        const bodySystem = this.bodySystem;

        const isSameTarget = bodySystem.getRenderableBodyTarget() == movetoRenderable;

        if (isSameTarget && intent === 'standard'){
          return;
        }

        this.activeOrientationTween?.stop();
        this.activePositionTween?.stop();

        bodySystem.controls.enabled = false;

        const currentTargetRenderable = bodySystem.getRenderableBodyTarget();
        const currentTargetPosition = this.bodySystem.controls.target.clone();
        const newTargetPosition = movetoRenderable.object3D.position;
        const currentCameraPosition = this.bodySystem.camera.position;
        const currentTargetVector = currentTargetPosition.clone().sub(currentCameraPosition);
        const newTargetVector = newTargetPosition.clone().sub(currentCameraPosition);
        const newTargetVectorNormal = newTargetVector.clone().normalize();

        const currentDistanceToSurface = currentTargetRenderable.cameraDistanceFromSurface();
        const maxDesirableDistance = this.max_distance_ratio * movetoRenderable.body.radius / 1000 ;
        const minAcceptableDistance = this.minCameraDistance(movetoRenderable);
        

               
        const totalDistanceToSurface = isSameTarget && typeof intent === 'number'? 
          Math.max(currentDistanceToSurface * intent, minAcceptableDistance):
          Math.max(
            Math.min(
              currentDistanceToSurface,  // 1000000 + radius
              maxDesirableDistance  // 50 times the radius 
            ), 
            minAcceptableDistance
          );
        const newCameraPos = newTargetPosition.clone().sub(newTargetVectorNormal.multiplyScalar(totalDistanceToSurface + movetoRenderable.body.radius / 1000 ));

        
        // we turn 180 degrees in 2 seconds or 1 second minimum which ever is the most


        const distanceToNewTarget = currentCameraPosition.distanceTo(movetoRenderable.object3D.position);
        // Reposition camera: travel at 1000 times the speed of light or slower for 2.5 seconds wich ever is the most.
        // Same-target dolly (zoom closer) uses a shorter minimum — no big traversal to mask.
        const minDisplacementTime = (isSameTarget && intent !== "reapply") ? 600 : 2500;
        const positionDisplacementTime = Math.max(distanceToNewTarget / 3300000, minDisplacementTime);
        const cameraPosition = new TWEEN
            .Tween(this.bodySystem.camera.position)
            .to(newCameraPos, positionDisplacementTime)
            .easing(TWEEN.Easing.Quintic.InOut);

        const onArrived = () => {
            this.bodySystem.controls.enabled = true;
            this.bodySystem.setTarget(movetoRenderable);
        };

        this.activePositionTween = cameraPosition;

        if (isSameTarget && intent !== "reapply") {
            // Camera is already pointed at the body — skip the long orientation tween, but still
            // run a parallel tracker on controls.target so it follows the body's drift during the
            // dolly. Otherwise target freezes (controls.enabled=false pauses followTarget) and
            // OrbitControls ends up with a stale reference when the user resumes orbiting.
            const targetTracker = new TWEEN
                .Tween(this.bodySystem.controls.target)
                .to(movetoRenderable.object3D.position, positionDisplacementTime)
                .dynamic(true);

            this.activeOrientationTween = targetTracker;
            targetTracker.start();
            cameraPosition.start().onComplete(onArrived);
        } else {
            // we turn 180 degrees in 2 seconds or 1 second minimum which ever is the most
            const rotationTime = Math.max(
                currentTargetVector.angleTo(newTargetVector) / Math.PI * 2000,
                1000);

            const targetOrientation = new TWEEN
                .Tween(this.bodySystem.controls.target)
                .to(movetoRenderable.object3D.position, rotationTime)
                .easing(TWEEN.Easing.Quintic.In)
                .dynamic(true);

            this.activeOrientationTween = targetOrientation;

            targetOrientation
                .chain(cameraPosition)
                .start()
                .onComplete(onArrived);
        }
    }

    abstract followTarget(bodyObject3D: RenderableBody): void;

}

export class FollowTargetCameraMode extends OrbitingCameraMode {
    cameraMode = CameraModes.FollowTarget;

    constructor(bodySystem: BodySystem) {
        super(bodySystem)
    }

    followTarget(bodyObject3D: RenderableBody): void {
        const bodySystem = this.bodySystem;

        // keep same distance...
        const cameraPosition = bodySystem.camera.position.clone();
        const target = bodySystem.controls.target.clone();
        const targetTranslation = cameraPosition.sub(target);
        bodySystem.controls.target.set(bodyObject3D.body.position.x / 1000, bodyObject3D.body.position.y / 1000, bodyObject3D.body.position.z / 1000);
        bodySystem.camera.position.set(bodySystem.controls.target.x + targetTranslation.x, bodySystem.controls.target.y + targetTranslation.y, bodySystem.controls.target.z + targetTranslation.z);
    }
}

export class LookAtTargetCameraMode extends OrbitingCameraMode {
    cameraMode = CameraModes.LookAtTarget;

    constructor(bodySystem: BodySystem) {
        super(bodySystem)
    }

    followTarget(bodyObject3D: RenderableBody): void {
        this.bodySystem.controls.target.set(bodyObject3D.body.position.x / 1000, bodyObject3D.body.position.y / 1000, bodyObject3D.body.position.z / 1000);
    }
}

export class ViewFromSurfaceLocationPinCameraMode implements CameraTargetingState {

    readonly CAMERA_NEAR = 1; // ??? because field of vue?
    bodySystem: BodySystem;
    cameraMode = CameraModes.ViewTargetFromSurface;

    constructor(bodySystem: BodySystem) {
        this.bodySystem = bodySystem;
        const pinNormal = this.bodySystem.locationPin?.getLocationPinNormal();
        this.bodySystem.locationPin!.mesh.visible = false;
        this.bodySystem.setCameraUp(pinNormal);
        this.bodySystem.setCameraNear(this.CAMERA_NEAR);
    }

    computeDesiredCameraUp(): Vector3 {
        return this.bodySystem.locationPin!.getLocationPinNormal();
    }

    postTargetSet(bodyObject3D: RenderableBody) { }

    moveToTarget(bodyObject3D: RenderableBody, intent:MoveIntent="standard") {

        const bodySystem = this.bodySystem;

        if (bodyObject3D == bodySystem.locationPin?.bodyObject3D) {
            return;
        }

        bodySystem.controls.enabled = false;

        const currentTargetPosition = bodySystem.controls.target.clone();
        const newTargetPosition = bodyObject3D.object3D.position;
        const currentCameraPosition = bodySystem.camera.position;
        const currentTargetVector = currentTargetPosition.clone().sub(currentCameraPosition);
        const newTargetVector = newTargetPosition.clone().sub(currentCameraPosition);

        // we turn 180 degrees in 2 seconds or 1 second minimum which ever is the most
        const rotationTime = Math.max(
            Math.max(currentTargetVector.angleTo(newTargetVector) / Math.PI) * 2000,
            1000);

        const targetOrientation = new TWEEN
            .Tween(bodySystem.controls.target)
            .to(bodyObject3D.object3D.position, rotationTime)
            .easing(TWEEN.Easing.Quintic.InOut)
            .dynamic(true).start()
            .onComplete(() => {
                bodySystem.controls.enabled = true;
                bodySystem.setTarget(bodyObject3D);
            });
    }

    followTarget(bodyObject3D: RenderableBody): void {
        const bodySystem = this.bodySystem;

        // body rotates, so need to adjust the up
        bodySystem.setCameraUp(this.computeDesiredCameraUp());
        const cameraPosition = bodySystem.camera.position.clone();
        const target = bodySystem.controls.target.clone();

        bodySystem.controls
        bodySystem.controls.target.set(bodyObject3D.body.position.x / 1000, bodyObject3D.body.position.y / 1000, bodyObject3D.body.position.z / 1000);
        const locationPin = bodySystem.getLocationPin();
        const locationPinPosition = locationPin!.getLocationPinWorldPosition();
        bodySystem.camera.position.set(locationPinPosition.x, locationPinPosition.y, locationPinPosition.z);
    }
}

export interface CameraModeElement {
    name: string,
    stateBuilder: (bodySystem: BodySystem) => CameraTargetingState
};

// todo: use enum for modes and a map to hold our builders
// const cameramodes = new Map<CameraMode, CameraModeElement>([
//     [LookAtTarget, ]
// ])
export const CameraModes = {
    LookAtTarget: { name: "Look At Target", stateBuilder: (bodySystem: BodySystem) => new LookAtTargetCameraMode(bodySystem) },
    FollowTarget: { name: "Follow Target", stateBuilder: (bodySystem: BodySystem) => new FollowTargetCameraMode(bodySystem) },
    ViewTargetFromSurface: { name: "View From lat,lon", stateBuilder: (bodySystem: BodySystem) => new ViewFromSurfaceLocationPinCameraMode(bodySystem) }
};

export type CameraMode = typeof CameraModes[keyof typeof CameraModes];


