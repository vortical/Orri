import { Body } from '../domain/Body.ts';
import { LightProperties } from '../domain/models.ts';
import { meshProperties } from "../data/bodySystems.ts";
import { Mesh, TextureLoader, SphereGeometry, PointLight, Object3D, MeshBasicMaterial, Quaternion, Vector3, DirectionalLight, Group } from "three";
import { SCENE_LENGTH_UNIT_FACTOR } from '../system/units.ts';
import { BodyObject3D } from './BodyObject3D.ts';
import { BODY_SELECT_TOPIC, BodySelectEventMessageType } from '../system/event-types.ts';
import { BodySystem, CameraLayer } from '../scene/BodySystem.ts';
import { FlareEffect } from './FlareEffect.ts';


const textureLoader = new TextureLoader();
const SHADOW_LIGHT_TO_POINT_LIGHT_RATIO = 6;


class DirectionLightTargetListener {
    star: StarBodyObject3D;

    constructor(star: StarBodyObject3D) {
        this.star = star;
        this.createSubscribtion();
    }

    createSubscribtion() {
        PubSub.subscribe(BODY_SELECT_TOPIC, (msg, event: BodySelectEventMessageType) => {
            if (this.star.shadowingLight) {
                if (event.body && this.star.shadowingLight.target !== event.body.object3D) {
                    this.star.shadowingLight.target = event.body.object3D;
                }
            }
        });
    }
}

const defaultLightProperties: Required<LightProperties> = {
    color: "white",
    intensity: 1.2,
    distance: 0,
    decay: 0.0
};

class StarBodyObject3D extends BodyObject3D {
    // object3D: Object3D;
    pointLight!: PointLight;
    shadowingLight?: DirectionalLight;
    shadowingLightTargetListener: DirectionLightTargetListener;
    lightProperties: Required<LightProperties>;
    surfaceMesh!: Mesh;
    flareEffect!: FlareEffect;

    constructor(body: Body, bodySystem: BodySystem) {
        super(body, bodySystem);
        const { name, radius } = this.body;
        this.lightProperties = { ...defaultLightProperties, ...body.lightProperties };
        this.shadowingLightTargetListener = new DirectionLightTargetListener(this);
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

        this.flareEffect = new FlareEffect(this);//createFlares(this.pointLight.color);
        this.pointLight.add(surfacemesh);

        const bodymesh =this.object3D;

        // Align it local axis
        if (this.body.axisDirection !== undefined) {
            // rotate body so axis is normal to its orbital plane (i.e.: equatorial = orbital/ecliptic)
            const axis = this.body.axisDirection!;
            bodymesh.applyQuaternion(new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), new Vector3(axis.x, axis.y, axis.z)));

        } else {
            // We tilt the body using the body's obliquity arbitrarily tilt the body using 
            const rotation = this.body.obliquityOrientation();
            bodymesh.applyQuaternion(rotation);
            const body_orbital_norm = this.body.get_orbital_plane_normal() || new Vector3(0, 1, 0);
            bodymesh.applyQuaternion(new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), body_orbital_norm));
        }

        bodymesh.add(this.pointLight);
        
    }

    createShadowLight(): DirectionalLight {

        const SHADOW_MAP_SIZE = 2048 * 16;

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
    #updateLightIntensities() {
        if (this.areShadowsEnabled()) {
            this.shadowingLight!.intensity = SHADOW_LIGHT_TO_POINT_LIGHT_RATIO * this.lightProperties.intensity / (1 + SHADOW_LIGHT_TO_POINT_LIGHT_RATIO);
            this.pointLight.intensity = 1 * this.lightProperties.intensity / (1 + SHADOW_LIGHT_TO_POINT_LIGHT_RATIO);
        } else {
            this.pointLight.intensity = this.lightProperties.intensity;
        }
    }

    #disableShadowLight() {
        if (!this.areShadowsEnabled()) {
            return;
        }

        this.shadowingLight?.removeFromParent();
        this.shadowingLight?.dispose();
        this.shadowingLight = undefined;
        this.#updateLightIntensities();
    }

    #enableShadowLight() {
        if (this.areShadowsEnabled()) {
            return this;
        }

        const light = this.createShadowLight();
        const target = this.bodySystem.getBodyObject3DTarget().object3D;
        light.target = target;
        this.shadowingLight = light;
        this.#updateLightIntensities();
    }

    setShadowsEnabled(value: boolean): StarBodyObject3D {
        if (value) {
            this.#enableShadowLight();
        } else {
            this.#disableShadowLight();
        }
        return this;
    }

    update(): void {
        super.update();
        this.flareEffect.update();
    }

    planetarySystem(): BodyObject3D{
        return this;
    }

}

export { StarBodyObject3D };