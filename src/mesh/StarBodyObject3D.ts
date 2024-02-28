import { Body } from '../domain/Body.ts';
import { MaterialProperties } from '../domain/models.ts';
import { meshProperties } from "../data/bodySystems.ts";
import { Mesh, Material, TextureLoader, SphereGeometry, PointLight, Object3D, MeshBasicMaterial, Quaternion, Vector3, DirectionalLight, Camera, PerspectiveCamera, DirectionalLightHelper } from "three";
import { SCENE_LENGTH_UNIT_FACTOR } from '../system/units.ts';
import { BodyObject3D } from './BodyObject3D.ts';
import { Lensflare, LensflareElement } from 'three/addons/objects/Lensflare.js';
import { BODY_SELECT_TOPIC, BodySelectEventMessageType } from '../system/event-types.ts';
import { BodySystem, BodySystemEvent } from '../scene/BodySystem.ts';


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


class StarBodyObject3D extends BodyObject3D {
    // shadowsEnabled: boolean = false;

    pointLight: PointLight;
    shadowingLight?: DirectionalLight;

    shadowingLightTargetListener: DirectionLightTargetListener;

    constructor(body: Body, bodySystem: BodySystem){
        super(body, bodySystem);

        this.pointLight = this.getObject3D().getObjectByName("pointlight") as PointLight;

        this.shadowingLightTargetListener = new DirectionLightTargetListener(this);
    }

    createObject3D(body: Body): Object3D {

        function createSunMaterial(materialProperties: MaterialProperties): Material {
            return new MeshBasicMaterial( { 
                map: materialProperties.textureUri? textureLoader.load(materialProperties.textureUri) : undefined,
                color: "white",
                 
            }  );
        }
        function createFlares(size: number, color: any): Lensflare {
            const textureFlare0 = textureLoader.load( '/assets/textures/lensflare/lensflare0_alpha.png' );
            const lensflare = new Lensflare();
            lensflare.addElement( new LensflareElement( textureFlare0, 110, 0, color ) );
            return lensflare;        
        }
    
        const { name, radius } = body;
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

        // Create the underlying pointlight along with flares, this is our
        // only source of light when shadows are disabled.
        const { color = "white", intensity = 1.5, distance = 0, decay = 0.00 } = body.lightProperties!;
        const light = new PointLight(color, intensity, distance, decay);
        light.name = "pointlight";
        const lensflare = createFlares(100, light.color);
        
        light.add(lensflare );
        light.add(surfacemesh);
        
        const bodymesh = new Object3D();

        // Align it local axis
        if(body.axisDirection !== undefined){
            // rotate body so axis is normal to its orbital plane (i.e.: equatorial = orbital/ecliptic)
            const axis = body.axisDirection!;
            bodymesh.applyQuaternion(new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), new Vector3(axis.x, axis.y, axis.z)));
            
        }else{
            // We tilt the body using the body's obliquity arbitrarily tilt the body using 
            const rotation =body.obliquityOrientation();
            bodymesh.applyQuaternion(rotation);
            const body_orbital_norm = body.get_orbital_plane_normal() || new Vector3(0,1,0);
            bodymesh.applyQuaternion(new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), body_orbital_norm));
        }
        
        bodymesh.add(light);
        return bodymesh;
    }
    

    createShadowLight(): DirectionalLight{

        const SHADOW_MAP_SIZE = 2048*4;

        const { color = "white", intensity = 1.5 } = this.body.lightProperties!;
        const light = new DirectionalLight(color, intensity);
        light.castShadow = true;

        // this will need to calcualted?
        const shadowCameraSize = 150000; // 100,000k ... just need to keep this value as small as possible as resolution wil drop off

        light.shadow.camera.top = shadowCameraSize;
        light.shadow.camera.bottom = -shadowCameraSize;
        light.shadow.camera.left = -shadowCameraSize;
        light.shadow.camera.right = shadowCameraSize;

        light.shadow.bias = 0.0001;
        light.shadow.radius = 5
        light.shadow.blurSamples = 8
    
        light.shadow.mapSize.width = SHADOW_MAP_SIZE;
        light.shadow.mapSize.height = SHADOW_MAP_SIZE;
    
        light.shadow.camera.near = this.bodySystem.camera.near; //scaleUnit(Math.max(1, maxPos/1000));
        light.shadow.camera.far = this.bodySystem.camera.far;//scaleUnit(maxPos);        
        this.shadowingLight = light;
        this.object3D.add(light);

        return light;




        // we need target that is in the scene
        // Documentation states:
        // the target's {@link THREE.Object3D.matrixWorld | matrixWorld} gets automatically updated each frame
        // (if the target object is in the scene.)
        // return light;

    }

    // will need a listener to the target!
    #disableShadowLight() {
        if (!this.areShadowsEnabled()){
            return;
        }

        this.shadowingLight?.removeFromParent();
        this.shadowingLight?.dispose();
        this.shadowingLight = undefined;
        this.pointLight.intensity = 1.5;
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
        this.pointLight.intensity = 0.00;

    }

    areShadowsEnabled(): boolean {
        return this.shadowingLight !== undefined;
    }

    setShadowsEnabled(value: boolean): StarBodyObject3D {
        if(value){
            this.#enableShadowLight();
        }else{
            this.#disableShadowLight();
        }
        return this;

            
        // }
        // if(this.shadowingLight){
        //     return this;
        // }

        // this.shadowsEnabled = value;
        // const light = this.createShadowLight();
        // light.target = this.bodySystem.getBodyObject3DTarget().object3D;
        // this.shadowingLight = light;
        // return this;
    }
}

