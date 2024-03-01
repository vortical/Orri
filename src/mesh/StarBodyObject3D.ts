import { Body } from '../domain/Body.ts';
import { LightProperties, MaterialProperties } from '../domain/models.ts';
import { meshProperties } from "../data/bodySystems.ts";
import { Mesh, Material, TextureLoader, SphereGeometry, PointLight, Object3D, MeshBasicMaterial, Quaternion, Vector3, DirectionalLight, Camera, PerspectiveCamera, DirectionalLightHelper, Group } from "three";
import { SCENE_LENGTH_UNIT_FACTOR } from '../system/units.ts';
import { BodyObject3D } from './BodyObject3D.ts';
import { Lensflare, LensflareElement } from 'three/addons/objects/Lensflare.js';
import { BODY_SELECT_TOPIC, BodySelectEventMessageType } from '../system/event-types.ts';
import { BodySystem } from '../scene/BodySystem.ts';
import { Dim, getMeshScreenSize, getObjectScreenSize } from '../system/geometry.ts';


const textureLoader = new TextureLoader();


/**
 * 
 * We focus on shadows based on a directional light oriented from 
 * the sun to our target. It's an orthognal/parallel projection, so consider
 * that this light emanates from a plane's normal being
 * the orientation sun->target. 
 * 
 * 
 */

const FLARE_TEXTURE_SIZE = 512;
const SHADOW_LIGHT_TO_POINT_LIGHT_RATIO = 6;


class DirectionLightTargetListener {

    star: StarBodyObject3D;

    constructor(star:StarBodyObject3D){
        this.star = star;
        this.createSubscribtion();
    }

    createSubscribtion(){
        PubSub.subscribe(BODY_SELECT_TOPIC, (msg, event: BodySelectEventMessageType) => {
            if (this.star.shadowingLight){
                if (event.body && this.star.shadowingLight.target !== event.body.object3D) {
                    this.star.shadowingLight.target = event.body.object3D;
                }
            }
        });
    }
}

const defaultLightProperties: Required<LightProperties> = {
    color:  "white",
    intensity: 1.2,
    distance: 0,
    decay: 0.0
};

class ScaledLensflare{
    scale: number;
    lensflare: Lensflare;

    constructor(scale: number, lensflare: Lensflare){
        this.scale = scale;
        this.lensflare = lensflare
    }
}

class StarBodyObject3D extends BodyObject3D {
    object3D: Object3D;
    pointLight!: PointLight;
    shadowingLight?: DirectionalLight;
    lensflare?: Lensflare;
    shadowingLightTargetListener: DirectionLightTargetListener;
    lightProperties: Required<LightProperties>;
    surfaceMesh!: Mesh;
    flares: ScaledLensflare[] = [];

    constructor(body: Body, bodySystem: BodySystem){
        super(body, bodySystem);
        this.lightProperties = {...defaultLightProperties, ...body.lightProperties};
        this.object3D  = this.init();        
        this.shadowingLightTargetListener = new DirectionLightTargetListener(this);
    }

    getFlare(scale: number): Lensflare {
        // Closest and diff needs to be > 0
        // todo: just use a for loop, return as soon as condition is met given (they are!) the flares are ordered...
        const closest = this.flares.reduce((prev, cur) =>  (cur.scale - scale > 0) && (Math.abs(cur.scale - scale) < Math.abs(prev.scale - scale))? cur: prev, this.flares[0]);
        return closest.lensflare;
    }

