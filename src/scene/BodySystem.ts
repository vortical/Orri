import { AmbientLight, AxesHelper, Camera, Color, DirectionalLightHelper, Object3D, PCFShadowMap, PCFSoftShadowMap, PerspectiveCamera, Renderer, Scene, TextureLoader, Vector3, WebGLRenderer } from 'three';
import { Dim, WindowSizeObserver } from '../system/geometry.ts';
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




export enum CameraLayer {
    NameLabel=2,
    InfoLabel=3
}


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
}

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
    target: Body
    scale: number = 1.0;
    clock: Clock;
    picker: Picker;
    axesHelper?: AxesHelper;
    parentElement: HTMLElement;
    lightHelper?: DirectionalLightHelper;
    size!: Dim;
    labelRenderer: CSS2DRenderer;

    constructor(parentElement: HTMLElement, bodies: Body[], bodySystemUpdater: BodySystemUpdater, { cameraPosition, targetPosition, target = "Earth", sizeScale = 1.0, timeScale = 1.0, fov = 35, ambientLightLevel = 0.025, showAxes = false, date = Date.now(), castShadows = false}: BodySystemOptionsState) {
        const canvasSize = new Dim(parentElement.clientWidth, parentElement.clientHeight);
        this.parentElement = parentElement;
        this.clock = new Clock(date);
        this.addUpdater(bodySystemUpdater);
        this.bodies = bodies;
        this.camera = createCamera();
        this.scene = createScene();
        this.renderer = createRenderer();

        document.body.appendChild(this.renderer.domElement);
        parentElement.append(this.renderer.domElement);

        this.labelRenderer = createLabelRender();

//        document.body.appendChild(this.labelRenderer.domElement);
        parentElement.append(this.labelRenderer.domElement);


        this.bodyObjects3D = this.createObjects3D(this.bodies);
        this.controls = createControls(this.camera, this.labelRenderer.domElement);
        this.controls.enabled = false;
        this.target = this.getBody(target);
        targetPosition = targetPosition || new Vector(this.getBody(target).position.x / 1000, 0, 0);
        cameraPosition = cameraPosition || new Vector(this.getBody(target).position.x / 1000, 0, this.getBody(target).radius / 100);
        this.setViewPosition(cameraPosition, targetPosition);
        this.ambiantLight = createAmbiantLight(ambientLightLevel);
        this.scene.add(this.ambiantLight);
        this.controls.update();

        // todo: Consider composite class (i.e."BodyObjects3D") that holds our 3D object to avoid code like this
        this.scene.add(...Array.from(this.bodyObjects3D.values()).map(o => o.object3D));
        this.setTarget(target);
        this.setAxesHelper(showAxes);
        this.setScale(sizeScale);
        this.setTimeScale(timeScale)
        this.setFOV(fov);
        this.setSize(canvasSize);
        this.picker = new Picker(this);
        setupResizeHandlers(parentElement, (size: Dim) => this.setSize(size));
        this.setShadowsEnabled(castShadows);
    }

    setState(state: Required<BodySystemOptionsState>) {
        // this kind of ends up being realized by the ui's "loadSettings" action.
    }

    getState(): BodySystemOptionsState {
        const options: BodySystemOptionsState = {};
        options.cameraPosition = { x: this.camera.position.x, y: this.camera.position.y, z: this.camera.position.z };
        options.targetPosition = { x: this.controls.target.x, y: this.controls.target.y, z: this.controls.target.z };
        options.target = this.target?.name || "";
        options.sizeScale = this.getScale();
        options.timeScale = this.getTimeScale();
        options.fov = this.getFov();
        options.ambientLightLevel = this.getAmbiantLightLevel();
        options.showAxes = this.hasAxesHelper();
        options.castShadows = this.areShadowsEnabled();
        options.date = this.clock.getTime();
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

    setCameraUp(v: Vector3 = new Vector3(0, 1, 0)) {
        this.camera.up.set(v.x, v.y, v.z);
    }

    getDistance(targetBody: Body): number {
        const targetPosition = new Vector3(targetBody.position.x, targetBody.position.y, targetBody.position.z);
        // todo: need to deal with those units somehow. Having the view using km and the body itself meters is error prone.
        return this.camera.position.distanceTo(targetPosition.divideScalar(1000));
    }

    // fix... bodyObject3D vs Object3D is not something we should deal with
    getBodyObject3D(name: string): BodyObject3D {
        return this.bodyObjects3D.get(name.toLowerCase())!
    }
    // fix... bodyObject3D vs Object3D is not something we should deal with
    getObject3D(name: string): Object3D {
        return this.bodyObjects3D.get(name.toLowerCase())!.object3D;
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
     * @returns true if all light sources areShadowsEnabled.
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


    /**
     * todo, set target vs get target... not same type
     */
    getBodyObject3DTarget(): BodyObject3D {
        const targetBody = this.target;
        return this.getBodyObject3D(targetBody.name);
    }

    /**
     * todo: this algorythm should be something dynamic/variable
     * 
     * @param body 
     * @param moveToTarget 
     */
    setTarget(body: Body | string, moveToTarget: boolean = true) {
        if (typeof body === "string") {
            body = this.getBody(body);
        }

        if (this.target != body) {
            // um if the target is really changed ... then we also fire an event.
            // this method needs to be modified as its used for both changing the target
            // and point the camera/controls to the target.
            this.fireEvent({ topic: BODY_SELECT_TOPIC.toString(), message: { body: this.getBodyObject3D(body.name) } });
        }

        this.target = body;

        if (moveToTarget) {
            // keep same distance...
            const cameraPosition = this.camera.position.clone();
            const target = this.controls.target.clone();
            const targetTranslation = cameraPosition.sub(target);
            this.controls.target.set(body.position.x / 1000, body.position.y / 1000, body.position.z / 1000);
            this.camera.position.set(this.controls.target.x + targetTranslation.x, this.controls.target.y + targetTranslation.y, this.controls.target.z + targetTranslation.z);
        } else {
            // just point controls...
            this.controls.target.set(body.position.x / 1000, body.position.y / 1000, body.position.z / 1000);
        }
    }

    setViewPosition(cameraPosition: VectorComponents, target: VectorComponents) {
        this.controls.target.set(target.x, target.y, target.z!);
        this.camera.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z!);
    }

    followTarget(body: Body | string) {
        if (typeof body === "string") {
            body = this.getBody(body);
        }
        this.setTarget(body, true);
    }

    fireEvent(event: BodySystemEvent<BodySelectEventMessageType>) {
        PubSub.publish(event.topic, event.message);
    }

    /**
     * 
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

    tick(deltaTime: number) {
        return new Promise((resolve) => {
            this.bodySystemUpdater.update(this.bodyObjects3D, deltaTime, this.clock);
            resolve(null);
        });
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
            this.followTarget(this.target);
            this.controls.update();
            // this.lightHelper?.update();
            this.render();
            this.updateStats();
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
     * Build a map-of(name->BodyObject3D) from a Body[]
     * 
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

function createAmbiantLight(ambientLightLevel: number) {
    const ambientLight = new AmbientLight("white", ambientLightLevel);
    return ambientLight;
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

function createCamera({ fov = 35, aspectRatio = 1.0, near = 500, far = 13000000000 } = {}): PerspectiveCamera {
    return new PerspectiveCamera(
        fov,
        aspectRatio,
        near,
        far
    );
}

function createRenderer(): WebGLRenderer {
    const renderer  = new WebGLRenderer({ antialias: true });
    renderer.shadowMap.enabled = true;
    // renderer.shadowMap.type = PCFSoftShadowMap; 
    renderer.shadowMap.type = PCFShadowMap;

    // renderer.cul
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