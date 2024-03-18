import { AmbientLight, AxesHelper, Camera, Color, DirectionalLightHelper, PCFShadowMap,  PerspectiveCamera, Scene, Vector3, WebGLRenderer } from 'three';
import { Dim, DistanceUnit, DistanceUnits, LatLon, WindowSizeObserver } from '../system/geometry.ts';
import { Body } from '../domain/Body.ts';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { BodySystemUpdater } from '../body/BodySystemUpdater.ts';
import { BodyObject3D } from '../mesh/BodyObject3D.ts';
import { throttle } from "../system/timing.ts";
import Stats from 'three/addons/libs/stats.module.js';
import PubSub from 'pubsub-js';
import { BODY_SELECT_TOPIC, BodySelectEventMessageType } from '../system/event-types.ts';
import { Clock } from '../system/timing.ts';
import { Vector } from '../system/vecs.ts';
import { Picker } from './Picker.ts';
import { BodyObject3DFactory } from '../mesh/Object3DBuilder.ts';
import { CompositeUpdater } from '../body/CompositeUpdater.ts';
import { VectorComponents } from '../domain/models.ts';
import { StarBodyObject3D } from '../mesh/StarBodyObject3D.ts';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import * as TWEEN from '@tweenjs/tween.js';
import { LocationPin } from '../mesh/LocationPin.ts';
import { CameraTargetingState, CameraMode, CameraModes } from './CameraTargetingState.ts';

const CAMERA_NEAR = 1000;
const CAMERA_NEAR_FROM_SURFACE = 1;
const CAMERA_FAR = 13000000000;


export class DistanceFormatter {
    
    distanceUnit: DistanceUnit;

    constructor(unit: DistanceUnit){
        this.distanceUnit = unit;
    }

    format(distance: number): string {
        function formatNumber(n: number, decimals: number = 0): string {
            return n.toLocaleString(undefined, {maximumFractionDigits: decimals})
        }
        
        const decimals = this.distanceUnit == DistanceUnits.au? 3:0;
        return formatNumber(distance/this.distanceUnit.conversion, decimals).concat( " ", this.distanceUnit.abbrev);
    }
};


export enum CameraLayer {
    NameLabel=2,
    DistanceLabel=3,
    ElevationAzimuthLabel=4,
};

export type BodySystemEvent<T> = {
    topic: string;
    message: T;
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
    distanceUnit?: DistanceUnit;
    location?: LatLon;
    showNames?: boolean;
    showVelocities?: boolean;
    showAltitudeAzimuth?: boolean;
    targettingCameraMode?: CameraMode;
};

/**
 * Our system Facade
 */
export class BodySystem {
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
    primeMeridianLocationPin ?: LocationPin;

    cameraTargetingState: CameraTargetingState;

    constructor(parentElement: HTMLElement, bodies: Body[], bodySystemUpdater: BodySystemUpdater, { 
            cameraPosition, targetPosition, target = "Earth", sizeScale = 1.0, timeScale = 1.0, fov = 35, 
            ambientLightLevel = 0.025, showAxes = false, date = Date.now(), castShadows = false, distanceUnit = DistanceUnits.km,
            showNames = true, showVelocities = false, showAltitudeAzimuth=true,
            location = new LatLon(43.3651712, -73.6231424), targettingCameraMode = CameraModes.FollowTarget}: BodySystemOptionsState) {
        
        const targetName = target;
        const canvasSize = new Dim(parentElement.clientWidth, parentElement.clientHeight);
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
        this.setAxesHelper(showAxes);
        this.setScale(sizeScale);
        this.setTimeScale(timeScale)
        this.setFOV(fov);
        this.setSize(canvasSize);
        this.picker = new Picker(this);
        setupResizeHandlers(parentElement, (size: Dim) => this.setSize(size));
        this.setShadowsEnabled(castShadows);
        this.setLayerEnabled(showNames, CameraLayer.NameLabel);
        this.setLayerEnabled(showVelocities, CameraLayer.DistanceLabel);
        this.setLayerEnabled(showAltitudeAzimuth, CameraLayer.ElevationAzimuthLabel);
        this.primeMeridianLocationPin = this.setPrimeMeridian();

        if(location){
            this.setLocation(location);
        }        
        this.cameraTargetingState = targettingCameraMode.stateBuilder(this)
        this.cameraTargetingState.postTargetSet(this.target);
    }

