import { BufferGeometry, Group, Material, Mesh, NormalBufferAttributes, Object3D, Object3DEventMap, Vector3 } from 'three';
import { Body } from '../body/Body.ts';
import { angleTo, toDeg, toRad } from '../system/geometry.ts';
import { AltitudeAzimuth } from "../system/AltitudeAzimuth.ts";
import { BodySystem } from '../scene/BodySystem.ts';
import { throttle } from "../system/throttle.ts";
import { ObjectLabels } from './ObjectLabels.ts';
import { LocationPin } from './LocationPin.ts';
import { Vector } from '../system/Vector.ts';
import { Renderable } from './Renderable.ts';
import { LatLon } from '../system/LatLon.ts';
import { BodySurface } from './BodySurface.ts';
import { OrbitTrajectoryOutline } from './OrbitOutline.ts';
import { TrajectoryOutline } from './TrajectoryOutline.ts';
// import { }
import { SpacecraftTrajectoryUpdater } from '../body/SpacecraftTrajectoryUpdater.ts';
import { BODY_ACTIVE_TOPIC } from '../system/event-types.ts';
import { TimeMark } from '../system/Clock.ts';


/**
 * A RenderableBody is composed of: Object3D, Body and Labels
 * 
 * The Body represents the kinematics characteristics, these characteristics
 * are updated/controller via BodySystemUpdaters.
 * 
 * The Object3D is the visual representation in our 3D scene.
 * 
 * The main role of the RenderableBody is to keep the Object3D in sync with the Body.
 */
export abstract class RenderableBody extends Renderable {
    /**
     * This is the object3d representing this object. It's a Group instance.
     */
    readonly object3D: Object3D;
    readonly body: Body;
    readonly bodySystem: BodySystem;
    readonly trajectoryOutline: TrajectoryOutline;
    
    readonly labels: ObjectLabels;
    pins: LocationPin[] = [];
    northPin?: LocationPin;

    constructor(body: Body, bodySystem: BodySystem) {
        super();
        this.object3D = new Group();
        this.body = body;
        this.bodySystem = bodySystem;
        this.labels = new ObjectLabels(this);
        this.trajectoryOutline = this.createTrajectoryOutline();

        this.object3D.add(...this.labels.getCSS2DObjects());
        if(body.type !== "star"){
          this.bodySystem.scene.add(this.trajectoryOutline.getObject3D())
        }
    
    }

    protected createTrajectoryOutline(): TrajectoryOutline {
      return new OrbitTrajectoryOutline(this);
    }

    abstract  getSurface(): Object3D;

    // abstract setOrbitOutlineEnabled(value: boolean): void;

    getOrbitOutlineEnabled(): boolean {
        return this.trajectoryOutline.enabled;
    }

    setOrbitOutlineEnabled(value: boolean): void {
        if(this.getOrbitOutlineEnabled() == value){
            return;
        }
        this.trajectoryOutline.enabled = value;
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


    isTarget(): boolean {
        return this.bodySystem.getTarget() == this;
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

      if(!this.isActive()) return;

      const body = this.body;
      const x = body.position.x / 1000, y = body.position.y / 1000, z = body.position.z / 1000;
      this.object3D.position.set(x, y, z);

      this.updateLabelsInvoker();

      // // does not belong here, this should be completely seperate from the body?

      if(this.trajectoryOutline.enabled){
          if(this.isPlanetarySystemSelected()){
              this.trajectoryOutline.addPosition(this.body.position, true);
              this.updateOrbitsInvoker();
          }else{
              if(this.body.type == "planet"){
                  this.trajectoryOutline.addPosition(this.body.position, true);
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
    updateOrbitsInvoker = throttle(1000/20, this, () => this.trajectoryOutline.needsUpdate());


    updateLabels(): void {
        this.labels.updateBodyLabels();
    };

    planetarySystem(): Body {
        return this.body.planetarySystem();
    }

    isPlanetarySystemSelected() {
        const currentTarget = this.bodySystem.getRenderableBodyTarget();
        return this.planetarySystem() == currentTarget.planetarySystem();
    }



    isActive(): boolean {
      return this.body.isActive();
    }
    isActiveAt(timeMs: number): boolean {
      return this.body.isActiveAt(timeMs);
    }

    /**
     * 
     * @param timeMs 
     * @returns true if active state was changed
     */
    ensureIsActiveAt(timeMark: TimeMark): boolean {

      const timeMs = timeMark.timeMs - timeMark.deltaMs;
      const shouldBeActive = this.isActiveAt(timeMs);

      if(this.isActive() == shouldBeActive) return false;

      if(shouldBeActive){
        const missionWindow = this.body.missionWindow;
        this.setIsActive(true);
      
        if(missionWindow){
          console.log("set is active at: "+timeMark.timeMs);

          console.log("updating...")
          const ephemeris = this.body.hermiteInterpolate(timeMs);
          if (ephemeris){
            this.body.position = Vector.fromVectorComponents(ephemeris.position);
            this.body.velocity = Vector.fromVectorComponents(ephemeris.velocity);
          }

          console.log("done updating...")

        }
      } else {
        this.setIsActive(false);
      }      
      return true;
    }


    setIsActive(value: boolean){
      if(this.isActive() == value) return;
      this.labels.setVisible(value)
      this.body.setIsActive(value);
      PubSub.publish(BODY_ACTIVE_TOPIC, {body: this.body, isActive: value});
    }

    setVisible(isVisible: boolean){
      this.object3D.visible = isVisible;
    }

    isVisible(): boolean {
      return this.object3D.visible;
    }


}
