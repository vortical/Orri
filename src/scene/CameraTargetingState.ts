import { BodyObject3D } from "../mesh/BodyObject3D";
import { BodySystem } from "./BodySystem";
import * as TWEEN from '@tweenjs/tween.js';
import { Vector3 } from "three";



const MAX_DESIRED_TARGET_DISTANCE_TIME_RADIUS = 75;

export interface CameraTargetingState {

    cameraMode: CameraMode;

    moveToTarget(bodyObject3D: BodyObject3D, force: boolean): void;
    // todo: insteal of body...pass in vector3.
    followTarget(bodyObject3D: BodyObject3D): void;

    /**
     * Called after a new target is set. 
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

    constructor(bodySystem: BodySystem) {
        this.bodySystem = bodySystem;

        if(this.bodySystem.getLocationPin()){
            this.bodySystem.getLocationPin()!.mesh.visible = true;
        }

        if(!this.bodySystem.controls.enabled ){
            this.bodySystem.controls.enabled = true;
        }

        bodySystem.camera.near = this.CAMERA_NEAR;
        // the ecliptic...
        bodySystem.setCameraUp(this.computeDesiredCameraUp());
        
        // we could set this to be equal to orbit of target.
        bodySystem.camera.near = this.CAMERA_NEAR;
        bodySystem.camera.updateProjectionMatrix();
    }

    computeDesiredCameraUp(): Vector3 {
        return this.bodySystem.getBody("earth").get_orbital_plane_normal()!;
    }

    postTargetSet(bodyObject3D: BodyObject3D) {
        // todo: we could adjust the camera near relative to this...
        this.bodySystem.controls.minDistance = this.minCameraDistance(bodyObject3D);
    }

    minCameraDistance(bodyObject3D: BodyObject3D){
        const bodyRadius = bodyObject3D.body.radius/1000
        return bodyRadius + (1.5 * bodyRadius);
    }


    moveToTarget(bodyObject3D: BodyObject3D, force = false): void {

        const bodySystem = this.bodySystem;

        // we won't move to self.
        if (bodySystem.getBodyObject3DTarget() == bodyObject3D && !force) {
            return;
        }

        bodySystem.controls.enabled = false;

        const currentBodyObject3d = bodySystem.getBodyObject3DTarget();
        const currentTargetPosition = this.bodySystem.controls.target.clone();
        const newTargetPosition = bodyObject3D.object3D.position;
        const currentCameraPosition = this.bodySystem.camera.position;
        const currentTargetVector = currentTargetPosition.clone().sub(currentCameraPosition);
        const newTargetVector = newTargetPosition.clone().sub(currentCameraPosition);
        const newTargetVectorNormal = newTargetVector.clone().normalize();
        const currentDistanceToSurface = currentBodyObject3d.cameraDistanceFromSurface();
        const totalDistance = Math.max(Math.min(currentDistanceToSurface + bodyObject3D.body.radius / 1000, MAX_DESIRED_TARGET_DISTANCE_TIME_RADIUS * bodyObject3D.body.radius / 1000), this.minCameraDistance(bodyObject3D));

        const newCameraPos = newTargetPosition.clone().sub(newTargetVectorNormal.multiplyScalar(totalDistance));


        // we turn 180 degrees in 2 seconds or 1 second minimum which ever is the most
        const rotationTime = Math.max(
            Math.max(currentTargetVector.angleTo(newTargetVector) / Math.PI) * 2000,
            1000);


        // Orient the camera towards a different 
        // target; does not move the position of the camera.
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

    // todo: insteal of body...pass in vector3.
    followTarget(bodyObject3D: BodyObject3D): void {
        this.bodySystem.controls.target.set(bodyObject3D.body.position.x / 1000, bodyObject3D.body.position.y / 1000, bodyObject3D.body.position.z / 1000);
    }
}

export class ViewFromSurfaceLocationPinCameraMode implements CameraTargetingState {

    // see this sky:
    // https://threejs.org/examples/?q=sky#webgl_shaders_sky
    
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

    postTargetSet(bodyObject3D: BodyObject3D) {
    }

    // force has no effect in this method implementation.
    moveToTarget(bodyObject3D: BodyObject3D, force = false): void {
        
        const bodySystem = this.bodySystem;

        // If the target body is the same as the one we are sitting on then skip moving.
        if (bodyObject3D == bodySystem.locationPin?.bodyObject3D){
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
            Math.max(currentTargetVector.angleTo(newTargetVector)/Math.PI) * 2000, 
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
        bodySystem.camera.position.set(locationPinPosition.x,locationPinPosition.y, locationPinPosition.z );
    }

}


export interface CameraModeElement {
    name: string,
    stateBuilder: (bodySystem: BodySystem) => CameraTargetingState
};

export const CameraModes = {
    LookAtTarget: {name: "Look At Target", stateBuilder: (bodySystem: BodySystem) => new LookAtTargetCameraMode(bodySystem) },
    FollowTarget: {name: "Follow Target", stateBuilder: (bodySystem: BodySystem) => new FollowTargetCameraMode(bodySystem) },
    // ViewTargetFromSurface: {name: "View From Location Pin", stateBuilder: (bodySystem: BodySystem, pin: LocationPin) => {} }
    ViewTargetFromSurface: {name: "View From lat,lon", stateBuilder: (bodySystem: BodySystem)  => new ViewFromSurfaceLocationPinCameraMode(bodySystem) }
};

export type CameraMode = typeof CameraModes[keyof typeof CameraModes];


