import { Group, Mesh, Object3D, Vector3 } from 'three';
import { Body } from '../domain/Body.ts';
import { AltitudeAzimuth, LatLon, angleTo, toDeg, toRad } from '../system/geometry.ts';
import { BodySystem, CameraLayer } from '../scene/BodySystem.ts';
// import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { throttle } from '../system/timing.ts';
import { ObjectLabels } from './ObjectLabels.ts';
import { LocationPin } from './LocationPin.ts';
import { Vector } from '../system/vecs.ts';


// the name...
abstract class BodyObject3D {
    object3D: Object3D;
    body: Body;
    bodySystem: BodySystem;
    labels: ObjectLabels;
    pins: LocationPin[] = [];
    
    constructor(body: Body, bodySystem: BodySystem) {
        this.body = body;
        this.bodySystem = bodySystem;
        this.object3D = new Group();
        this.labels = new ObjectLabels(this);
        this.object3D.add(...this.labels.getCSS2DObjects());
    }

    abstract getSurfaceMesh(): Mesh;

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
        this.bodySystem.setTarget(this);
    }
    
    cameraDistance(fromSurface: boolean = false): number {
        const distance = this.bodySystem.camera.position.distanceTo(this.object3D.position);
        return fromSurface? distance - (this.body.radius/1000) : distance;
    }

    cameraDistanceFromSurface(): number{
        return this.cameraDistance(true);
    }

    cameraDistanceAsString(fromSurface: boolean = false): string {
        const distance = this.cameraDistance(fromSurface);
        return this.bodySystem.getDistanceFormatter().format(distance);
    }

    altitudeAzimuthFromLocationPin(): AltitudeAzimuth | undefined {
        // Location pin we are viewing from.
        const locationPin = this.bodySystem.locationPin;
        if(!locationPin){
            return undefined;
        }

        const east = this.bodySystem.getEast();
        if (east == undefined){
            return undefined;
        }

        const objectPos = this.object3D.position;
        const camera = this.bodySystem.camera;
        // note: camera and location pin at the same position. Probably
        // better to leverage location pin as opposed to camera.
        
        const cameraPos = camera.position;
        const up = Vector.fromVectorComponents(camera.up);
        const targetVector = new Vector().subVectors(objectPos,cameraPos);
        const phi = 90-toDeg(up.angleTo(targetVector))

        // Add 90 cause theta (i.e. azimuth) is based off north, whereas we calculated from east.
        const theta = (toDeg(angleTo(targetVector, east, up)) + 90) % 360;
        return new AltitudeAzimuth(phi, theta);
    }

    removeLocationPin(locationPin: LocationPin){
        locationPin.getMesh().removeFromParent();
        locationPin.getMesh().geometry.dispose();
        this.pins = this.pins.filter(p => p != locationPin);        
    }

    addLocationPin(locationPin: LocationPin){
        this.getSurfaceMesh().add(locationPin.getMesh());
        this.pins.push(locationPin);        
    }

    removeAllPins(){
        this.pins.forEach(p => {
            p.getMesh().removeFromParent();
            p.getMesh().geometry.dispose();
        });
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
            c.children
                .filter(child => child.userData?.type === "atmosphere" )
                .forEach(mesh => {
                    mesh.rotateY(toRad(0.003));
                });
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