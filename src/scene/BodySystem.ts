import { AmbientLight, AxesHelper, Camera, Color, DirectionalLightHelper, PCFShadowMap, PerspectiveCamera, Scene, Vector3, WebGLRenderer } from 'three';
import { Dim } from "../system/Dim.ts";
import { LatLon } from "../system/LatLon.ts";
import { Body } from '../body/Body.ts';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { BodySystemUpdater } from '../body/BodySystemUpdater.ts';
import { RenderableBody } from '../mesh/RenderableBody.ts';
import { throttle } from "../system/throttle.ts";
import Stats from 'three/addons/libs/stats.module.js';
import PubSub from 'pubsub-js';
import { BODY_SELECT_TOPIC, BodySelectEventMessageType, TIME_DISPLAY_TOPIC, FOV_TOPIC } from '../system/event-types.ts';
import type { TimeDisplay } from '../system/time.ts';
import { Clock, TimeMark } from "../system/Clock.ts";
import { Vector } from '../system/Vector.ts';
import { Picker } from './Picker.ts';
import { RenderableBodyFactory } from '../mesh/RenderableBodyFactory.ts';
import { CompositeUpdater } from '../body/CompositeUpdater.ts';
import { VectorComponents, ShadowType, BodyProperties } from '../domain/models.ts';
import { RenderableStar } from '../mesh/RenderableStar.ts';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import * as TWEEN from '@tweenjs/tween.js';
import { LocationPin } from '../mesh/LocationPin.ts';
import { CameraTargetingState, CameraMode, CameraModes, MoveIntent } from './CameraTargetingState.ts';
import { DataService } from '../services/dataservice.ts';
import { BodiesAtTimeUpdater } from '../body/BodiesAtTimeUpdater.ts';
import { CameraLayer } from './CameraLayer.ts';
import { DistanceFormatter, DistanceUnit, DistanceUnits } from '../system/distance.ts';
import { OrbitLength, OrbitLengthType } from '../mesh/OrbitOutline.ts';
import { OrbitOutlinesStateHandler } from './OrbitOutlinesStateHandler.ts';
import { BodyActiveStateHandler } from './ObjectActiveStateHandler.ts';
import { NBodySystemUpdater } from '../body/NBodySystemUpdater.ts';
import { Move } from 'lucide-svelte';
// import { OrbitPathUpdater } from '../body/OrbitOutliner.ts';
// import { timePeriodToMs } from '../system/time.ts';
// import { getworkerExecutorPool, NamedArrayBuffer, OrbitLength } from '../mesh/OrbitOutline.ts';
// import { ExecutorPool } from '../system/ExecutorPool.ts';



export type BodySystemEvent<T> = {
    topic: string;
    message: T;
};

export type OrbitalOutlineOptions = {
    colorHue?: number;
    opacity?: number;
    enabled?: boolean;
};

export type BodySystemOptionsState = {
    date?: number;
    cameraPosition?: VectorComponents;
    targetPosition?: VectorComponents;
    target?: string;
    sizeScale?: number;
    timeScale?: number;
    fov?: number;
    ambientLightLevel?: number;
    showAxes?: boolean;
    castShadows?: boolean;
    shadowType?: ShadowType;
    distanceUnit?: DistanceUnit;
    timeDisplay?: TimeDisplay;
    location?: LatLon;
    showNames?: boolean;
    showDistance?: boolean;
    showAltitudeAzimuth?: boolean;
    targettingCameraMode?: CameraMode;
    // put orbital outlines into their own type?
    orbitalOutlinesEnabled?: boolean;
    selectedOrbitalOutlinesOpacity?: number;
    unselectedOrbitalOutlinesOpacity?: number;
    orbitalOutlinesLength?: OrbitLength;

};

export const SpacecraftModes = {
    NBody: 'NBody',
    Trajectory: 'Trajectory',
} as const;
export type SpacecraftMode = typeof SpacecraftModes[keyof typeof SpacecraftModes];

const CAMERA_NEAR = 500;
// const CAMERA_FAR = 33000000;
// const CAMERA_FAR = 3300000000; // this shows shadows correctly...
const CAMERA_FAR = 33000000000;


