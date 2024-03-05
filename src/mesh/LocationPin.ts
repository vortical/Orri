import { Mesh, MeshBasicMaterial, SphereGeometry } from "three";
import { LatLon } from "../system/geometry";
import { Body } from '../domain/Body.ts';
import { BodyObject3D } from "./BodyObject3D.ts";
import { CameraMode } from "../scene/BodySystem.ts";

export class LocationPin {
    mesh: Mesh;
    bodyObject3D: BodyObject3D;
    color: string;
    latlon: LatLon;

    constructor(latlon: LatLon, bodyObject3D: BodyObject3D, color: string){        
        function createBodyPinMesh() {
            const pinRadius = 20; 
            const geometry = new SphereGeometry(pinRadius, 18, 18);
            const materiel = new MeshBasicMaterial({color: color});
            const mesh = new Mesh(geometry, materiel);
            mesh.position.setFromSpherical(latlon.toSpherical(bodyObject3D.body.radius/1000));            
            return mesh;
        }        
        this.latlon = latlon;
        this.mesh = createBodyPinMesh()
        this.bodyObject3D = bodyObject3D;
        this.color = color;
        bodyObject3D.addLocationPin(this);
    }


    setCamera(){
        const camera = this.bodyObject3D.bodySystem.camera;
        camera.position.copy(this.getMesh().position);
        this.bodyObject3D.bodySystem.setCameraMode(CameraMode.LookAtTarget);
        this.bodyObject3D.getSurfaceMesh().add(camera);

    }

    getMesh(): Mesh {
        return this.mesh;
    }

    remove(){
        this.bodyObject3D.removeLocationPin(this);
    }

}