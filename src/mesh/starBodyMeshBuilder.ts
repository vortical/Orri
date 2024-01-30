
import { Body, MaterialProperties } from '../body/Body.ts';
import { meshProperties } from "../data/bodySystems.ts";
import { Mesh, Material, TextureLoader, SphereGeometry, MeshPhongMaterial, PointLight, Object3D, MeshBasicMaterial } from "three";
import { Object3DBuilder } from "./Object3DBuilder.ts";
import { SCENE_LENGTH_UNIT_FACTOR } from '../system/units.ts';

const textureLoader = new TextureLoader();

function createSunMaterial(materialProperties: MaterialProperties): Material {

    const texture = materialProperties.textureUri? textureLoader.load(materialProperties.textureUri) : undefined;

    const material = new MeshBasicMaterial( { 
        map: texture,
        color: "white",
         
    }  );
    // const material = new MeshPhongMaterial({
    //     map: texture,
    //     lightMap: texture,
    //     // alphaMap: materialProperties.alphaUri? textureLoader.load(materialProperties.alphaUri) : undefined,
    //     transparent: true,
    //     opacity: 0.9
    //   });

    return material;

}

const createObject3D: Object3DBuilder = (body: Body): Object3D => {
    const { name, radius, position } = body;
    const materialProperties = meshProperties.solarSystem.find((v) => v.name.toLocaleLowerCase() == name.toLowerCase())!;

    const widthSegements = 64;
    const heightSegments = 32;

    const geometry = new SphereGeometry(radius * SCENE_LENGTH_UNIT_FACTOR, widthSegements, heightSegments);
    const material = createSunMaterial(materialProperties);
    const surfacemesh = new Mesh(geometry, material);

    
    surfacemesh.name = name;
    
    const { color = "white", intensity = 0.9, distance = 0, decay = 0.06 } = body.lightProperties!;
    const light = new PointLight(color, intensity, distance, decay);

    
    light.add(surfacemesh);

    const worldmesh = new Object3D();
    worldmesh.position.set(position.x * SCENE_LENGTH_UNIT_FACTOR, position.y * SCENE_LENGTH_UNIT_FACTOR, position.z * SCENE_LENGTH_UNIT_FACTOR);

    const rotation =body.obliquityOrientation();
    
    worldmesh.rotation.set(rotation.x, rotation.y, rotation.z); //to do, this is the axis tilt on the orbital plane.
    


    worldmesh.add(light);

    return worldmesh;
}

export { createObject3D as createStarObject3D };