/**
 * Our main facade class
 */
export class BodySystem {
    dataService: DataService;
    shadowType: ShadowType = ShadowType.Penumbra;
    bodySystemUpdater: CompositeUpdater = new CompositeUpdater()
    bodies: Body[];
    camera: PerspectiveCamera;
    scene: Scene;
    renderer: WebGLRenderer;
    controls: OrbitControls;
    renderableBodyByName: Map<string, RenderableBody>;
    renderableBodies: RenderableBody[];
    ambiantLight: AmbientLight;
    stats?: Stats;
    target: RenderableBody;
    scale: number = 1.0;
    clock: Clock;
    picker: Picker;
    axesHelper?: AxesHelper;
    parentElement: HTMLElement;
    lightHelper?: DirectionalLightHelper;
    size!: Dim;
    labelRenderer: CSS2DRenderer;
    distanceformatter: DistanceFormatter
    private timeDisplay: TimeDisplay = 'local';
    locationPin?: LocationPin;
    cameraTargetingState: CameraTargetingState;
    orbitOutlinesStateHandler: OrbitOutlinesStateHandler;
    nbodyUpdater: NBodySystemUpdater;

    // workerPool: ExecutorPool<{orbitLength: OrbitLength,  orbitingBodies: BodyProperties[]}, NamedArrayBuffer[]> ;
    

    constructor(parentElement: HTMLElement, bodies: Body[], dataService: DataService, bodySystemUpdater: BodySystemUpdater, {
        cameraPosition, targetPosition, target = "Earth", sizeScale = 1.0, timeScale = 1.0, fov = 30,
        ambientLightLevel = 0.025, showAxes = false, date = Date.now(), castShadows = true, shadowType = ShadowType.Penumbra, distanceUnit = DistanceUnits.km,
        timeDisplay = 'local' as TimeDisplay,
        showNames = true, showDistance = true, showAltitudeAzimuth = true,
        location, targettingCameraMode = CameraModes.FollowTarget, orbitalOutlinesEnabled=false, unselectedOrbitalOutlinesOpacity=0.2, selectedOrbitalOutlinesOpacity=0.5, orbitalOutlinesLength={value:355, lengthType:OrbitLengthType.AngleDegrees} }: BodySystemOptionsState) {

        const targetName = target;
        const canvasSize = new Dim(parentElement.clientWidth, parentElement.clientHeight);
        this.dataService = dataService;
        this.parentElement = parentElement;
        this.distanceformatter = new DistanceFormatter(distanceUnit);
        this.timeDisplay = timeDisplay;
        this.clock = new Clock(date);
        const timeMs = this.clock.clockTimeMs;

        this.nbodyUpdater = bodySystemUpdater as NBodySystemUpdater;
        this.addUpdater(bodySystemUpdater);
        this.bodies = bodies;
        this.camera = createCamera();
        this.scene = createScene();
        this.renderer = createRenderer();
        document.body.appendChild(this.renderer.domElement);
        parentElement.append(this.renderer.domElement);
        this.labelRenderer = createLabelRender();
        parentElement.append(this.labelRenderer.domElement);
        this.renderableBodyByName = this.createRenderableBodies(this.bodies, timeMs);
        this.renderableBodies = Array.from(this.renderableBodyByName.values()); 
        this.controls = createControls(this.camera, this.labelRenderer.domElement);
        this.controls.enabled = false;

        this.target = this.getRenderableBody(targetName);
        targetPosition = targetPosition || new Vector(this.getBody(targetName).position.x / 1000, 0, 0);
        cameraPosition = cameraPosition || new Vector(this.getBody(targetName).position.x / 1000, 0, this.getBody(target).radius / 100);
        this.setViewPosition(cameraPosition, targetPosition);
        this.ambiantLight = createAmbiantLight(ambientLightLevel);
        this.scene.add(this.ambiantLight);
        this.controls.update();
        this.addToScene(this.renderableBodies);
        
        
        this.orbitOutlinesStateHandler = new OrbitOutlinesStateHandler(this);
        new BodyActiveStateHandler(this);
        this.orbitOutlinesStateHandler.setPlanetaryMoonOrbitalOutlinesColorHues();
        this.orbitOutlinesStateHandler.setOrbitalOutlineLength(orbitalOutlinesLength);
        this.orbitOutlinesStateHandler.setSelectedOrbitalOutlinesOpacity(selectedOrbitalOutlinesOpacity);
        this.orbitOutlinesStateHandler.setUnselectedOrbitalOutlinesOpacity(unselectedOrbitalOutlinesOpacity);
        
        this.setAxesHelper(showAxes);
        this.setScale(sizeScale);
        this.setTimeScale(timeScale)
        this.setFOV(fov);
        this.setSize(canvasSize);
        this.picker = new Picker(this);
        setupResizeHandlers(parentElement, (size: Dim) => this.setSize(size));
        this.shadowType = shadowType;
        this.setShadowsEnabled(castShadows);
        this.setLayerEnabled(showNames, CameraLayer.NameLabel);
        this.setLayerEnabled(showDistance, CameraLayer.DistanceLabel);
        this.setLayerEnabled(showAltitudeAzimuth, CameraLayer.ElevationAzimuthLabel);
        // this.orbitOutlinesStateHandler.setOrbitalOutlinesEnabled(orbitalOutlinesEnabled);
        this.orbitOutlinesStateHandler.setOrbitalOutlinesEnabled(orbitalOutlinesEnabled);

        if (location) {
            this.setLocation(location);
        }else if (targettingCameraMode == CameraModes.ViewTargetFromSurface) {
            // if we don't have a location, then we can't go to surface.
            // So default back to 'follow target' mode.
            targettingCameraMode = CameraModes.FollowTarget;
        }
        
        this.cameraTargetingState = targettingCameraMode.stateBuilder(this);
        this.cameraTargetingState.postTargetSet(this.target);
        this.orbitOutlinesStateHandler.setTargetBody(this.target);

        // Default new scenes to Trajectory mode for spacecraft.
        // URL-state with explicit per-body `useTrajectory` will override this
        // since BodySystemOptionsState doesn't carry a top-level spacecraftMode
        // toggle today.
        this.setSpacecraftMode(SpacecraftModes.Trajectory);
    }


