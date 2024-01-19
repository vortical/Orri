import { AmbientLight, AxesHelper, Camera, Color, DirectionalLight, HemisphereLight, Mesh, Object3D, PerspectiveCamera, PointLight, Scene, Vector3, WebGLRenderer } from 'three';
import { Dim, WindowSizeObserver, toRad } from '../system/geometry.ts';
import { Body } from '../body/Body.ts';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';


import { BodySystemUpdater } from '../body/BodySystemUpdater.ts';
import { BodyObject3D } from '../mesh/BodyObject3D.ts';
import { throttle } from '../system/throttler.ts';
// import { Vec3D } from '../system/vecs.ts';

import { ViewTransitions } from './ViewTransitions.ts';

import Stats from 'three/addons/libs/stats.module.js';


type Animator = (time: number) => boolean;


class BodySystem {

    bodySystemUpdater: BodySystemUpdater;
    bodies: Body[];
    camera: PerspectiveCamera;
    scene: Scene;
    renderer: WebGLRenderer;
    controls: OrbitControls;
    objects3D: Object3D[];
    ambiantLight: AmbientLight;
    stats: Stats;
    target: Body
    timeStep: number = 1.0;
    viewTransitions: ViewTransitions;
    axesHelper?: AxesHelper;
    
    constructor(parentElement:HTMLElement, bodies:Body[], bodySystemUpdater: BodySystemUpdater){
        const canvasSize = new Dim(parentElement.clientWidth, parentElement.clientHeight);
        this.stats = new Stats();
        parentElement.appendChild(this.stats.dom);

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
        this.camera.position.set(0,0,100*this.bodies[0].radius/1000)
        this.controls.update();
        this.scene.add(...this.objects3D);
        this.setAxesHelper(false);

        // this.controls.target.set(this.bodyMeshes[0].position.x, this.bodyMeshes[0].position.y, this.bodyMeshes[0].position.z);
        this.setSize(canvasSize);
        setupResizeHandlers(parentElement, (size: Dim) => this.setSize(size))
        
        
    }


    getBody(name: string): Body {
        name = name.toLowerCase();
        return this.bodies.find((b)=> b.name.toLowerCase() === name)!;
    }

    hasAxesHelper(): boolean {
        return this.axesHelper != undefined;
    }

    setAxesHelper(value: boolean){
        if(value && this.axesHelper == undefined){
            this.axesHelper = new AxesHelper( 5000000000 );        
            this.scene.add( this.axesHelper  );
        }else if(value == false && this.axesHelper){
            this.axesHelper.dispose();
            this.axesHelper = undefined;
        }
    }

    setTimeStep(timeStep: number){
        this.timeStep = timeStep;
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

    // setDistanceToTarget(distance: number){
        // todo...

    //     const body = this.target;

    //     // keep same distance...
    //     const cameraPosition = this.camera.position.clone();
    //     const target = this.controls.target.clone();

    //     const targetTranslation = cameraPosition.sub(target).normalize();

        
    //     this.camera.position.set(0,0,100*this.bodies[0].radius/1000)
    // }

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
        

        // this.camera.lookAt(body.position.x/1000, body.position.y/1000, body.position.z/1000);
    }
    
    followTarget(body: Body|string) {
        if (typeof body === "string") {
            body = this.getBody(body);
        }
        
        this.setTarget(body);
    }
    
    setSize(size: Dim){
        this.camera.aspect = size.ratio();
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(size.w, size.h);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.render();   
    }

     tick(t: number) {
        const that = this
        return new Promise(function(resolve){
            that.bodySystemUpdater.update(that.bodies, that.timeStep).forEach((body: Body, i: string | number ) => {
                BodyObject3D.updateObject3D(body, that.objects3D[i]);
            });

            // fake rotation upon y axis (in the object's )
            // todo: move this rotation as a property of the body so that 
            // it knows the position of the rotation (time of day )
            // we also have to do same with the tilt.
            that.objects3D.forEach((m)=> {
                const child = m.children[0].rotateY(toRad(0.01));
                if(child.children && child.children.length==1){
                    child.children[0].rotateY(toRad(0.005));
                }

            })

            resolve(null);
    
        });
    }

    start() {
        this.render();

        this.renderer.setAnimationLoop( async(time) => {
            time = Math.floor(time/1000);

            await this.tick(time);
            this.tick(time);
            this.followTarget(this.target);
            this.controls.update();
            
            console.log(`tick: ${time}`)
            this.render();
            this.stats.update();
        });
    }

    stop() {
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

export { BodySystem };