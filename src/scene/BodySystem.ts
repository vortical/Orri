import { AmbientLight, AxesHelper, Camera, Color, DirectionalLight, HemisphereLight, Mesh, Object3D, PerspectiveCamera, PointLight, Raycaster, Scene, Vector2, Vector3, WebGLRenderer } from 'three';
import { Dim, WindowSizeObserver, toRad } from '../system/geometry.ts';
import { Body } from '../body/Body.ts';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';


import { BodySystemUpdater } from '../body/BodySystemUpdater.ts';
import { BodyObject3D } from '../mesh/BodyObject3D.ts';
import { throttle } from '../system/throttler.ts';

import Stats from 'three/addons/libs/stats.module.js';

import PubSub from 'pubsub-js';

import { MOUSE_HOVER_OVER_BODY_TOPIC, MOUSE_CLICK_ON_BODY_TOPIC, SYSTEM_TIME_TOPIC, BODY_SELECT_TOPIC } from '../system/event-types.ts';

import { Clock, Timer } from '../system/timing.ts';
import { Vector } from '../system/vecs.ts';
import { Picker } from './Picker.ts';


// type PickerHandler = (c: Vector) => Body|null;
type Animator = (time: number) => boolean;


type BodySystemEvent = {
    topic: string,
    message: any
};
   

//https://sahadar.github.io/pubsub/#installation
//https://www.npmjs.com/package/pubsub-js



export type BodySystemOptionsState = {
    // viewer position,
    // pos: Vector
    // target or direction
    cameraPosition?: Vector,
    targetPosition?: Vector,
    target?: string,
    sizeScale?: number,
    timeScale?: number,
    fov?: number,
    ambientLightLevel?: number,
    showAxes?: boolean
}



export class BodySystem {

    bodySystemUpdater: BodySystemUpdater;
    bodies: Body[];
    camera: PerspectiveCamera;
    scene: Scene;
    renderer: WebGLRenderer;
    controls: OrbitControls;
    objects3D: Object3D[];
    ambiantLight: AmbientLight;
    stats?: Stats;
    target?: Body
    scale: number = 1.0;

    clock: Clock;
    picker: Picker;// = new Raycaster();

    // timeStep: number = 1.0;
    // viewTransitions: ViewTransitions;
    axesHelper?: AxesHelper;
    parentElement:HTMLElement;
    

    // constructor(parentElement:HTMLElement, bodies:Body[], bodySystemUpdater: BodySystemUpdater, optionState: OptionsState){
    constructor( parentElement:HTMLElement, bodies:Body[], bodySystemUpdater: BodySystemUpdater,
         {cameraPosition, targetPosition, target="Earth", sizeScale=1.0, timeScale=1.0, fov=35, ambientLightLevel=0.01, showAxes=false}:BodySystemOptionsState ){
        
        const canvasSize = new Dim(parentElement.clientWidth, parentElement.clientHeight);
        this.parentElement = parentElement;        
    
        this.clock = new Clock();
        this.bodySystemUpdater = bodySystemUpdater;
        this.bodies = bodies;


        this.camera = createCamera();
        this.scene = createScene();
        // this.scene.add(this.camera);
        this.renderer = createRenderer();
        parentElement.append(this.renderer.domElement);

        // this has to be dealt with
        this.controls = createControls(this.camera, this.renderer.domElement);
        this.controls.enabled = false;

        targetPosition = targetPosition || {x: this.getBody(target).position.x/1000, y:0, z: 0}
        cameraPosition = cameraPosition || {x: this.getBody(target).position.x/1000, y:0, z: this.getBody(target).radius/100};
        this.setViewPosition(cameraPosition, targetPosition);

        // this.camera.position.set(position.x, position.y, position.z!)

        // this.viewTransitions = new ViewTransitions(this.camera, this.controls);
        this.objects3D = createObjects3D(this.bodies);

        this.ambiantLight = createAmbiantLight();
        this.scene.add(this.ambiantLight);

        this.controls.update();
        this.scene.add(...this.objects3D);
        
        this.setTarget(target);        
        this.setAxesHelper(showAxes);
        this.setScale(sizeScale);
        this.setTimeScale(timeScale)
        this.setFOV(fov);
        this.setAmbiantLightLevel(ambientLightLevel);
        this.setSize(canvasSize);
        
        this.picker = new Picker(this);

        setupResizeHandlers(parentElement, (size: Dim) => this.setSize(size));
        
    }

