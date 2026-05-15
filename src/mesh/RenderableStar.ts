import { Body } from '../body/Body.ts';
import { LightProperties } from '../domain/models.ts';
import { Mesh, SphereGeometry, PointLight, Object3D, MeshBasicMaterial, Quaternion, Vector3, DirectionalLight, Group, MeshBasicMaterialParameters, MeshPhongMaterial } from "three";
import { RenderableBody } from './RenderableBody.ts';
import { BODY_SELECT_TOPIC, BodySelectEventMessageType } from '../system/event-types.ts';
import { BodySystem } from '../scene/BodySystem.ts';
import { FlareEffect } from './FlareEffect.ts';
import { textureLoader } from '../services/textureLoader.ts';
import { StarSurface } from './StarSurface.ts';
// import { StarSurface } from './BodyPart.ts';

import PubSub from 'pubsub-js';

/**
 * We have 2 light sources: pointlight and shadow light ( a directional light). Shadow light can be enabled/disabled,
 * so when enabled, the sum of lights remains the same to when only pointlight was in effect.
 * 
 * This is the ratio when shadow light is enabled. Areas in shadow will 
 * have light with an intensity based on this ratio.
 * 
 * @see RenderableStar.updateLightIntensities
 * 
 */
const SHADOW_LIGHT_TO_POINT_LIGHT_RATIO = 6;

/**
 * Half-depth (km) of the shadow camera frustum, centred on the Sun->target distance.
 * Wide enough to enclose the target's major moons (Callisto, the outermost, orbits
 * Jupiter at ~1.9e6 km), tight enough that the depth map keeps useful precision around
 * the target instead of being smeared across the whole solar system.
 */
const SHADOW_DEPTH_MARGIN = 10_000_000;


/**
 * We can't use the pointlight as the source for shadows (space is too big for our 
 * little shadow map). So we carry around a directional light that always aligns itself 
 * in the direction of the camera to the target. 
 */
class DirectionLightTargetListener {
    star: RenderableStar;

    constructor(star: RenderableStar) {
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
    intensity: 1.5,
    distance: 0,
    decay: 0.0
};

/**
 * This is a body composed of a surface, a point light, an optional directional light for generating shadows, 
 * and Lens Flares.
 * 
 * The surface rotates around the body's axis according to the sideralRotation period.
 * 
 * The pointlight is not the shadow emitter given the distances involved. Instead we use
 * a directional light to generate the shadow maps. The directional light will be oriented
 * towards the target. The light intensity in the scene is the sum of the directional light 
 * and the point light; areas in shadow will not receive any light from the directional light 
 * but still receive light from the point light.
 * 
 * This object manages a set of lens flares, each associated to a scale. 
 * Flares are not 3D objects and can't be scaled like normal Object3D; when the camera moves
 * around the scene, a flare scale is determined and the associated flare is activated.
 */
export class RenderableStar extends RenderableBody {
    pointLight!: PointLight;
    shadowingLight?: DirectionalLight;
    shadowingLightTargetListener: DirectionLightTargetListener;
    lightProperties: Required<LightProperties>;
    readonly surface: StarSurface;
    flareEffect!: FlareEffect;