    addToScene(bodies: RenderableBody[]){
      
      this.scene.add(...bodies
                      .filter(renderableBody => renderableBody.isActive())
                      .map(renderableBody => renderableBody.object3D)
      );
    }


    handleBodyActivationState(body: Body, isActive: boolean){
      // add remote objects from scene (or set object3D visibility?)
      // probably better to add/remove from scene as most of the time these objects would not be visible.

      const bodyObject = this.getRenderableBody(body.name);

      if(isActive){
        // todo: check that scene does not add existing objects
        //  if(this.scene.getObjectById(body.getObject3D().id())...

        this.scene.add(bodyObject.object3D);
        console.log("Scene add body: ", bodyObject.getName())
      }else{
        console.log("Scene remove body: ", bodyObject.getName())
        this.scene.remove(bodyObject.object3D);
      }
      bodyObject.labels.setVisible(isActive);
    }
    /**
     * Moving near frustrum plane.
     * 
     * 
     * @param valueInKm 
     * @returns 
     */
    setCameraNear(valueInKm: number) {
        const near = Math.min(valueInKm, CAMERA_NEAR);

        if (this.camera.near == near){
            return;        
        }
        this.camera.near = near;
        this.camera.updateProjectionMatrix();        
    }

    setSystemTime(datetime:  Date) {
        return new Promise(async (resolve) => {
            try {
                const time = new Date(datetime);
                const bodies = this.renderableBodies.map(renderableBody => renderableBody.body);
                const kinematics = await this.dataService.loadKinematics(bodies, time);
                this.clock.setTime(datetime.getTime());
                this.addUpdater(new BodiesAtTimeUpdater(kinematics));
            } catch (error) {
                console.log(error)
            }
        });
    }

