import { Body } from '../domain/Body.ts';
import { MaterialProperties } from '../domain/models.ts';
import { meshProperties } from "../data/bodySystems.ts";
import { Mesh, Material, TextureLoader, SphereGeometry, PointLight, Object3D, MeshBasicMaterial, Quaternion, Vector3 } from "three";
import { SCENE_LENGTH_UNIT_FACTOR } from '../system/units.ts';
import { BodyObject3D } from './BodyObject3D.ts';

const textureLoader = new TextureLoader();

function createSunMaterial(materialProperties: MaterialProperties): Material {
    return new MeshBasicMaterial( { 
        map: materialProperties.textureUri? textureLoader.load(materialProperties.textureUri) : undefined,
        color: "white",
         
    }  );
}

const createObject3D = (body: Body): Object3D => {
    const { name, radius, position } = body;
    const materialProperties = meshProperties.solarSystem.find((v) => v.name.toLocaleLowerCase() == name.toLowerCase())!;
    const widthSegements = 64;
    const heightSegments = 32;
    const geometry = new SphereGeometry(radius * SCENE_LENGTH_UNIT_FACTOR, widthSegements, heightSegments);
    const material = createSunMaterial(materialProperties);
    const surfacemesh = new Mesh(geometry, material);
    surfacemesh.name = name;
    const { color = "white", intensity = 1.2, distance = 0, decay = 0.06 } = body.lightProperties!;
    const light = new PointLight(color, intensity, distance, decay);
    const bodymesh = new Object3D();
    
    light.add(surfacemesh);

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

class StarBodyObject3D extends BodyObject3D {
    createObject3D(body: Body): Object3D{
        return createObject3D(body)
    }
}

export { StarBodyObject3D };