    init() {

        function createSunMaterial(materialProperties: MaterialProperties): Material {
            return new MeshBasicMaterial( { 
                map: materialProperties.textureUri? textureLoader.load(materialProperties.textureUri) : undefined,
                color: "white",
                 
            } );
        }

        function createFlares(color: any): ScaledLensflare[] {
            const textureFlare0 = textureLoader.load( '/assets/textures/lensflare/lensflare0_alpha.png' );
            const flares = [];

            // 50 textures spread out betwen a max and min scale (log curve)
            const nbflares = 50;
            const maxScaleValue = 10;
            const minScaleValue = 0.005;
            const step = (Math.log(maxScaleValue) - Math.log(minScaleValue))/(nbflares - 1);
            for(let i =0; i < nbflares; i++){
                const scale = Math.exp(Math.log(minScaleValue) + i * step);
                const lensflare = new Lensflare();
                lensflare.addElement( new LensflareElement( textureFlare0, 512*scale, 0, color ) );
                const scaledFlare = new ScaledLensflare(scale, lensflare)
                lensflare.visible = false;
                flares.push(scaledFlare);
            }
            return flares;
        }
        

        const { name, radius } = this.body;
        const widthSegements = 64;
        const heightSegments = 32;
        const materialProperties = meshProperties.solarSystem.find((v) => v.name.toLocaleLowerCase() == name.toLowerCase())!;
        
        // Create the sun mesh
        const geometry = new SphereGeometry(radius * SCENE_LENGTH_UNIT_FACTOR, widthSegements, heightSegments);
        const material = new MeshBasicMaterial({
            map: materialProperties.textureUri ? textureLoader.load(materialProperties.textureUri) : undefined,
            color: "white",
        });        
        const surfacemesh = new Mesh(geometry, material);
        surfacemesh.name = name;
        this.surfaceMesh = surfacemesh;

        // Create the underlying pointlight along with flares, this is our
        // only source of light when shadows are disabled.
        this.pointLight = new PointLight(this.lightProperties.color, this.lightProperties.intensity, this.lightProperties.distance, this.lightProperties.decay);
        
        this.pointLight.name = "pointlight";
        this.flares = createFlares(this.pointLight.color);
        
        this.pointLight.add(...(this.flares.map(it => it.lensflare)));
        this.pointLight.add(surfacemesh);
        

        const bodymesh = new Group();

        // Align it local axis
        if(this.body.axisDirection !== undefined){
            // rotate body so axis is normal to its orbital plane (i.e.: equatorial = orbital/ecliptic)
            const axis = this.body.axisDirection!;
            bodymesh.applyQuaternion(new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), new Vector3(axis.x, axis.y, axis.z)));
            
        }else{
            // We tilt the body using the body's obliquity arbitrarily tilt the body using 
            const rotation = this.body.obliquityOrientation();
            bodymesh.applyQuaternion(rotation);
            const body_orbital_norm = this.body.get_orbital_plane_normal() || new Vector3(0,1,0);
            bodymesh.applyQuaternion(new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), body_orbital_norm));
        }
        
        bodymesh.add(this.pointLight );
        return bodymesh;
    }
    

    createShadowLight(): DirectionalLight{

        const SHADOW_MAP_SIZE = 2048*16;

        const { color, intensity } = this.lightProperties;
        const light = new DirectionalLight(color, intensity);
        light.castShadow = true;

        const shadowCameraSize = 80000; // ~jupiter radius size...
        light.shadow.camera.top = shadowCameraSize;
        light.shadow.camera.bottom = -shadowCameraSize;
        light.shadow.camera.left = -shadowCameraSize;
        light.shadow.camera.right = shadowCameraSize;

        light.shadow.bias = 0.0001;
        light.shadow.radius = 3;
        light.shadow.blurSamples = 8;
    
        light.shadow.mapSize.width = SHADOW_MAP_SIZE;
        light.shadow.mapSize.height = SHADOW_MAP_SIZE;
    
        light.shadow.camera.near = this.bodySystem.camera.near; 
        light.shadow.camera.far = this.bodySystem.camera.far;
        this.shadowingLight = light;
        this.object3D.add(light);

        return light;
    }

    
    // getLightIntensity(): number {
    //     return this.lightProperties.intensity;
    // }

    // setLightIntensity(level: number){        
    //     this.lightProperties.intensity = level;        
    // }



    areShadowsEnabled(): boolean {
        return this.shadowingLight !== undefined;
    }

    /**
     * The shadowingLight and pointlight's intensities have a total value of this.lightProperties.intensity.
     * When shadowingLight is active, it will have SHADOW_LIGHT_TO_POINT_LIGHT_RATIO; hence if its total intensity is 3 and the ratio is 2,
     * shadowlight will have intensity 2 and pointlight will have intensity 1.
     * 
     * This measure determines how much light remains in shadowed areas (pointlight will illuminate shadowed areas
     * as it is disabled for shadows); a ratio of 2 means that non shadowed areas
     * will be twice as intense as shadowed areas.
     */
    #updateLightIntensities(){
        if (this.areShadowsEnabled()){
            this.shadowingLight!.intensity = SHADOW_LIGHT_TO_POINT_LIGHT_RATIO * this.lightProperties.intensity / (1 + SHADOW_LIGHT_TO_POINT_LIGHT_RATIO);
            this.pointLight.intensity = 1 * this.lightProperties.intensity / (1 + SHADOW_LIGHT_TO_POINT_LIGHT_RATIO);
        }else{
            this.pointLight.intensity = this.lightProperties.intensity;
        }
    }


    #disableShadowLight() {
        if (!this.areShadowsEnabled()){
            return;
        }

        this.shadowingLight?.removeFromParent();
        this.shadowingLight?.dispose();
        this.shadowingLight = undefined;
        this.#updateLightIntensities();
        // this.pointLight.intensity = this.lightProperties.intensity;
    }

    #enableShadowLight() {
        if(this.areShadowsEnabled()){
            return this;
        }

        // this.shadowsEnabled = true;
        const light = this.createShadowLight();
        const target = this.bodySystem.getBodyObject3DTarget().object3D;
        light.target = target;
        this.shadowingLight = light;
        this.#updateLightIntensities();
        // this.pointLight.intensity = 0.00;

    }

    setShadowsEnabled(value: boolean): StarBodyObject3D {
        if(value){
            this.#enableShadowLight();
        }else{
            this.#disableShadowLight();
        }
        return this;
    }


    /**
     * Lensflare arent the usual mesh with an inherent geometry. They have a static size (they are 2d and designed to 
     * emulate flare on the camera lens). So we pre-created a set of flares with different sizes. 
     * 
     * For every frame rendered, we determine the desired scale of a flare and ensure it is visible while
     * disabling other flares.
     */
    updateLensflareSize(){

        function computeFlareScaleForStarSize(bodysizePixels: Dim): number {
            // the texture size is 512, and the center part of it (i.e. 2/29 or ~7%) represents the actual body.
            // so given a passed in body size, we determine the scale value of this texture.            
            const centerBodySize = FLARE_TEXTURE_SIZE * 2/29; // ~35 pixels - 7%
            const scale = Math.max(bodysizePixels.w, bodysizePixels.h) / centerBodySize;
            return scale;
        }

        const starSizePixels: Dim = getObjectScreenSize(new Dim(this.body.radius*2/1000,this.body.radius*2/1000), this.object3D.position, this.bodySystem.camera, this.bodySystem.getSize());
        const scale = computeFlareScaleForStarSize(starSizePixels);
        const flare = this.getFlare(scale);

        if(this.lensflare !==  flare){
            if(this.lensflare){
                this.lensflare.visible = false;
                console.log("switch flare for scale:"+scale);
            }
            this.lensflare = flare;
            this.lensflare.visible = true;
        }
    }


    update(): void {
        super.update();
        this.updateLensflareSize();        
    }
}

export { StarBodyObject3D };