    getCameraTargetingState(): CameraTargetingState{
        return this.cameraTargetingState;
    }

    getCameraTargetingMode(): CameraMode {
        return this.cameraTargetingState.cameraMode;
    }

    setCameraTargetingMode(cameraMode: CameraMode) {
        if (this.cameraTargetingState.cameraMode == cameraMode){
            return;
        }

        if(cameraMode == CameraModes.ViewTargetFromSurface){
            if(this.getLocationPin() == undefined){
                throw new Error("To select 'ViewTargetFromSurface' camera mode, you must have a surface location set.");
            }
            if( this.target == this.getBodyObject3D("earth")){
                throw new Error("To select 'ViewTargetFromSurface' camera mode, you must have a target other than Earth.");
            }
        }
        
        this.cameraTargetingState = cameraMode.stateBuilder(this);
        this.cameraTargetingState.moveToTarget(this.getBodyObject3DTarget(), true);
    }

    getLocation(): LatLon | undefined {
        // just an alias for the underlying pin
        return this.getLocationPin()?.latlon;
    }

    getEast(){
        const meridian = this.primeMeridianLocationPin;
        const normal = meridian?.getLocationPinNormal();
        return normal;
    }

    /**
     * we set pin at 0,0 on earth to represent its prime meridian, 
     * this makes it easy to track.
     * 
     * @returns 
     */
    setPrimeMeridian(){
        // adds a location at 0,0 on earth
        const primeMeridianLocationPin = new LocationPin(new LatLon(0,0), this.getBodyObject3D("earth"), "#00FF00", false);        
        this.primeMeridianLocationPin?.remove();
        this.primeMeridianLocationPin = primeMeridianLocationPin;
        return primeMeridianLocationPin;
    }


    setLocation(latlon: LatLon){
        // just an alias for setting a pin, right now we just set those on earth...
        // would be trivial to set this up to work anywhere.
        if (this.locationPin?.latlon == latlon){
            return;
        }
        this.setLocationPin(new LocationPin(latlon, this.getBodyObject3D("earth"), "#00FF00"));
    }

    getLocationPin(): LocationPin| undefined{
        return this.locationPin;
    }

    setLocationPin(locationPin: LocationPin){        
        this.locationPin?.remove();
        this.locationPin = locationPin;
    }

    setDistanceUnit(distanceUnit: DistanceUnit){
        this.distanceformatter = new DistanceFormatter(distanceUnit);
    }

    getDistanceUnit(): DistanceUnit {
        return this.distanceformatter.distanceUnit;
    }

    setState(state: Required<BodySystemOptionsState>) {
        // this kind of ends up being realized by the ui's "loadSettings" action.
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
        options.castShadows = this.areShadowsEnabled();
        options.date = this.clock.getTime();

        options.showNames = this.isLayerEnabled(CameraLayer.NameLabel);
        options.showVelocities = this.isLayerEnabled(CameraLayer.DistanceLabel);
        options.showAltitudeAzimuth = this.isLayerEnabled(CameraLayer.ElevationAzimuthLabel);
        options.location = this.getLocation();
        options.targettingCameraMode = this.getCameraTargetingMode();
        return options;
    }

    isLayerEnabled(layer: CameraLayer): boolean {
        return this.camera.layers.isEnabled(layer);
    }

    setLayerEnabled(value: boolean, layer: CameraLayer){
        if(value){
            if(!this.isLayerEnabled(layer)){
                this.camera.layers.enable(layer);
            }
        }else{
            if(this.isLayerEnabled(layer)){
                this.camera.layers.disable(layer);
            }
        }
    }

    setCameraUp(v = new Vector3(0, 1, 0)) {
        this.camera.up.set(v.x, v.y, v.z);
    }

    getDistanceFormatter(): DistanceFormatter {
        return this.distanceformatter;
    }

    // getDistance(targetBody: Body): number {
    //     const targetPosition = new Vector3(targetBody.position.x, targetBody.position.y, targetBody.position.z);
    //     // todo: need to deal with those units somehow. Having the view using km and the body itself meters is error prone.
    //     return this.camera.position.distanceTo(targetPosition.divideScalar(1000));
    // }