    constructor(body: Body, bodySystem: BodySystem) {
        super(body, bodySystem);

        this.lightProperties = { ...defaultLightProperties, ...body.lightProperties };
        this.shadowingLightTargetListener = new DirectionLightTargetListener(this);
        this.surface = new StarSurface(body);
        this.addPart(this.surface);

        this.pointLight = new PointLight(this.lightProperties.color, this.lightProperties.intensity, this.lightProperties.distance, this.lightProperties.decay);
        this.pointLight.name = "pointlight";
        this.flareEffect = new FlareEffect(this);

        const axis = body.getAxisDirection();
        this.getObject3D().applyQuaternion(new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), new Vector3(axis.x, axis.y, axis.z)));
        this.getObject3D().add(this.pointLight);
    }

    createShadowLight(): DirectionalLight {
        const SHADOW_MAP_SIZE = 4096 * 2;

        const { color, intensity } = this.lightProperties;
        const light = new DirectionalLight(color, intensity);
        light.castShadow = true;

        // ~jupiter radius size... but this could be sized according to the target.
        const shadowCameraSize = 80000;
        light.shadow.camera.top = shadowCameraSize;
        light.shadow.camera.bottom = -shadowCameraSize;
        light.shadow.camera.left = -shadowCameraSize;
        light.shadow.camera.right = shadowCameraSize;

        light.shadow.bias = 0.0001;
        light.shadow.radius = 2;

        light.shadow.mapSize.width = SHADOW_MAP_SIZE;
        light.shadow.mapSize.height = SHADOW_MAP_SIZE;

        // near/far are not copied from the main camera anymore — they are bracketed
        // tightly around the target every frame in #updateShadowCamera().
        this.shadowingLight = light;
        this.getObject3D().add(light);

        return light;
    }

    getSurface(): Object3D {
        return this.surface.getObject3D();
    }

    getShadowsEnabled(): boolean {
        return this.shadowingLight !== undefined;
    }

    getIntensity(): number {
        return this.lightProperties.intensity;
    }

    setIntensity(value: number) {
        this.lightProperties.intensity = value;
        this.#updateLightIntensities();
    }

    /**
     * The 'shadowing'Light and pointlight's intensities have a total value of this.lightProperties.intensity.
     * When shadowingLight is active, it will have SHADOW_LIGHT_TO_POINT_LIGHT_RATIO; hence if its total intensity is 3 and the ratio is 2,
     * shadowlight will have intensity 2 and pointlight will have intensity 1.
     * 
     * This measure determines how much light remains in shadowed areas (pointlight will illuminate shadowed areas
     * as it is disabled for shadows); a ratio of 2 means that non shadowed areas
     * will be twice as intense as shadowed areas.
     */
    #updateLightIntensities() {
        if (this.getShadowsEnabled()) {
            this.shadowingLight!.intensity = SHADOW_LIGHT_TO_POINT_LIGHT_RATIO * this.lightProperties.intensity / (1 + SHADOW_LIGHT_TO_POINT_LIGHT_RATIO);
            this.pointLight.intensity = 1 * this.lightProperties.intensity / (1 + SHADOW_LIGHT_TO_POINT_LIGHT_RATIO);
        } else {
            this.pointLight.intensity = this.lightProperties.intensity;
        }
    }

    #disableShadowLight() {
        if (!this.getShadowsEnabled()) return;

        this.shadowingLight?.removeFromParent();
        this.shadowingLight?.dispose();
        this.shadowingLight = undefined;
        this.#updateLightIntensities();
    }

    #enableShadowLight() {
        if (this.getShadowsEnabled()) return this;

        const light = this.createShadowLight();
        const target = this.bodySystem.getRenderableBodyTarget().object3D;
        light.target = target;
        this.shadowingLight = light;
        this.#updateLightIntensities();
    }

    setShadowsEnabled(value: boolean): RenderableStar {
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
        this.#updateShadowCamera();
    }

    /**
     * Bracket the shadow camera tightly around the current target.
     *
     * The shadow light sits at the Sun and aims at the target; its (orthographic)
     * shadow camera measures depth from the Sun. With near/far spanning the whole
     * scene the depth map has almost no precision near the target, so bodies far
     * behind it alias into the same depth and wrongly shadow it (Io behind Jupiter).
     * Tracking the Sun->target distance concentrates the depth range where it matters.
     */
    #updateShadowCamera(): void {
        const light = this.shadowingLight;
        if (light === undefined) return;

        const target = this.bodySystem.getRenderableBodyTarget();
        if (target === undefined) return;

        // object3Ds are direct scene children, so position is the world position.
        const distance = this.getObject3D().position.distanceTo(target.object3D.position);

        const shadowCamera = light.shadow.camera;
        // Lateral extent: a few target radii covers the body, its rings, and moons
        // transiting close to the Sun-target axis (the only ones that shadow it).
        const frustumSize = Math.max((target.body.radius / 1000) * 4, 1);
        shadowCamera.top = frustumSize;
        shadowCamera.bottom = -frustumSize;
        shadowCamera.left = -frustumSize;
        shadowCamera.right = frustumSize;
        shadowCamera.near = Math.max(distance - SHADOW_DEPTH_MARGIN, 1);
        shadowCamera.far = distance + SHADOW_DEPTH_MARGIN;
        shadowCamera.updateProjectionMatrix();
    }

    setOrbitOutlineEnabled(value: boolean): void {
        console.log("Star: setOrbitOutlineEnabled:"+this.getName());
    }    
}
