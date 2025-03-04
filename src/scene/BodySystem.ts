import { AmbientLight, AxesHelper, Camera, Color, DirectionalLightHelper, PCFShadowMap, PerspectiveCamera, Scene, Vector3, WebGLRenderer } from 'three';
import { Dim } from "../system/Dim.ts";
import { LatLon } from "../system/LatLon.ts";
import { Body } from '../body/Body.ts';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { BodySystemUpdater } from '../body/BodySystemUpdater.ts';
import { BodyObject3D } from '../mesh/BodyObject3D.ts';
import { throttle } from "../system/throttle.ts";
import Stats from 'three/addons/libs/stats.module.js';
import PubSub from 'pubsub-js';
import { BODY_SELECT_TOPIC, BodySelectEventMessageType } from '../system/event-types.ts';
import { Clock } from "../system/Clock.ts";
import { Vector } from '../system/Vector.ts';
import { Picker } from './Picker.ts';
import { BodyObject3DFactory } from '../mesh/Object3DBuilder.ts';
import { CompositeUpdater } from '../body/CompositeUpdater.ts';
import { VectorComponents, ShadowType, BodyProperties } from '../domain/models.ts';
import { StarBodyObject3D } from '../mesh/StarBodyObject3D.ts';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import * as TWEEN from '@tweenjs/tween.js';
import { LocationPin } from '../mesh/LocationPin.ts';
import { CameraTargetingState, CameraMode, CameraModes } from './CameraTargetingState.ts';
import { DataService } from '../services/dataservice.ts';
import { BodiesAtTimeUpdater } from '../body/BodiesAtTimeUpdater.ts';
import { CameraLayer } from './CameraLayer.ts';
import { DistanceFormatter, DistanceUnit, DistanceUnits } from '../system/distance.ts';
import { OrbitLength, OrbitLengthType } from '../mesh/OrbitOutline.ts';
import { OrbitOutlinesStateHandler } from './OrbitOutlinesStateHandler.ts';
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
    location?: LatLon;
    showNames?: boolean;
    showDistance?: boolean;
    showAltitudeAzimuth?: boolean;
    targettingCameraMode?: CameraMode;
    // put orbital outlines into their own type?
    orbitalOutlinesEnabled?: boolean;
    orbitalOutlinesOpacity?: number;
    orbitalOutlinesLength?: OrbitLength;

};

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
    bodyObjects3D: Map<string, BodyObject3D>;
    ambiantLight: AmbientLight;
    stats?: Stats;
    target: BodyObject3D;
    scale: number = 1.0;
    clock: Clock;
    picker: Picker;
    axesHelper?: AxesHelper;
    parentElement: HTMLElement;
    lightHelper?: DirectionalLightHelper;
    size!: Dim;
    labelRenderer: CSS2DRenderer;
    distanceformatter: DistanceFormatter
    locationPin?: LocationPin;
    cameraTargetingState: CameraTargetingState;
    orbitOutlinesStateHandler: OrbitOutlinesStateHandler;

    // workerPool: ExecutorPool<{orbitLength: OrbitLength,  orbitingBodies: BodyProperties[]}, NamedArrayBuffer[]> ;
    

    constructor(parentElement: HTMLElement, bodies: Body[], dataService: DataService, bodySystemUpdater: BodySystemUpdater, {
        cameraPosition, targetPosition, target = "Earth", sizeScale = 1.0, timeScale = 1.0, fov = 35,
        ambientLightLevel = 0.025, showAxes = false, date = Date.now(), castShadows = true, shadowType = ShadowType.Penumbra, distanceUnit = DistanceUnits.km,
        showNames = true, showDistance = true, showAltitudeAzimuth = true,
        location, targettingCameraMode = CameraModes.FollowTarget, orbitalOutlinesEnabled=false, orbitalOutlinesOpacity=0.5, orbitalOutlinesLength={value:355, lengthType:OrbitLengthType.AngleDegrees} }: BodySystemOptionsState) {

        const targetName = target;
        const canvasSize = new Dim(parentElement.clientWidth, parentElement.clientHeight);
        this.dataService = dataService;
        this.parentElement = parentElement;
        this.distanceformatter = new DistanceFormatter(distanceUnit);
        this.clock = new Clock(date);
        this.addUpdater(bodySystemUpdater);
        this.bodies = bodies;
        this.camera = createCamera();
        this.scene = createScene();
        this.renderer = createRenderer();
        document.body.appendChild(this.renderer.domElement);
        parentElement.append(this.renderer.domElement);
        this.labelRenderer = createLabelRender();
        parentElement.append(this.labelRenderer.domElement);
        this.bodyObjects3D = this.createObjects3D(this.bodies);
        this.controls = createControls(this.camera, this.labelRenderer.domElement);
        this.controls.enabled = false;

        this.target = this.getBodyObject3D(targetName);
        targetPosition = targetPosition || new Vector(this.getBody(targetName).position.x / 1000, 0, 0);
        cameraPosition = cameraPosition || new Vector(this.getBody(targetName).position.x / 1000, 0, this.getBody(target).radius / 100);
        this.setViewPosition(cameraPosition, targetPosition);
        this.ambiantLight = createAmbiantLight(ambientLightLevel);
        this.scene.add(this.ambiantLight);
        this.controls.update();
        this.scene.add(...Array.from(this.bodyObjects3D.values()).map(o => o.object3D));
        this.orbitOutlinesStateHandler = new OrbitOutlinesStateHandler(this);
        this.orbitOutlinesStateHandler.setPlanetaryMoonOrbitalOutlinesColorHues();
        this.orbitOutlinesStateHandler.setOrbitalOutlinesEnabled(orbitalOutlinesEnabled);
        this.orbitOutlinesStateHandler.setOrbitalOutlinesOpacity(orbitalOutlinesOpacity);

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
        this.orbitOutlinesStateHandler.setOrbitalOutlineLength(orbitalOutlinesLength);
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
        // this.initializeOrbitOutlines();
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

    setSystemTime(datetime: string | Date) {
        return new Promise(async (resolve) => {
            try {
                const time = new Date(datetime);
                const kinematics = await this.dataService.loadKinematics(Array.from(this.bodyObjects3D.keys()), time);
                this.addUpdater(new BodiesAtTimeUpdater(kinematics, time));
            } catch (e) {
                console.log(e)
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

    setCameraTargetingMode(cameraMode: CameraMode) {
        if (this.cameraTargetingState.cameraMode == cameraMode) {
            return;
        }

        if (cameraMode == CameraModes.ViewTargetFromSurface) {
            if (this.getLocationPin() == undefined) {
                throw new Error("To select 'ViewTargetFromSurface' camera mode, you must have a surface location set.");
            }
            if (this.target == this.getBodyObject3D("earth")) {
                throw new Error("To select 'ViewTargetFromSurface' camera mode, you must have a target other than Earth.");
            }
        }

        this.cameraTargetingState = cameraMode.stateBuilder(this);
        this.cameraTargetingState.moveToTarget(this.getBodyObject3DTarget(), true);
    }

    getLocation(): LatLon | undefined {
        return this.getLocationPin()?.latlon;
    }

    setLocation(latlon: LatLon | undefined) {
        if (this.locationPin?.latlon == latlon) {
            return;
        }
        this.setLocationPin(latlon !== undefined ? new LocationPin(latlon, this.getBodyObject3D("earth"),  "#00FF00", "ViewerPosition") : undefined);
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
        options.orbitalOutlinesOpacity = this.orbitOutlinesStateHandler.getOrbitalOutlinesOpacity();
        options.orbitalOutlinesLength = this.orbitOutlinesStateHandler.getOrbitalOutlineLength();

        return options;
    }

    isLayerEnabled(layer: CameraLayer): boolean {
        return this.camera.layers.isEnabled(layer);
    }

    setLayerEnabled(value: boolean, layer: CameraLayer) {
        value ? this.camera.layers.enable(layer) : this.camera.layers.disable(layer);
    }

    setCameraUp(v = new Vector3(0, 1, 0)) {
        this.camera.up.set(v.x, v.y, v.z);
    }

    getDistanceFormatter(): DistanceFormatter {
        return this.distanceformatter;
    }

    getBodyObject3D(name: string): BodyObject3D {
        return this.bodyObjects3D.get(name.toLowerCase())!
    }

    getBody(name: string): Body {
        return this.bodyObjects3D.get(name.toLowerCase())!.body;
    }

    setShadowsEnabled(value: boolean) {
        const starBodies = [...this.bodyObjects3D.values()]
            .filter((bodyObject: BodyObject3D) => bodyObject instanceof StarBodyObject3D) as StarBodyObject3D[];

        starBodies.forEach(it => it.setShadowsEnabled(value));
    }

    getShadowsEnabled(): boolean {
        const starBodies: StarBodyObject3D[] = [...this.bodyObjects3D.values()]
            .filter((bodyObject: BodyObject3D) => bodyObject.body.type == "star") as StarBodyObject3D[]; // instanceof StarBodyObject3D) as StarBodyObject3D[];
        return starBodies.reduce((prev: boolean, current) => (current.getShadowsEnabled() && prev), true);
    }

    // setOrbitalOutlinesEnabled(value: boolean) {
    //     [...this.bodyObjects3D.values()]
    //     .filter(b => b.body.type == "planet")
    //     .forEach(b => b.setOrbitOutlineEnabled(value));

    //     // moon orbits are only shown if their planet is the target
    //     [...this.bodyObjects3D.values()]
    //     .filter(b => b.body.type == "moon")
    //     .forEach(b => b.setOrbitOutlineEnabled(b.isPlanetarySystemSelected() && value ))
    // }

    // getOrbitalOutlinesEnabled(): boolean {
    //     const firstBody = [...this.bodyObjects3D.values()].find(v => v.body.type == "planet")!;
    //     return firstBody.orbitOutline.enabled;
    // }

    // setOrbitalOutlinesOpacity(value: number) {

    //     for(const bodyObject3D of this.bodyObjects3D.values()){
    //         bodyObject3D.orbitOutline.opacity = value;
    //     }
    // }    
    // getOrbitalOutlinesOpacity(): number {
    //     const [firstBody] = this.bodyObjects3D.values();
    //     return firstBody.orbitOutline.opacity;
    // }

    // setOrbitalOutlineLength(value: OrbitLength){
    //     console.log("Line :"+value.lengthType + ", "+value.value)
    //     for(const bodyObject3D of this.bodyObjects3D.values()){
    //         // if(bodyObject3D.getName() === "Earth"){
    //             bodyObject3D.orbitOutline.orbitLength = value;

    //         // }
    //     }
    // }

    // // getOrbitalOutlineLength(): OrbitLength {
    // //     const body = this.getBodyObject3D("Earth");
    // //     return body.orbitOutline.orbitLength;
    // // }

    // getOrbitalOutlineLength(): OrbitLength{
    //     const [firstBody] = this.bodyObjects3D.values();
    //     return firstBody.orbitOutline.orbitLength;

    // }

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

        this.bodyObjects3D.forEach((body) => {
            body.scale(scale);
        });
    }

    getAmbiantLightLevel(): number {
        return this.ambiantLight.intensity;
    }

    setAmbiantLightLevel(level: number) {
        this.ambiantLight.intensity = level;
    }

    getFov(): number {
        return this.camera.getEffectiveFOV();
    }

    setFOV(fov: number) {
        this.camera.fov = fov;
        this.camera.updateProjectionMatrix();
    }

    getTarget(): BodyObject3D{
        return this.target;
    }

    getBodyObject3DTarget(): BodyObject3D {
        return this.target;
    }

    moveToTarget(bodyObject3D: BodyObject3D, forceMoveCloser = false) {
        if (this.getBodyObject3DTarget() == bodyObject3D && !forceMoveCloser) {
            return;
        }

        if (bodyObject3D == this.getBodyObject3D("earth") && this.getCameraTargetingMode() == CameraModes.ViewTargetFromSurface) {
            throw new Error("Can't select Earth as target while viewing from Earth's surface.");
        }

        this.cameraTargetingState.moveToTarget(bodyObject3D, forceMoveCloser);
    }

    initializeOrbitOutlines(){

                // const planets = [...this.bodyObjects3D.values()]
                // .filter(o => o.body.type == "planet")
                // // .filter(o=>o.getName() == "Earth")
                // .forEach(o => o.orbitOutline.createOrbit());


    }

    /**
     * Used for tracking a body frame to frame.
     *  
     * @param body
     * @param moveToTarget 
     */
    followTarget(body: BodyObject3D) {
        this.cameraTargetingState.followTarget(body);
    }



    setTarget(bodyObject3D: BodyObject3D | string | undefined) {
        if (bodyObject3D == undefined) return;

        if (typeof bodyObject3D === "string") {
            bodyObject3D = this.getBodyObject3D(bodyObject3D);
        }

        if (this.target != bodyObject3D) {
            this.target = bodyObject3D;
            this.cameraTargetingState.postTargetSet(bodyObject3D);
            this.fireEvent({ topic: BODY_SELECT_TOPIC.toString(), message: { body: bodyObject3D } });
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
        const moon = this.getBodyObject3D("moon");

        if (shadowType == ShadowType.Umbra && this.getBodyObject3DTarget().getName().toLocaleLowerCase() == "earth"
            && this.getBodyObject3DTarget().cameraDistance() < 384400 && moon.cameraDistance() < 384400) {
            const moon = this.getBodyObject3D("moon");
            const radius = moon.body.radius;
            const umbraRadius = 100e3;
            const scale = umbraRadius / radius;

            moon.scale(scale);
        } else {
            const moon = this.getBodyObject3D("moon");
            moon.scale(this.scale);

        }

    }


    start() {
        this.clock.enableTimePublisher(true);
        this.render();
        const timer = this.clock.startTimer("AnimationTimer");
        this.controls.enabled = true;

        this.renderer.setAnimationLoop(async () => {
            const delta = timer.getDelta()!;
            await this.tick(delta);
            
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

    fireEvent(event: BodySystemEvent<BodySelectEventMessageType>) {
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
    tick(deltaTime: number) {
        return new Promise((resolve) => {
            this.bodySystemUpdater.update(this.bodyObjects3D, deltaTime, this.clock);
            resolve(null);
        });
    }


    stop() {
        this.clock.enableTimePublisher(false);
        this.renderer.setAnimationLoop(null);
    }

    render() {
        this.renderer.render(this.scene, this.camera);
        this.labelRenderer.render(this.scene, this.camera);
    }

    /** 
     * @param bodies 
     * @returns Map<string, BodyObject3D> 
     */
    createObjects3D(bodies: Body[]): Map<string, BodyObject3D> {
        return bodies.reduce((m: Map<string, BodyObject3D>, body: Body) =>
            m.set(body.name.toLowerCase(), BodyObject3DFactory.create(body, this)),
            new Map<string, BodyObject3D>()
        );
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
    return labelRenderer;
}

function createControls(camera: Camera, domElement: HTMLElement): OrbitControls {
    const controls = new OrbitControls(camera, domElement);
    controls.enableDamping = true;
    return controls;
}