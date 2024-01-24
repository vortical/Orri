import { Body, MaterialProperties } from '../body/Body.ts';
import { meshProperties } from "../data/bodySystems.ts";
import { Mesh, Material, MeshPhysicalMaterial, TextureLoader, SphereGeometry, MeshPhongMaterialParameters, MeshPhongMaterial, Object3D } from "three";
import { Object3DBuilder } from "./Object3DBuilder.ts";
import { SCENE_LENGTH_UNIT_FACTOR } from '../system/units.ts';
import { rotationForObliquityToOrbit } from '../system/geometry.ts';


const textureLoader = new TextureLoader();

function createAtmosphereMateriel(textureUri: string) {

    // we could offer the option to  load cloud imagery generated from somewhere.
    // and we'd draw it on a canvas. This would be useful when animating in real time.

    const material = new MeshPhongMaterial({
        map: textureLoader.load(textureUri),
        transparent: true,
        opacity: 0.9
    })

    // const options = {
    //     transmission: 1.0,
    //     thickness: 0.1,
    //     roughness: 0.1,
    // };
    
    // const material = new MeshPhysicalMaterial({
    //     // map: textureLoader.load('https://clouds.matteason.co.uk/images/4096x2048/clouds.jpg'),
    //     // map: textureLoader.load('/assets/textures/planets/earth_clouds_2048.png'),
    //     map: textureLoader.load(textureUri),
    //     transmission: options.transmission,
    //     thickness: options.thickness,
    //     roughness: options.roughness,
    //     clearcoat: 1.0,
    //     clearcoatRoughness: 10.0,
    //     specularIntensity:0.0005,
    //     reflectivity: 1.0
    //     });

    return material;
}

function createBodySurfaceMaterial(materialProperties: MaterialProperties): Material {
    
    const params: MeshPhongMaterialParameters = {
        map: materialProperties.textureUri? textureLoader.load(materialProperties.textureUri) : undefined,
        normalMap: materialProperties.normalUri? textureLoader.load(materialProperties.normalUri) : undefined,
        bumpMap: materialProperties.bumpMapUri? textureLoader.load(materialProperties.bumpMapUri) : undefined,
        color: materialProperties.color 
    }

    const material = new MeshPhongMaterial(params);
    return material;
}



const createObject3D: Object3DBuilder = (body: Body) => {

    const { name, radius, position } = body;

    const materialProperties = meshProperties.solarSystem.find((v) => v.name.toLocaleLowerCase() == name.toLowerCase())!;

    // could use LOD...
    const widthSegements = 64;
    const heightSegments = 32;

    const geometry = new SphereGeometry(radius * SCENE_LENGTH_UNIT_FACTOR, widthSegements, heightSegments);
    const material = createBodySurfaceMaterial(materialProperties);
    const surfacemesh = new Mesh(geometry, material);

    if (materialProperties.atmosphereUri) {
        const altitude = 15; //  km
        const atmosphereMesh = new Mesh(
            new SphereGeometry(radius * SCENE_LENGTH_UNIT_FACTOR + altitude, widthSegements, heightSegments),
            createAtmosphereMateriel(materialProperties.atmosphereUri)
        );
        surfacemesh.add(atmosphereMesh);
    }

    surfacemesh.name = name;

    const worldmesh = new Object3D();


    worldmesh.position.set(position.x * SCENE_LENGTH_UNIT_FACTOR, position.y * SCENE_LENGTH_UNIT_FACTOR, position.z * SCENE_LENGTH_UNIT_FACTOR);

    // we will have to calculate rotation/tilt also, but this is easy as its constant.
    const rotation =body.obliquityOrientation();
    
    worldmesh.rotation.set(rotation.x, rotation.y, rotation.z); //to do, this is the axis tilt on the orbital plane.
    worldmesh.add(surfacemesh);

    return worldmesh;
}    

export { createObject3D as createPlanetObject3D };