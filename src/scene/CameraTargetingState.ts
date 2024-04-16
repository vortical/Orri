import { BodyObject3D } from "../mesh/BodyObject3D";
import { BodySystem } from "./BodySystem";
import * as TWEEN from '@tweenjs/tween.js';
import { Vector3 } from "three";


export interface CameraTargetingState {

    cameraMode: CameraMode;

    moveToTarget(bodyObject3D: BodyObject3D, force: boolean): void;
    followTarget(bodyObject3D: BodyObject3D): void;

    /**
     * Called after a new target is set. 
     * 
     * Some modes may want to change minimum distance based on body sizes etc...
     * 
     * @param bodyObject3D 
     */
    postTargetSet(bodyObject3D: BodyObject3D): void;
    computeDesiredCameraUp(): Vector3;
}



abstract class OrbitingCameraMode implements CameraTargetingState {

    readonly CAMERA_NEAR = 2000;
    bodySystem: BodySystem;
    abstract cameraMode: CameraMode;
    max_distance_ratio: number;

    constructor(bodySystem: BodySystem, max_distance_ratio: number = 75) {
        this.bodySystem = bodySystem;
        this.max_distance_ratio = max_distance_ratio;

        if (this.bodySystem.getLocationPin()) {
            this.bodySystem.getLocationPin()!.mesh.visible = true;
        }

        if (!this.bodySystem.controls.enabled) {
            this.bodySystem.controls.enabled = true;
        }

        bodySystem.setCameraUp(this.computeDesiredCameraUp());
        bodySystem.camera.near = this.CAMERA_NEAR;
        bodySystem.camera.updateProjectionMatrix();
    }

    computeDesiredCameraUp(): Vector3 {
        return this.bodySystem.getBody("earth").get_orbital_plane_normal()!;
    }

    postTargetSet(bodyObject3D: BodyObject3D) {
        this.bodySystem.controls.minDistance = this.minCameraDistance(bodyObject3D);
    }

    minCameraDistance(bodyObject3D: BodyObject3D) {
        const bodyRadius = bodyObject3D.body.radius / 1000
        return bodyRadius + (1.5 * bodyRadius);
    }


    moveToTarget(bodyObject3D: BodyObject3D, force = false): void {

        const bodySystem = this.bodySystem;

        if (bodySystem.getBodyObject3DTarget() == bodyObject3D && !force) return;

        bodySystem.controls.enabled = false;

        const currentBodyObject3d = bodySystem.getBodyObject3DTarget();
        const currentTargetPosition = this.bodySystem.controls.target.clone();
        const newTargetPosition = bodyObject3D.object3D.position;
        const currentCameraPosition = this.bodySystem.camera.position;
        const currentTargetVector = currentTargetPosition.clone().sub(currentCameraPosition);
        const newTargetVector = newTargetPosition.clone().sub(currentCameraPosition);
        const newTargetVectorNormal = newTargetVector.clone().normalize();
        const currentDistanceToSurface = currentBodyObject3d.cameraDistanceFromSurface();
        const totalDistance = Math.max(Math.min(currentDistanceToSurface + bodyObject3D.body.radius / 1000, this.max_distance_ratio * bodyObject3D.body.radius / 1000), this.minCameraDistance(bodyObject3D));
        const newCameraPos = newTargetPosition.clone().sub(newTargetVectorNormal.multiplyScalar(totalDistance));

        // we turn 180 degrees in 2 seconds or 1 second minimum which ever is the most
        const rotationTime = Math.max(
            Math.max(currentTargetVector.angleTo(newTargetVector) / Math.PI) * 2000,
            1000);

        // Orient the camera towards a different target; does not move the position of the camera.
        const targetOrientation = new TWEEN
            .Tween(this.bodySystem.controls.target)
            .to(bodyObject3D.object3D.position, rotationTime)
            .easing(TWEEN.Easing.Quintic.In)
            .dynamic(true);

        const distanceToNewTarget = currentCameraPosition.distanceTo(newTargetPosition);

        // Reposition camera: travel at 1000 times the speed of light or slower for 2.5 seconds wich ever is the most.
        const positionDisplacementTime = Math.max((distanceToNewTarget / 3300000), 2500);
        const cameraPosition = new TWEEN
            .Tween(this.bodySystem.camera.position)
            .to(newCameraPos, positionDisplacementTime) // this may be moving...
            .easing(TWEEN.Easing.Quintic.InOut);

        targetOrientation
            .chain(cameraPosition)
            .start()
            .onComplete(() => {
                this.bodySystem.controls.enabled = true;
                this.bodySystem.setTarget(bodyObject3D);
            });
    }

    abstract followTarget(bodyObject3D: BodyObject3D): void;

}

export class FollowTargetCameraMode extends OrbitingCameraMode {
    cameraMode = CameraModes.FollowTarget;

    constructor(bodySystem: BodySystem) {
        super(bodySystem)
    }

    followTarget(bodyObject3D: BodyObject3D): void {
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

    followTarget(bodyObject3D: BodyObject3D): void {
        this.bodySystem.controls.target.set(bodyObject3D.body.position.x / 1000, bodyObject3D.body.position.y / 1000, bodyObject3D.body.position.z / 1000);
    }
}

export class ViewFromSurfaceLocationPinCameraMode implements CameraTargetingState {

    readonly CAMERA_NEAR = 1;
    bodySystem: BodySystem;
    cameraMode = CameraModes.ViewTargetFromSurface;

    constructor(bodySystem: BodySystem) {
        this.bodySystem = bodySystem;
        const pinNormal = this.bodySystem.locationPin?.getLocationPinNormal();
        this.bodySystem.locationPin!.mesh.visible = false;
        this.bodySystem.setCameraUp(pinNormal);
        this.bodySystem.camera.near = this.CAMERA_NEAR;
        this.bodySystem.camera.updateProjectionMatrix();
    }

    computeDesiredCameraUp(): Vector3 {
        return this.bodySystem.locationPin!.getLocationPinNormal();
    }

    postTargetSet(bodyObject3D: BodyObject3D) { }

    moveToTarget(bodyObject3D: BodyObject3D, force = false): void {

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

    followTarget(bodyObject3D: BodyObject3D): void {
        const bodySystem = this.bodySystem;

        // body rotates, so need to adjust the up
        bodySystem.setCameraUp(this.computeDesiredCameraUp());
        const cameraPosition = bodySystem.camera.position.clone();
        const target = bodySystem.controls.target.clone();
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


