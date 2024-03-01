
import { Object3D } from 'three';
import { Body } from '../domain/Body.ts';
import { toRad } from '../system/geometry.ts';
import { BodySystem } from '../scene/BodySystem.ts';


abstract class BodyObject3D {
    abstract object3D: Object3D;
    body: Body;
    bodySystem: BodySystem;

    constructor(body: Body, bodySystem: BodySystem){
        this.body = body;
        this.bodySystem = bodySystem;
    }


    getName(): string {
        return this.body.name;
    }

    scale(scale: number){
        this.object3D.scale.set(scale, scale, scale);
    }

    setBody(body: Body){
        this.body = body;
    }

    // getObject3D(): Object3D {
    //     if(this.object3D === undefined){
    //         this.object3D = this.createObject3D(this.body);
    //     }
    //     return this.object3D;
        
    // }

    /**
     * Calling this after making changes to the underlying body properties
     * will update the 3d properties of the Obect3D
     */
    update(): void {
        const body = this.body;
        this.object3D.position.set(body.position.x/1000, body.position.y/1000, body.position.z/1000);

        this.object3D.children?.forEach((c => {
            c.rotation.set(body.sideralRotation.x, body.sideralRotation.y, body.sideralRotation.z);
            // each surface itself may have animations (e.g. atmosphere), so we should
            // call an update on those.
            // this would rotate the ring if we did not filter this out (only rotate the atmosphere).
            // regardless we need to create a model that represents our model
            if(c.children && c.children.length==1){
                if(c.children[0].userData?.type === "atmosphere"){
                    // fake this for now
                   c.children[0].rotateY(toRad(0.0015));
                }
            }
        }));
    }    
}

export { BodyObject3D };