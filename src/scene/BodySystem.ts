import { AmbientLight, Camera, Color, DirectionalLight, HemisphereLight, Mesh, Object3D, PerspectiveCamera, Scene, Vector3, WebGLRenderer } from 'three';
import { Dim, WindowSizeObserver } from '../system/geometry.ts';
import { Body } from '../body/Body.ts';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { BodySystemUpdater } from '../body/BodySystemUpdater.ts';
import { BodyMesh } from '../mesh/BodyMesh.ts';
// import { Vec3D } from '../system/vecs.ts';

type Animator = (time: number) => boolean;


class BodySystem {

    bodySystemUpdater: BodySystemUpdater;
    bodies: Body[];
    camera: PerspectiveCamera;
    scene: Scene;
    renderer: WebGLRenderer;
    controls: OrbitControls;
    bodyMeshes: Mesh[];
    
    constructor(parentElement:HTMLElement, bodies:Body[], bodySystemUpdater: BodySystemUpdater){
        const canvasSize = new Dim(parentElement.clientWidth, parentElement.clientHeight);

        this.bodySystemUpdater = bodySystemUpdater;
        this.bodies = bodies;



        this.camera = createCamera();
        this.scene = createScene();
        this.renderer = createRenderer();
        parentElement.append(this.renderer.domElement);

        this.controls = createControls(this.camera, this.renderer.domElement);
        
        // create bodies from here (just earth now)
        this.bodyMeshes = createBodyMeshes(this.bodies);

        createLights({position: new Vector3(0,0,10)}).forEach((l) => this.scene.add(l));
        //696340000
        //696340 km

        this.camera.position.set(-249597870, 0, 0);
        this.controls.update();
        this.scene.add(...this.bodyMeshes);

        this.controls.target.set(this.bodyMeshes[0].position.x, this.bodyMeshes[0].position.y, this.bodyMeshes[0].position.z);
        this.setSize(canvasSize);
        setupResizeHandlers(parentElement, (size: Dim) => this.setSize(size))

        
    }


    
    
    setSize(size: Dim){
        this.camera.aspect = size.ratio();
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(size.w, size.h);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderFrame();   
    }

    start() {
        this.renderFrame();

        this.renderer.setAnimationLoop( (time) => {
            time = Math.floor(time/1000);
            this.controls.update();

            console.log(`tick: ${time}`)
            // 100
            this.bodySystemUpdater.update(this.bodies, 500);
            if(this.updatePositions(500)){
                this.renderFrame();
            }
        });
    }

    stop() {
        this.renderer.setAnimationLoop(null);
    }

    renderFrame() {
        this.renderer.render(this.scene, this.camera);
    }

    updatePositions(time: number): boolean {
        // we 'could' merge the meshes and the bodies so that 
        // they share common position and rotation vectors...but we don't. copying those properties
        // has no real performance hit.
  //      this.bodySystemUpdater.update(this.bodies, time);

        // the meshes need to get the values from the bodies,
        // this assumes they have same indexes. Doing .ts is turning out to be
        // pita.
        this.bodies.forEach((body, i ) => {
            BodyMesh.updateMesh(body, this.bodyMeshes[i])
        });
        
        return true;
    }
        
}


function createLights({position = new Vector3(0,0,0), hemispheric = true} = {}) {

    const ambientLight = hemispheric? new HemisphereLight("white", "darkgrey", 1.0): new AmbientLight("white", 0.3);
    const light = new DirectionalLight('white', 2);
    light.position.set(position.x, position.y, position.z);
    // return [ambientLight];
    // return [light, ambientLight];
    return [light];
}


function setupResizeHandlers(container: HTMLElement, sizeObserver: WindowSizeObserver) {
    window.addEventListener("resize", (event: UIEvent) => {
        console.log(`event: ${event}`);
        sizeObserver(new Dim(container.clientWidth, container.clientHeight));
    });    
}


function createBodyMeshes(bodies: Body[]): Mesh[] {
    const meshes = bodies.map((body) => BodyMesh.createBodyMesh(body));
    return meshes;
}

function createScene(): Scene {
    const scene = new Scene();
    scene.background = new Color('black');
    return scene;
}

function createCamera({fov=35, aspectRatio=1.0, near=100, far=10000000000}={}): PerspectiveCamera {
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