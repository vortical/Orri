import { Mesh, MeshBasicMaterial, SphereGeometry, Vector3 } from "three";
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


    getLocationPinMeshPosition(vector = new Vector3()): Vector3 {
        return this.getMesh().getWorldPosition(vector);
    }

    // setCamera(){

    //     // put camera on the LocationPin!

    //     const camera = this.bodyObject3D.bodySystem.camera;
    //     camera.position.copy(this.getMesh().position);
    //     // ensure the body system's mode is 'ViewFromLocationPin'
    //     this.bodyObject3D.bodySystem.setCameraMode(CameraMode.LookAtTarget);

    //     // I don't think this is a good idea, we can easily control the position.

    //     // this.bodyObject3D.getSurfaceMesh().add(camera);
    // }

    // unsetCamera(){
    //     //this.bodyObject3D.bodySystem.camera.removeFromParent()
    // }

    getMesh(): Mesh {
        return this.mesh;
    }

    remove(){
        this.bodyObject3D.removeLocationPin(this);
    }

}