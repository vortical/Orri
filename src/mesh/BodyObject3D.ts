import { Group, Object3D } from 'three';
import { Body } from '../domain/Body.ts';
import { toRad } from '../system/geometry.ts';
import { BodySystem, CameraLayer } from '../scene/BodySystem.ts';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { throttle } from '../system/timing.ts';
import { ObjectLabels } from './ObjectLabels.ts';


abstract class BodyObject3D {
    object3D: Object3D;
    body: Body;
    bodySystem: BodySystem;
    labels: ObjectLabels;

    constructor(body: Body, bodySystem: BodySystem) {
        this.body = body;
        this.bodySystem = bodySystem;
        this.object3D = new Group();
        this.labels = new ObjectLabels(this);
        this.object3D.add(...this.labels.getLabels());
    }

    getName(): string {
        return this.body.name;
    }

    scale(scale: number) {
        this.object3D.scale.set(scale, scale, scale);
    }

    setBody(body: Body) {
        this.body = body;
    }

    moveToTarget(){
        this.bodySystem.moveToTarget(this);
    }

    setAsTarget(){
        this.bodySystem.setTarget(this.body);
    }
    
    
    cameraDistance(fromSurface: boolean = false){
        const distance = this.bodySystem.camera.position.distanceTo(this.object3D.position);
        return fromSurface? distance - (this.body.radius/1000) : distance;
    }

    cameraDistanceFromSurface(){
        return this.cameraDistance(true);
    }

    cameraDistanceAsString(fromSurface: boolean = false): string {
        const distance = this.cameraDistance(fromSurface);
        return this.bodySystem.getDistanceFormatter().format(distance);
    }

    /**
     * Calling this after making changes to the underlying body properties
     * will update the 3d properties of the Obect3D
     */
    update(): void {
        const body = this.body;
        this.object3D.position.set(body.position.x / 1000, body.position.y / 1000, body.position.z / 1000);

        this.object3D.children?.forEach((c => {
            c.rotation.set(body.sideralRotation.x, body.sideralRotation.y, body.sideralRotation.z);
            // each surface itself may have animations (e.g. atmosphere), so we should
            // call an update on those.
            // this would rotate the ring if we did not filter this out (only rotate the atmosphere).
            // regardless we need to create a model that represents our model
            if (c.children && c.children.length == 1) {
                if (c.children[0].userData?.type === "atmosphere") {
                    // fake this for now
                    c.children[0].rotateY(toRad(0.0015));
                }
            }
        }));

        this.updateLabelsInvoker();
    }

    /*
     * Limit the label updates to 10 per second.
     */
    updateLabelsInvoker = throttle(100, this, () => this.updateLabels());

    updateLabels() {
        this.labels.updateBodyLabels();
    };



    planetarySystem(): BodyObject3D {
        return this;
    }
}

export { BodyObject3D };