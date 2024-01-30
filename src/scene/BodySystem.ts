import { AmbientLight, AxesHelper, Camera, Color, DirectionalLight, HemisphereLight, Mesh, Object3D, PerspectiveCamera, PointLight, Raycaster, Scene, Vector2, Vector3, WebGLRenderer } from 'three';
import { Dim, WindowSizeObserver, toRad } from '../system/geometry.ts';
import { Body } from '../body/Body.ts';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';


import { BodySystemUpdater } from '../body/BodySystemUpdater.ts';
import { BodyObject3D } from '../mesh/BodyObject3D.ts';
import { throttle } from '../system/throttler.ts';
// import { Vec3D } from '../system/vecs.ts';

import { ViewTransitions } from './ViewTransitions.ts';

import Stats from 'three/addons/libs/stats.module.js';

import PubSub from 'pubsub-js';

import { SYSTEM_TIME_TOPIC } from '../system/event-types.ts';

import { Clock, Timer } from '../system/timing.ts';
import { Vec3D, Vector } from '../system/vecs.ts';
import { vec3 } from 'three/examples/jsm/nodes/Nodes.js';

type PickerHandler = (c: Vector) => Body|null;
type Animator = (time: number) => boolean;


//https://sahadar.github.io/pubsub/#installation
//https://www.npmjs.com/package/pubsub-js



export type BodySystemOptionsState = {
    // viewer position,
    pos: Vector
    // target or direction
    targetName: string,
    sizeScale: number,
    timeScale: number,
    fov: number,
    backgroudLightLevel: number,
    showAxes: boolean
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
    clock: Clock;
    raycaster = new Raycaster();

    // timeStep: number = 1.0;
    viewTransitions: ViewTransitions;
    axesHelper?: AxesHelper;
    parentElement:HTMLElement;
    

    // constructor(parentElement:HTMLElement, bodies:Body[], bodySystemUpdater: BodySystemUpdater, optionState: OptionsState){
    constructor(parentElement:HTMLElement, bodies:Body[], bodySystemUpdater: BodySystemUpdater){
        const canvasSize = new Dim(parentElement.clientWidth, parentElement.clientHeight);
        this.parentElement = parentElement;        
        this.clock = new Clock();
    
        
        // this.stats = new Stats();
        // parentElement.appendChild(this.stats.dom);

        this.bodySystemUpdater = bodySystemUpdater;
        this.bodies = bodies;



        this.camera = createCamera();
        this.scene = createScene();
        // this.scene.add(this.camera);
        this.renderer = createRenderer();
        parentElement.append(this.renderer.domElement);

        this.controls = createControls(this.camera, this.renderer.domElement);
        
        this.viewTransitions = new ViewTransitions(this.camera, this.controls);
        
        // create bodies from here (just earth now)
        this.objects3D = createObjects3D(this.bodies);

        this.ambiantLight = createAmbiantLight();
        this.scene.add(this.ambiantLight);

        this.setTarget(this.bodies[0]);        
        this.camera.position.set(0,0,1.5*this.bodies[0].radius/1000)
        this.controls.update();
        this.scene.add(...this.objects3D);
        this.setAxesHelper(false);

        // this.controls.target.set(this.bodyMeshes[0].position.x, this.bodyMeshes[0].position.y, this.bodyMeshes[0].position.z);
        this.setSize(canvasSize);
        
        setupPickerHandlers((pointer: Vector) => this.pick(pointer));
        setupResizeHandlers(parentElement, (size: Dim) => this.setSize(size));
        // this.setTarget("Saturn");
            
        
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

    getTimeStep(){
        this.clock.scale;
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
    }

    setScale(scale: number){
        this.objects3D.forEach((m) => {
            m.scale.set(scale, scale, scale);
        });

    }

    setAmbiantLightLevel(level: number){
        this.ambiantLight.intensity = level;
    }
    setFOV(fov: number){
        this.camera.fov = fov;        
        this.camera.updateProjectionMatrix();
    }

    
    /**
     * WIP
     * 
     * We trigger a transition towards a body within an amount of time. The body
     * may be moving, so each step will need to be adjusted. In the case of a fast moving
     * object, we might need to estimate the position of the body after the transition time.
     * 
     * @param body 
     */
    setTargetAnimated(body: Body|string,) {
        
        if (typeof body === "string") {
            body = this.getBody(body);

        }
        this.target = body;

        this.viewTransitions.moveToTarget(body, undefined, 20, 100);
    }


    setTarget(body: Body|string){
        
        
        if (typeof body === "string") {
            body = this.getBody(body);

        }
        this.target = body;

        // keep same distance...
        const cameraPosition = this.camera.position.clone();
        const target = this.controls.target.clone();
        const targetTranslation = cameraPosition.sub(target);

        
        
        this.controls.target.set(body.position.x/1000, body.position.y/1000, body.position.z/1000);        
        this.camera.position.set(this.controls.target.x+targetTranslation.x, this.controls.target.y+targetTranslation.y, this.controls.target.z+targetTranslation.z);
        
    }
    
    followTarget(body: Body|string) {
        if (typeof body === "string") {
            body = this.getBody(body);
        }
        
        this.setTarget(body);
    }

    pick(v: Vector): Body | null {
        this.raycaster.setFromCamera(new Vector2(v.x, v.y), this.camera);
        
        const intersects = this.raycaster.intersectObjects(this.scene.children);
        const names = intersects.map((intersected) => intersected.object.name)
        console.log(`pick: ${names}`);
        return null;

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

            // APLLY special rotations to surface children (e.g. clouds)
            // that.objects3D.forEach((m)=> {
                
            //     // so based on time delta, determine the angle of rotation
                
                
            //     // move the body on its axis.
            //     const child = m.children[0];
            //     // move children suchjjj as clouds on its axis
            //     if(child.children && child.children.length==1){
            //         child.children[0].rotateY(toRad(0.005));
            //     }

            // })

            resolve(null);
    
        });
    }

    start() {
        
        this.clock.enableTimePublisher(true);
        
        this.render();

        const timer = this.clock.startTimer("AnimationTimer");

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


function setupPickerHandlers(pickerHandler: PickerHandler) {
    window.addEventListener( 'pointermove', throttle(500, undefined, 
        (event: MouseEvent) => {
           console.log(`move ${event}`);

           // pointer position [-1, 1] for x and y 
           return pickerHandler({
                x: ( event.clientX / window.innerWidth ) * 2 - 1,
                y: - ( event.clientY / window.innerHeight ) * 2 + 1
            });

}));


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