    setShadowType(shadowType: ShadowType) {
        this.shadowType = shadowType;
        this.scaleMoonForShadowType()
    }

    getShadowType(): ShadowType {
        return this.shadowType;
    }

    getCameraTargetingState(): CameraTargetingState {
        return this.cameraTargetingState;
    }

    getCameraTargetingMode(): CameraMode {
        return this.cameraTargetingState.cameraMode;
    }

    getSpacecraftMode(): SpacecraftMode {
        return this.bodies.some(body => body.type === 'spacecraft' && body.useTrajectory)
            ? SpacecraftModes.Trajectory
            : SpacecraftModes.NBody;
    }

    setSpacecraftMode(mode: SpacecraftMode) {
        const useTrajectory = mode === SpacecraftModes.Trajectory;
        this.bodies
            .filter(body => body.type === 'spacecraft')
            .forEach(body => { body.useTrajectory = useTrajectory; });
        if(mode == SpacecraftModes.NBody){
          this.nbodyUpdater.invalidate();
        }
    }

    setCameraTargetingMode(cameraMode: CameraMode) {
        if (this.cameraTargetingState.cameraMode == cameraMode) {
            return;
        }

        if (cameraMode == CameraModes.ViewTargetFromSurface) {
            if (this.getLocationPin() == undefined) {
                throw new Error("To select 'ViewTargetFromSurface' camera mode, you must have a surface location set.");
            }
            
            if (this.target == this.getRenderableBody("earth")) {
                throw new Error("To select 'ViewTargetFromSurface' camera mode, you must have a target other than Earth.");
            }
        }

        this.cameraTargetingState = cameraMode.stateBuilder(this);
        this.cameraTargetingState.moveToTarget(this.getRenderableBodyTarget(), "reapply" as MoveIntent);
    }

    getLocation(): LatLon | undefined {
        return this.getLocationPin()?.latlon;
    }

    setLocation(latlon: LatLon | undefined) {
        if (this.locationPin?.latlon == latlon) {
            return;
        }
        this.setLocationPin(latlon !== undefined ? new LocationPin(latlon, this.getRenderableBody("earth"),  "#00FF00", "ViewerPosition") : undefined);
    }

    getLocationPin(): LocationPin | undefined {
        return this.locationPin;
    }

    setLocationPin(locationPin: LocationPin | undefined) {
        this.locationPin?.remove();
        this.locationPin = locationPin;
    }

    setDistanceUnit(distanceUnit: DistanceUnit) {
        this.distanceformatter = new DistanceFormatter(distanceUnit);
    }

    getDistanceUnit(): DistanceUnit {
        return this.distanceformatter.distanceUnit;
    }

    setTimeDisplay(mode: TimeDisplay) {
        if (this.timeDisplay === mode) return;
        this.timeDisplay = mode;
        PubSub.publish(TIME_DISPLAY_TOPIC, mode);
    }

    getTimeDisplay(): TimeDisplay {
        return this.timeDisplay;
    }



    isLayerEnabled(layer: CameraLayer): boolean {
        return this.camera.layers.isEnabled(layer);
    }

    setLayerEnabled(value: boolean, layer: CameraLayer) {
        value ? this.camera.layers.enable(layer) : this.camera.layers.disable(layer);
    }

    setCameraUp(up = new Vector3(0, 1, 0)) {
        this.camera.up.set(up.x, up.y, up.z);
    }

    getDistanceFormatter(): DistanceFormatter {
        return this.distanceformatter;
    }

    getRenderableBody(name: string): RenderableBody {
        return this.renderableBodyByName.get(name.toLowerCase())!
    }

    getBody(name: string): Body {
        return this.renderableBodyByName.get(name.toLowerCase())!.body;
    }

    setShadowsEnabled(value: boolean) {
        const starBodies = this.renderableBodies
            .filter((bodyObject: RenderableBody) => bodyObject instanceof RenderableStar) as RenderableStar[];

        starBodies.forEach(it => it.setShadowsEnabled(value));
    }

