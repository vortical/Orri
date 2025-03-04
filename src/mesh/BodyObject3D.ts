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
import { OrbitalOutline } from './OrbitOutline.ts';


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
    readonly orbitOutline: OrbitalOutline;
    
    readonly labels: ObjectLabels;
    pins: LocationPin[] = [];
    northPin?: LocationPin;

    constructor(body: Body, bodySystem: BodySystem) {
        super();
        this.object3D = new Group();
        this.body = body;
        this.bodySystem = bodySystem;
        this.labels = new ObjectLabels(this);
        this.orbitOutline = new OrbitalOutline(this);
        
        this.object3D.add(...this.labels.getCSS2DObjects());
        this.bodySystem.scene.add(this.orbitOutline.getObject3D())
    
    }

    abstract  getSurface(): Object3D;

    // abstract setOrbitOutlineEnabled(value: boolean): void;

    getOrbitOutlineEnabled(): boolean {
        return this.orbitOutline.enabled;
    }

    setOrbitOutlineEnabled(value: boolean): void {
        if(this.getOrbitOutlineEnabled() == value){
            return;
        }        
        this.orbitOutline.enabled = value;        
    }

    

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

    /**
     * 
     * @param fromSurface true if distance is to be measured from surface of body as opposed to center.
     * 
     * @returns distance in km
     */
    cameraDistance(fromSurface: boolean = false): number {
        const distance = this.bodySystem.camera.position.distanceTo(this.object3D.position);
        return fromSurface ? distance - (this.body.radius / 1000) : distance;
    }

    /**
     * Alias of cameraDistance(true)
     * 
     * @returns 
     */
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
        const x = body.position.x / 1000, y = body.position.y / 1000, z = body.position.z / 1000;
        this.object3D.position.set(x, y, z);

        this.updateLabelsInvoker();

        // // does not belong here, this should be completely seperate from the body?

        if(this.orbitOutline.enabled){
            if(this.isPlanetarySystemSelected()){
                this.orbitOutline.addPosition(this.body.position, true);
                this.updateOrbitsInvoker();        
            }else{
                if(this.body.type == "planet"){
                    this.orbitOutline.addPosition(this.body.position, true);
                    this.updateOrbitsInvoker();        
                }
            }
        }

    }

    /*
     * Limit the label updates frequency. 20 per second
     */
    updateLabelsInvoker = throttle(1000/20, this, () => {
        this.updateLabels();
    });
    updateOrbitsInvoker = throttle(1000/5, this, () => this.orbitOutline.needsUpdate());


    updateLabels(): void {
        this.labels.updateBodyLabels();
    };

    planetarySystem(): Body {
        return this.body.planetarySystem();
    }

    isPlanetarySystemSelected() {
        const currentTarget = this.bodySystem.getBodyObject3DTarget();
        return this.planetarySystem() == currentTarget.planetarySystem();
    }



}