    /**
     * 
     * TODO: enable to change the entire state in once call. Usefull for example to handle the back button without
     * a full page refresh
     * 
     * @param state 
     */
    setState(state: Required<BodySystemOptionsState>){
        // this would enable 

        
    //     this.setViewPosition(state.cameraPosition, state.targetPosition);


    //     // this.viewTransitions = new ViewTransitions(this.camera, this.controls);
    //     this.objects3D = createObjects3D(this.bodies);

    //     this.ambiantLight = createAmbiantLight();
    //     this.scene.add(this.ambiantLight);

    //     this.controls.update();
    //     this.scene.add(...this.objects3D);
        
    //     this.setTarget(target);        
    //     this.setAxesHelper(showAxes);
    //     this.setScale(sizeScale);
    //     this.setTimeScale(timeScale)
    //     this.setFOV(fov);
    //     this.setAmbiantLightLevel(ambientLightLevel);
        



    }

    getState(): BodySystemOptionsState {
        const options: BodySystemOptionsState  = {};
        options.cameraPosition = {x: this.camera.position.x, y: this.camera.position.y, z: this.camera.position.z};
        options.targetPosition = {x: this.controls.target.x, y: this.controls.target.y, z: this.controls.target.z};
        options.target = this.target?.name || "";
        options.sizeScale = this.getScale();
        options.timeScale = this.getTimeScale();
        options.fov = this.getFov();
        options.ambientLightLevel = this.getAmbiantLightLevel();
        options.showAxes = this.hasAxesHelper();

        return options;            
        

    }
// function getCurrentState(): object {

//     // var center = coordinateTransformation.getCenter();
//     // var eye = view.getEye();
//     // var target = view.getTarget();
//     // var verticalExaggeration = view.getVerticalExaggeration();

//     // var switchedOnGeologies = getSwitchedOnGeologies();
//     // return {
//     //   lat: Number( (center.lat * 180/Math.PI).toFixed(9)),
//     //   lon: Number( (center.lon * 180/Math.PI).toFixed(9)),
//     //   eye: eye.map(function(x){return Number( x.toFixed(0));}),
//     //   target: target.map(function(x){return Number(x.toFixed(0));}),


//     return {

//     };
// }
//     }

    setCameraUp(v: Vector3 = new Vector3(0,1,0) ){
        this.camera.up.set(v.x, v.y, v.z);
        // this.camera.upd
        // this.camera.updateProjectionMatrix();
    }

    getDistance(targetBody: Body): number {
        const targetPosition = new Vector3(targetBody.position.x, targetBody.position.y, targetBody.position.z);
        // todo: need to deal with those units somehow. Having the view using km and the body itself meters is error prone.
        return this.camera.position.distanceTo(targetPosition.divideScalar(1000));
    }


    getBody(name: string): Body {
        name = name.toLowerCase();
        return this.bodies.find((b)=> b.name.toLowerCase() === name)!;
    }

    hasStats(): boolean  {
        return this.stats != undefined && this.stats.dom.style.display !== "none";
    }

    updateStats() {
        this.stats && this.stats.update();        
    }

    showStats(value: boolean){

        if(value && this.stats == undefined){
            this.stats = new Stats();        
            this.parentElement.appendChild(this.stats.dom);
        }else if (value && this.stats){
            this.stats.dom.style.display = "block"; 
        }else if(value == false && this.stats){
            this.stats.dom.style.display = "none";
        }         
    }

    hasAxesHelper(): boolean {
        return this.axesHelper != undefined;
    }

    setAxesHelper(value: boolean){
        if(value && this.axesHelper == undefined){
            this.axesHelper = new AxesHelper( 5000000000 );        
            this.scene.add( this.axesHelper  );
        }else if(value == false && this.axesHelper){
            this.axesHelper.removeFromParent();
            this.axesHelper.dispose();
            this.axesHelper = undefined;
        }
    }

    getTimeScale(): number {
        return this.clock.scale;
    }

    /**
     *        
     *      
     * @param timeScale 
     */
    setTimeScale(timesScale: number){
        this.clock.setScale(timesScale)
    }

    setDatetime(isoString: string){
        // TO: this will also require us to rebuild the model from
        // a service that gives us positions/speeds at that time
        
        this.clock.setTime(new Date(isoString).getTime());
        this.updateKinematics(this.clock.getTime());
    }

