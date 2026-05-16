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
    private activePositionTween?: TWEEN.Tween<any>;

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
        const min =   this.minCameraDistance(bodyObject3D);
        this.bodySystem.controls.minDistance = min;
      
        this.bodySystem.setCameraNear(min);
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
        const newTargetPosition = movetoRenderable.object3D.position;  // live reference
        const currentCameraPosition = this.bodySystem.camera.position;
        const currentTargetVector = currentTargetPosition.clone().sub(currentCameraPosition);
        const newTargetVector = newTargetPosition.clone().sub(currentCameraPosition);

        const bodyRadiusKm = movetoRenderable.body.radius / 1000;
        const currentDistanceToSurface = currentTargetRenderable.cameraDistanceFromSurface();
        const maxDesirableDistance = this.max_distance_ratio * bodyRadiusKm;
        // minCameraDistance() is a from-CENTER distance; currentDistanceToSurface and
        // totalDistanceToSurface are to-SURFACE — subtract the radius so the floor is
        // a consistent to-surface value (endDistanceFromCenter adds it back below).
        const minAcceptableDistance = this.minCameraDistance(movetoRenderable) - bodyRadiusKm;

        const totalDistanceToSurface = isSameTarget && typeof intent === 'number'?
          Math.max(currentDistanceToSurface * intent, minAcceptableDistance):
          Math.max(
            Math.min(
              currentDistanceToSurface,
              maxDesirableDistance
            ),
            minAcceptableDistance
          );
        const endDistanceFromCenter = totalDistanceToSurface + bodyRadiusKm;

        const distanceToNewTarget = currentCameraPosition.distanceTo(newTargetPosition);
        const minDisplacementTime = (isSameTarget && intent !== "reapply") ? 600 : 2500;
        const positionDisplacementTime = Math.max(distanceToNewTarget / 3300000, minDisplacementTime);

        // Body-tracked dolly: each frame, re-anchor the camera to the body's CURRENT
        // position (via the live `newTargetPosition` reference) rather than the absolute
        // point computed at click time. Critical for small fast-moving bodies (e.g. Deimos
        // at high time scale) where the body moves thousands of km during the tween.
        //
        // approachDir/startDistanceFromCenter are captured synchronously HERE (click time),
        // consistent with currentDistanceToSurface/endDistanceFromCenter. Capturing them in
        // onStart instead would read state one frame later — by which point the body has
        // drifted but the camera is frozen (controls.enabled=false pauses followTarget),
        // giving a stale relationship that springs the camera on each click. The cross-body
        // case re-captures in onStart below, because there the dolly genuinely begins after
        // the orientation tween has run.
        let approachDir = currentCameraPosition.clone().sub(newTargetPosition).normalize();
        let startDistanceFromCenter = currentCameraPosition.distanceTo(newTargetPosition);
        // Same-target zoom wants an immediate response (Out easing starts fast). Cross-body
        // dolly comes AFTER the orientation tween, so a gentler InOut feels better there.
        const easingFn = (isSameTarget && intent !== "reapply")
            ? TWEEN.Easing.Quartic.Out
            : TWEEN.Easing.Quintic.InOut;
        const cameraPosition = new TWEEN
            .Tween({ p: 0 })
            .to({ p: 1 }, positionDisplacementTime)
            .easing(easingFn)
            .onUpdate((obj) => {
                const currentDistance = startDistanceFromCenter + (endDistanceFromCenter - startDistanceFromCenter) * obj.p;
                this.bodySystem.camera.position.copy(newTargetPosition).addScaledVector(approachDir, currentDistance);
                // Pin controls.target to the body's live position so the view direction
                // stays radial (camera→body) even when the body moves fast. Replaces the
                // parallel targetTracker tween which lagged behind the body's motion.
                this.bodySystem.controls.target.copy(newTargetPosition);
                // OrbitControls.update() ran earlier this frame and called camera.lookAt()
                // against the PREVIOUS frame's target — re-aim now so the rendered frame
                // shows position + orientation consistent with the body's current location.
                this.bodySystem.camera.lookAt(this.bodySystem.controls.target);
            });

        const onArrived = () => {
            this.bodySystem.controls.enabled = true;
            this.bodySystem.setTarget(movetoRenderable);
        };

        this.activePositionTween = cameraPosition;

        if (isSameTarget && intent !== "reapply") {
            // Camera is already pointed at the body — skip the orientation tween entirely.
            // The cameraPosition tween's onUpdate pins controls.target to the live body
            // position each frame, so OrbitControls has a fresh reference throughout.
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

            // The dolly begins only after the orientation tween finishes — by then the
            // body has drifted, so re-measure the camera↔body relationship at that point.
            cameraPosition.onStart(() => {
                approachDir = this.bodySystem.camera.position.clone().sub(newTargetPosition).normalize();
                startDistanceFromCenter = this.bodySystem.camera.position.distanceTo(newTargetPosition);
            });

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


