export interface VectorComponents {
    x: number;
    y: number;
    z: number;
}

export interface Axis {
    // rotation based off the 'prime meridian' of the body.
    rotation?: number
    //ICRS vector of the axis, body spins around this axis
    direction?: VectorComponents
}

export interface KinematicObject {
    name: string;
    axis?: Axis,
    velocity: VectorComponents
    position: VectorComponents;
    datetime: Date;
}

export type TimePeriod = {
    days?: number
    hours?: number
    minutes?: number
    seconds?: number
    millis?: number
};

export type MaterialProperties = {
    textureUri?: string;
    bumpMapUri?: string;
    bumpMapScale?: number;
    normalUri?: string;
    normalMapScale?: number;
    atmosphereUri?: string;
    specularMapUri?: string;
    alphaUri?: string;
    color?: string;
}

export type GLTFModelProperties = {
    uri: string,
    baseScale: number
}

export type LightProperties = {
    color?: string;
    intensity?: number;
    distance?: number;
    decay?: number;
};

export type RingProperties = {
    opacity: number;
    minRadius: number;
    maxRadius: number;
    alphaMapUri?: string;
    colorMapUri?: string;
};

export type BodyType = "star" | "planet" | "moon" | "model";


export type BodyProperties = {
    type: BodyType;
    name: string;
    parent: string;
    mass: number;
    radius: number;
    position?: VectorComponents;
    velocity?: VectorComponents;
    castShadow: boolean;
    receiveShadow: boolean;

    /**
     * Obliquity to Orbit (degrees) - The angle in degrees of the axis of a body
     * (the imaginary line running through the center of the planet from the north
     * to south poles) is tilted relative to a line perpendicular to the planet's 
     * orbit around its parent (orbital plane), with north pole defined by right hand rule.
     *  
     * This inclination defines the body's equatorial plane. We only use this value to 
     * calculate a tilt IF an axis direction (in 3D) is not given, so that we at least establish
     * a realistic tilt.
     */
    obliquityToOrbit?: number;

    /**
     * Period of rotation around axis in seconds
     */
    sideralRotationPeriod?: TimePeriod;
    sideralRotation?: VectorComponents,
    lightProperties?: LightProperties;

    rings?: RingProperties;
    color?: string;
    textures?: MaterialProperties;
    gltf?: GLTFModelProperties;

    
}

export enum ShadowType {
    Umbra = "Umbra",
    Penumbra = "Penumbra"
}
