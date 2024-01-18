
import { Body, MaterialProperties } from '../body/Body.ts';
import { meshProperties } from "../data/bodySystems.ts";
import { Mesh, Material, TextureLoader, SphereGeometry, MeshPhongMaterial, PointLight } from "three";
import { MeshBuilder } from "./MeshBuilder.ts";
import { SCENE_LENGTH_UNIT_FACTOR } from '../system/units.ts';

const textureLoader = new TextureLoader();

function createSunMaterial(materialProperties: MaterialProperties): Material {

    const texture = materialProperties.textureUri? textureLoader.load(materialProperties.textureUri) : undefined;

    const materiel = new MeshPhongMaterial({
        map: texture,
        lightMap: texture,
        // alphaMap: materialProperties.alphaUri? textureLoader.load(materialProperties.alphaUri) : undefined,
        transparent: true,
        opacity: 0.9
      });

    return materiel;

}

function createStarMesh(body: Body,  materialProperties: MaterialProperties): Mesh {

    const { name, radius, position } = body;

    const widthSegements = 64;
    const heightSegments = 32;

    const geometry = new SphereGeometry(radius * SCENE_LENGTH_UNIT_FACTOR, widthSegements, heightSegments);
    const material = createSunMaterial(materialProperties);
    const surfacemesh = new Mesh(geometry, material);

    
    surfacemesh.name = name;
    surfacemesh.position.set(position.x * SCENE_LENGTH_UNIT_FACTOR, position.y * SCENE_LENGTH_UNIT_FACTOR, position.z * SCENE_LENGTH_UNIT_FACTOR);

    const { color = "white", intensity = 0.8, distance = 0, decay = 0.05 } = body.lightProperties!;
    const light = new PointLight(color, intensity, distance, decay);

    surfacemesh.add(light);
    return surfacemesh;
}

const createMesh: MeshBuilder = (body: Body) => {
    const materialProperties = meshProperties.solarSystem.find((v) => v.name.toLocaleLowerCase() == body.name.toLowerCase())!;
    const mesh = createStarMesh(body, materialProperties)
    return mesh;
}



export { createMesh as createStarMesh };