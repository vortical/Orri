import { BufferGeometry, Group, Material, Mesh, NormalBufferAttributes, Object3D, Object3DEventMap, Vector3 } from 'three';
import { Body } from '../body/Body.ts';
import { angleTo, toDeg, toRad } from '../system/geometry.ts';
import { AltitudeAzimuth } from "../system/AltitudeAzimuth.ts";
import { BodySystem } from '../scene/BodySystem.ts';
import { throttle } from "../system/throttle.ts";
import { ObjectLabels } from './ObjectLabels.ts';
import { LocationPin } from './LocationPin.ts';
import { Vector } from '../system/Vector.ts';
import { CelestialBodyPart } from './CelestialBodyPart.ts';
import { LatLon } from '../system/LatLon.ts';
import { BodySurface } from './BodySurface.ts';


/**
 * A BodyObject3D is composed of: Object3D, Body and Labels
 * 
 * The Body represents the kinematics characteristics, these characteristics
 * are updated/controller via BodySystemUpdaters.
 * 
 * The Object3D is the visual representation in our 3D scene.
 * 
 * The main role of the BodyObject3D is to keep the Object3D in sync with the Body.
 */
export abstract class BodyObject3D extends CelestialBodyPart {
    /**
     * This is the object3d representing this object. It's a Group instance.
     */
    readonly object3D: Object3D;
    readonly body: Body;
    readonly bodySystem: BodySystem;
    readonly labels: ObjectLabels;
    pins: LocationPin[] = [];
    northPin?: LocationPin;

    constructor(body: Body, bodySystem: BodySystem) {
        super();
        this.object3D = new Group();
        this.body = body;
        this.bodySystem = bodySystem;
        this.labels = new ObjectLabels(this);
        this.object3D.add(...this.labels.getCSS2DObjects());
    
    }

    abstract  getSurface(): Object3D;

    getObject3D(): Object3D {
        return this.object3D;
    }

    getNorthAxis(): Vector3 {
        if (this.northPin == undefined) {
            this.northPin = new LocationPin(new LatLon(90, 0), this, "#00FF00", "North",false);
        }
        return this.northPin.getLocationPinNormal();
    }

    getName(): string {
        return this.body.name;
    }

    scale(scale: number) {
        this.object3D.scale.set(scale, scale, scale);
    }

    moveToTarget() {
        this.bodySystem.moveToTarget(this);
    }

    setAsTarget() {
        this.bodySystem.setTarget(this);
    }

    cameraDistance(fromSurface: boolean = false): number {
        const distance = this.bodySystem.camera.position.distanceTo(this.object3D.position);
        return fromSurface ? distance - (this.body.radius / 1000) : distance;
    }

    cameraDistanceFromSurface(): number {
        return this.cameraDistance(true);
    }

    /**
     * What is the AltitudeAzimuth to this body when viewed from a location pin on another body.
     * 
     * @param locationPin A location pin on another body
     * @returns The AltitudeAzimuth to this body
     */
    altitudeAzimuthFromLocationPin(locationPin?: LocationPin): AltitudeAzimuth | undefined {
        if (locationPin == undefined ) return undefined;

        const axes =  locationPin.getAxes();
        const targetVector = new Vector().subVectors(this.object3D.position, locationPin.getLocationPinWorldPosition());
                
        // Add 90 cause theta (i.e. azimuth) is based off north, whereas we calculated from east.
        const theta = (toDeg(angleTo(targetVector, axes.east, axes.up)) + 90) % 360;
        const phi = 90 - toDeg(axes.up.angleTo(targetVector))
        return new AltitudeAzimuth(phi, theta);
    }

    removeLocationPin(locationPin: LocationPin): void {
        locationPin.getMesh().removeFromParent();
        locationPin.getMesh().geometry.dispose();
        this.pins = this.pins.filter(p => p != locationPin);
    }

    addLocationPin(locationPin: LocationPin): void {
        this.getSurface().add(locationPin.getMesh());
        this.pins.push(locationPin);
    }

    removeAllPins(): void {
        this.pins.forEach(p => {
            p.getMesh().removeFromParent();
            p.getMesh().geometry.dispose();
        });
    }

    /**
     * Calling this after making changes to the underlying body properties
     * will update the 3d properties of the Obect3D
     */
    updatePart(): void {
        const body = this.body;
        this.object3D.position.set(body.position.x / 1000, body.position.y / 1000, body.position.z / 1000);
        this.updateLabelsInvoker();
    }

    /*
     * Limit the label updates to 10 per second.
     */
    updateLabelsInvoker = throttle(100, this, () => this.updateLabels());

    updateLabels(): void {
        this.labels.updateBodyLabels();
    };

    planetarySystem(): BodyObject3D {
        return this;
    }
}