    getShadowsEnabled(): boolean {
        const starBodies: RenderableStar[] = this.renderableBodies
            .filter((bodyObject: RenderableBody) => bodyObject.body.type == "star") as RenderableStar[]; // instanceof RenderableStar) as RenderableStar[];
        return starBodies.reduce((prev: boolean, current) => (current.getShadowsEnabled() && prev), true);
    }

  

    hasStats(): boolean {
        return this.stats != undefined && this.stats.dom.style.display !== "none";
    }

    updateStats() {
        this.stats && this.stats.update();
    }

    showStats(value: boolean) {
        if (value && this.stats == undefined) {
            this.stats = new Stats();
            this.parentElement.appendChild(this.stats.dom);
        } else if (value && this.stats) {
            this.stats.dom.style.display = "block";
        } else if (value == false && this.stats) {
            this.stats.dom.style.display = "none";
        }
    }

    hasAxesHelper(): boolean {
        return this.axesHelper != undefined;
    }

    setAxesHelper(value: boolean) {
        if (value && this.axesHelper == undefined) {
            this.axesHelper = new AxesHelper(5000000000);
            this.scene.add(this.axesHelper);
        } else if (value == false && this.axesHelper) {
            this.axesHelper.removeFromParent();
            this.axesHelper.dispose();
            this.axesHelper = undefined;
        }
    }

    isPaused(): boolean {
        return this.clock.isPaused();
    }

    setPaused(value: boolean): boolean {
        return this.clock.setPaused(value);
    }

    getTimeScale(): number {
        return this.clock.getScale();
    }

    setTimeScale(timesScale: number) {
        this.clock.setScale(timesScale)
    }

    /**
     * @param updater an Update that gets invoked during an animation frame
     */
    addUpdater(updater: BodySystemUpdater) {
        this.bodySystemUpdater.addUpdater(updater);
    }

    getScale(): number {
        return this.scale;
    }

    setScale(scale: number) {
        this.scale = scale;

        this.renderableBodyByName.forEach((body) => {
            body.scale(scale);
        });
    }

    getAmbiantLightLevel(): number {
        return this.ambiantLight.intensity;
    }

    setAmbiantLightLevel(level: number) {
        this.ambiantLight.intensity = level;
    }

    getSunLightIntensity(): number {
        const sun = this.getRenderableBody('sun') as RenderableStar;
        return sun.getIntensity();
    }

    setSunLightIntensity(value: number) {
        const sun = this.getRenderableBody('sun') as RenderableStar;
        sun.setIntensity(value);
    }

    getFov(): number {
        return this.camera.getEffectiveFOV();
    }

    setFOV(fov: number) {
        this.camera.fov = fov;
        this.camera.updateProjectionMatrix();
        PubSub.publish(FOV_TOPIC, fov);
    }

    getTarget(): RenderableBody{
        return this.target;
    }

    getRenderableBodyTarget(): RenderableBody {
        return this.target;
    }

    moveToTarget(renderableBody: RenderableBody, moveIntent: MoveIntent = "standard") {

        // if (this.getRenderableBodyTarget() == renderableBody && moveIntent == "standard") {
        //     return;
        // }

        if (renderableBody == this.getRenderableBody("earth") && this.getCameraTargetingMode() == CameraModes.ViewTargetFromSurface) {
            throw new Error("Can't select Earth as target while viewing from Earth's surface.");
        }

        this.cameraTargetingState.moveToTarget(renderableBody, moveIntent);
    }


    /**
     * Used for tracking a body frame to frame.
     *  
     * @param body
     * @param moveToTarget 
     */
    followTarget(body: RenderableBody) {
        this.cameraTargetingState.followTarget(body);
    }



    setTarget(bodyObject3D: RenderableBody | string | undefined) {
        if (bodyObject3D == undefined) return;

        if (typeof bodyObject3D === "string") {
            bodyObject3D = this.getRenderableBody(bodyObject3D);
        }

        if (this.target != bodyObject3D) {
            this.target = bodyObject3D;
            this.cameraTargetingState.postTargetSet(bodyObject3D);
            this.fireSelectEvent({ topic: BODY_SELECT_TOPIC.toString(), message: { body: bodyObject3D } });
        }
    }