    updateKinematics(time: number){

    }



    getScale(): number {
        return this.scale;
    }

    setScale(scale: number){
        this.scale = scale;

        this.objects3D.forEach((m) => {
            m.scale.set(scale, scale, scale);
        });

    }

    getAmbiantLightLevel(): number {
        return this.ambiantLight.intensity;
    }

    setAmbiantLightLevel(level: number){
        this.ambiantLight.intensity = level;
    }

    getFov(): number {
        return this.camera.getEffectiveFOV();
    }

    setFOV(fov: number){
        this.camera.fov = fov;        
        this.camera.updateProjectionMatrix();
    }


    // followTarget(){



    // }

    setTarget(body: Body|string, moveToTarget: boolean = true){
        
        
        if (typeof body === "string") {
            body = this.getBody(body);

        }
        if(this.target != body){
            this.fireEvent({topic: BODY_SELECT_TOPIC.toString(), message: {body: body}});
        }

        this.target = body;
        
        
        if (moveToTarget){
            // keep same distance...
            const cameraPosition = this.camera.position.clone();
            const target = this.controls.target.clone();
            const targetTranslation = cameraPosition.sub(target);
            this.controls.target.set(body.position.x/1000, body.position.y/1000, body.position.z/1000);        
            this.camera.position.set(this.controls.target.x+targetTranslation.x, this.controls.target.y+targetTranslation.y, this.controls.target.z+targetTranslation.z);
        }else{
            // just point controls...
            this.controls.target.set(body.position.x/1000, body.position.y/1000, body.position.z/1000);        
        }
        
        
    }

    setViewPosition(cameraPosition: Vector, target: Vector){
        this.controls.target.set(target.x, target.y, target.z!);        
        this.camera.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z!);
    }
    
    followTarget(body: Body|string) {
        if (typeof body === "string") {
            body = this.getBody(body);
        }
        this.setTarget(body, true);
    }


    fireEvent(event : BodySystemEvent){
        PubSub.publish(event.topic, event.message); 
    }


    setSize(size: Dim){
        this.camera.aspect = size.ratio();
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(size.w, size.h);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.render();   
    }

     tick(deltaTime: number) {
        const that = this
        return new Promise(function(resolve){

            that.bodySystemUpdater.update(that.bodies, deltaTime).forEach((body: Body, i: string | number ) => {
                BodyObject3D.updateObject3D(body, that.objects3D[i]);
            });
            resolve(null);
    
        });
    }

    start() {
        
        this.clock.enableTimePublisher(true);
        
        this.render();

        const timer = this.clock.startTimer("AnimationTimer");
        this.controls.enabled = true;

        /**
         * The clock has a delta, which says how much time the previous frame took.
         * 
         * Real time is 60 fps (depends on monitor).
         * 
         * Each tick in my update expect a delta time in second.
         * 
         * 
         */
        this.renderer.setAnimationLoop( async() => {
            const delta = timer.getDelta()!;
            await this.tick(delta);
            this.followTarget(this.target);
            this.controls.update();
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
    }        



    
}


function createAmbiantLight() {
    const ambientLight = new AmbientLight("white", 0.01);
    return ambientLight;
}


function setupResizeHandlers(container: HTMLElement, sizeObserver: WindowSizeObserver) {
    window.addEventListener("resize", 
    throttle(1000/30, undefined, 
        (event: UIEvent) => {
            console.log(`event: ${event}`);
            sizeObserver(new Dim(container.clientWidth, container.clientHeight));
        }

    ));    
}

function createObjects3D(bodies: Body[]): Object3D[] {
    return bodies.map((body) => BodyObject3D.createObject3D(body));
}

function createScene(): Scene {
    const scene = new Scene();
    scene.background = new Color('black');
    return scene;
}

function createCamera({fov=35, aspectRatio=1.0, near=1000, far=10000000000}={}): PerspectiveCamera {
    const camera = new PerspectiveCamera(
        fov, 
        aspectRatio, 
        near, 
        far
    );
    
    return camera;
}

function createRenderer(): WebGLRenderer {
    return new WebGLRenderer({antialias: true});
}


function createControls(camera: Camera, canvas: HTMLCanvasElement): OrbitControls {
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    return controls;
}