    // getDistanceFromSurface(bodyObject3D: BodyObject3D){
    //     return bodyObject3D.cameraDistanceFromSurface();
    // }

    // fix... bodyObject3D vs Object3D is not something we should deal with
    getBodyObject3D(name: string): BodyObject3D {
        return this.bodyObjects3D.get(name.toLowerCase())!
    }

    //fix...see above
    getBody(name: string): Body {
        return this.bodyObjects3D.get(name.toLowerCase())!.body;
    }

    /**
     * Enables/Disables all light sources to cast shadows.
     * 
     * @param value to cast or not!
     */
    setShadowsEnabled(value: boolean){
        const starBodies: StarBodyObject3D[] = [...this.bodyObjects3D.values()]
                        .filter( (bodyObject: BodyObject3D) => bodyObject instanceof StarBodyObject3D) as StarBodyObject3D[];
        starBodies.forEach(it => it.setShadowsEnabled(value));

        // todo: add this in tools section.
        // if(value){
        //     const light = (this.getBodyObject3D("sun") as StarBodyObject3D).shadowingLight!;
        //     const lightHelper = new DirectionalLightHelper(light, 400000);
        //     this.lightHelper = lightHelper;
        //     lightHelper.update();
        //     this.scene.add( lightHelper );

        // }else{
        //     this.lightHelper?.removeFromParent();
        //     this.lightHelper?.dispose();
        // }      
    }

    /**
     * @returns true if some light sources areShadowsEnabled.
     */
    areShadowsEnabled(): boolean {
        const starBodies: StarBodyObject3D[] = [...this.bodyObjects3D.values()]
                        .filter( (bodyObject: BodyObject3D) => bodyObject instanceof StarBodyObject3D) as StarBodyObject3D[];
        return starBodies.reduce((prev: boolean, current) => (current.areShadowsEnabled() && prev), true);
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

    getTimeScale(): number {
        return this.clock.scale;
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

        this.bodyObjects3D.forEach((m) => {
            m.scale(scale);
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

    getBodyObject3DTarget(): BodyObject3D {
        return this.target;
    }
    
    moveToTarget(bodyObject3D: BodyObject3D, forceMoveCloser = false){
        if(this.getBodyObject3DTarget() == bodyObject3D && !forceMoveCloser){
            return;
        }

        if(bodyObject3D == this.getBodyObject3D("earth") && this.getCameraTargetingMode() == CameraModes.ViewTargetFromSurface){
            throw new Error("Can't select Earth as target while viewing from Earth's surface.");
        }
        
        this.cameraTargetingState.moveToTarget(bodyObject3D, forceMoveCloser);
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
        if(bodyObject3D == undefined){
            return;
        }

        if (typeof bodyObject3D === "string") {
            bodyObject3D = this.getBodyObject3D(bodyObject3D);
            if(bodyObject3D == undefined){
                return;
            }
        }

        if (this.target != bodyObject3D) {
            this.target = bodyObject3D;
            this.cameraTargetingState.postTargetSet(bodyObject3D);
            this.fireEvent({ topic: BODY_SELECT_TOPIC.toString(), message: { body: bodyObject3D } });        
        }
    }


    start() {
        this.clock.enableTimePublisher(true);
        //this.camera.layers.enableAll();
        this.render();
        const timer = this.clock.startTimer("AnimationTimer");
        this.controls.enabled = true;

        this.renderer.setAnimationLoop(async () => {
            const delta = timer.getDelta()!;
            await this.tick(delta);
            this.controls.update();

            if(this.controls.enabled){
                this.followTarget(this.target);
            }
            TWEEN.update();
            // this.lightHelper?.update();
            this.render();
            this.updateStats();
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
        return bodies.reduce( (m: Map<string, BodyObject3D>, body: Body) => 
                    m.set(body.name.toLowerCase(), BodyObject3DFactory.create(body, this)),
                    new Map<string, BodyObject3D>()
        );
    }
}


function createAmbiantLight(intensity: number) {    
    return new AmbientLight("white", intensity);
}


function setupResizeHandlers(container: HTMLElement, sizeObserver: WindowSizeObserver) {
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
    const renderer  = new WebGLRenderer({ antialias: true });
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