    /**
     * We should formalize.This implementation was just a dirty way to get see the umbra
     * 
     * Our light emits 'parallel' shadows. There is no way for this type of light to 
     * show umbra.
     */
    scaleMoonForShadowType() {
        const shadowType = this.shadowType;
        const moon = this.getRenderableBody("moon");

        if (shadowType == ShadowType.Umbra && this.getRenderableBodyTarget().getName().toLocaleLowerCase() == "earth"
            && this.getRenderableBodyTarget().cameraDistance() < 384400 && moon.cameraDistance() < 384400) {
            const moon = this.getRenderableBody("moon");
            const radius = moon.body.radius;
            const umbraRadius = 100e3;
            const scale = umbraRadius / radius;

            moon.scale(scale);
        } else {
            const moon = this.getRenderableBody("moon");
            moon.scale(this.scale);

        }

    }


    start() {

      function reportTimeDiscrepancy(starttime: number, timeMs: number, updaterTotalStepsMs: number ){
        // console.log(`${timeMs - starttimeMs} -> ${updaterTotalStepsMs}`);
        const discrepancy = Math.abs((timeMs - starttimeMs) - updaterTotalStepsMs);

        if(discrepancy > 1){
          console.log(`time: ${(timeMs - starttimeMs)}, updater: ${updaterTotalStepsMs}`);

        }
      }

        this.clock.enableTimePublisher(true);
        this.render();
        this.clock.mark();
        this.controls.enabled = true;
        const starttimeMs = this.clock.getMark().timeMs;

        this.renderer.setAnimationLoop( () => {
            const mark = this.clock.mark();
            
            this.tick(mark);
            reportTimeDiscrepancy(starttimeMs, mark.timeMs, this.nbodyUpdater.totalstepMs);
            
            if (this.controls.enabled) {
                this.followTarget(this.target);
            }
            this.controls.update();
            TWEEN.update();
            this.render();
            this.updateStats();
            this.scaleMoonForShadowType()
        });
    }