export { StarBodyObject3D };

            // const textureFlare0 = textureLoader.load( '/assets/textures/lensflare/lensflare0.png' );
            // const textureFlare3 = textureLoader.load( '/assets/textures/lensflare/lensflare3.png' );
        
            // TODO: // make this element resizable
            
            // lensflare.addElement( new LensflareElement( textureFlare3, 60, 0.6 ) );
            // lensflare.addElement( new LensflareElement( textureFlare3, 70, 0.7 ) );
            // lensflare.addElement( new LensflareElement( textureFlare3, 120, 0.9 ) );
            // lensflare.addElement( new LensflareElement( textureFlare3, 70, 1 ) );




// function createSunMaterial(materialProperties: MaterialProperties): Material {
//     return new MeshBasicMaterial( { 
//         map: materialProperties.textureUri? textureLoader.load(materialProperties.textureUri) : undefined,
//         color: "white",
         
//     }  );
// }

// // TODO: // make this element resizable
// function createFlares(size: number, color: any): Lensflare {

//         // const textureFlare0 = textureLoader.load( '/assets/textures/lensflare/lensflare0.png' );
//         const textureFlare0 = textureLoader.load( '/assets/textures/lensflare/lensflare0_alpha.png' );
//         // const textureFlare3 = textureLoader.load( '/assets/textures/lensflare/lensflare3.png' );
    
//         const lensflare = new Lensflare();
//         // TODO: // make this element resizable
//         lensflare.addElement( new LensflareElement( textureFlare0, 100, 0, color ) );
        
//         // lensflare.addElement( new LensflareElement( textureFlare3, 60, 0.6 ) );
//         // lensflare.addElement( new LensflareElement( textureFlare3, 70, 0.7 ) );
//         // lensflare.addElement( new LensflareElement( textureFlare3, 120, 0.9 ) );
//         // lensflare.addElement( new LensflareElement( textureFlare3, 70, 1 ) );
//         return lensflare;
    
// }

// create ShadowLighting(){

//     const light = new DirectionalLight(0xffffff, config.intensity);
//     light.position.set(this.position[0], this.position[0], this.position[2]);
//     light.castShadow = enableShadow;


// }