    setViewPosition(cameraPosition: VectorComponents, target: VectorComponents) {
        this.controls.target.set(target.x, target.y, target.z!);
        this.camera.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z!);
    }

    fireSelectEvent(event: BodySystemEvent<BodySelectEventMessageType>) {
        PubSub.publish(event.topic, event.message);
    }

    /**
     * @returns screen size
     */
    getSize(): Dim {
        return this.size;
    }

    /**
     * 
     * @param size screen size
     */
    setSize(size: Dim) {
        this.size = size;
        this.camera.aspect = size.ratio();
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(size.w, size.h);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.labelRenderer.setSize(size.w, size.h);
        this.render();
    }

    /**
     * Trigger the mechanism that ultimately updates the positions of our objects.
     * 
     * @param deltaTime 
     * @returns 
     */
    tick(mark: TimeMark) {
        // return new Promise((resolve) => {
        
   
        

          const stateChanged = this.updateBodyActivityState(mark);
          // updaters 
          this.bodySystemUpdater.update(this.renderableBodies, mark, stateChanged);
          // resolve(null);
        // });
    }

    /**
     * 
     * @param timeMs 
     * @returns true if an active state was changed
     */
    updateBodyActivityState(mark: TimeMark): boolean{

      return this.renderableBodies.reduce((didStateChange, body) => {
        const  activityStateChanged = body.ensureIsActiveAt(mark);
        return didStateChange || activityStateChanged;
      }, false);
      

    }

      //  const allBodyData: Body[] = Array.from(bodyObject3Ds.values())
      // .map((o:RenderableBody) => o.body)
      // .filter(b => !b.useTrajectory);


      // if(handleActivityTransitions(allBodyData, stepTimeMs, timestep)){
      //   // if there are state transitions, our existing accelerations need to be invalidated.
      //   this.gravAccelerations = undefined;
      // }      

    // }


  



    stop() {
        this.clock.enableTimePublisher(false);
        this.renderer.setAnimationLoop(null);
    }

    render() {
        this.renderer.render(this.scene, this.camera);
        this.labelRenderer.render(this.scene, this.camera);
    }

    getState(): BodySystemOptionsState {
        const options: BodySystemOptionsState = {};
        options.cameraPosition = { x: this.camera.position.x, y: this.camera.position.y, z: this.camera.position.z };
        options.targetPosition = { x: this.controls.target.x, y: this.controls.target.y, z: this.controls.target.z };
        options.target = this.target?.getName() || "";
        options.sizeScale = this.getScale();
        options.timeScale = this.getTimeScale();
        options.fov = this.getFov();
        options.ambientLightLevel = this.getAmbiantLightLevel();
        options.showAxes = this.hasAxesHelper();
        options.castShadows = this.getShadowsEnabled();
        options.shadowType = this.getShadowType();
        options.date = this.clock.getTime();
        options.showNames = this.isLayerEnabled(CameraLayer.NameLabel);
        options.showDistance = this.isLayerEnabled(CameraLayer.DistanceLabel);
        options.showAltitudeAzimuth = this.isLayerEnabled(CameraLayer.ElevationAzimuthLabel);
        options.location = this.getLocation();
        options.targettingCameraMode = this.getCameraTargetingMode();
        options.orbitalOutlinesEnabled = this.orbitOutlinesStateHandler.getOrbitalOutlinesEnabled();
        options.selectedOrbitalOutlinesOpacity = this.orbitOutlinesStateHandler.getSelectedOrbitalOutlinesOpacity();
        options.unselectedOrbitalOutlinesOpacity = this.orbitOutlinesStateHandler.getUnselectedOrbitalOutlinesOpacity();
        options.orbitalOutlinesLength = this.orbitOutlinesStateHandler.getOrbitalOutlineLength();

        return options;
    }    

    /** 
     * @param bodies 
     * @returns Map<string, RenderableBody> 
     */
    createRenderableBodies(bodies: Body[], timeMs: number): Map<string, RenderableBody> {

      const bodySystem = this;

      function createObject3D(body: Body){
        const body3D = RenderableBodyFactory.create(body, bodySystem);
        body3D.setIsActive(body3D.isActiveAt(timeMs));
        return body3D;
      }

      const map = bodies.reduce((acc: Map<string, RenderableBody>, body: Body) =>
            acc.set(body.name.toLowerCase(), createObject3D(body)), new Map<string, RenderableBody>()
      );
      
    
      return map;
    }
}


function createAmbiantLight(intensity: number) {
    return new AmbientLight("white", intensity);
}


function setupResizeHandlers(container: HTMLElement, sizeObserver: (size: Dim) => void) {
    window.addEventListener("resize",
        throttle(1000 / 30, undefined,
            (event: UIEvent) => {
                sizeObserver(new Dim(container.clientWidth, container.clientHeight));
            }
        ));
}

function createScene(): Scene {
    const scene = new Scene();
    scene.background = new Color('black');
    return scene;
}

function createCamera({ fov = 35, aspectRatio = 1.0, near = CAMERA_NEAR, far = CAMERA_FAR } = {}): PerspectiveCamera {
    return new PerspectiveCamera(fov, aspectRatio, near, far);
}

function createRenderer(): WebGLRenderer {
    const renderer = new WebGLRenderer({ antialias: true });
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = PCFShadowMap;
    return renderer
}

function createLabelRender(): CSS2DRenderer {
    const labelRenderer = new CSS2DRenderer();
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.top = '0px';
    // Force a stacking context so the per-label z-index values CSS2DRenderer
    // assigns for depth sorting are confined to this subtree. Using `isolation`
    // creates the context without giving the container an explicit z-index,
    // so the labels paint at the renderer's natural DOM position (between the
    // canvas and the top-row UI) — they sort against each other correctly but
    // never outrank elements that come after in DOM order.
    labelRenderer.domElement.style.isolation = 'isolate';
    return labelRenderer;
}

function createControls(camera: Camera, domElement: HTMLElement): OrbitControls {
    const controls = new OrbitControls(camera, domElement);
    controls.enableDamping = true;
    controls.zoomSpeed = 1;
    return controls;
}