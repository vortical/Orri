import { Raycaster, Vector2 } from "three";
import { Vector } from "../system/vecs";
import { BodySystem } from "./BodySystem.ts";
import { Body } from '../body/Body.ts';
import { throttle } from "../system/throttler";
import { MOUSE_CLICK_ON_BODY_TOPIC, MOUSE_HOVER_OVER_BODY_TOPIC } from "../system/event-types";

export type PickerEvent = {
    body: Body | null;
}

export class Picker {

    raycaster = new Raycaster();
    bodySystem: BodySystem;
    isEnabled: boolean = true;

    constructor(bodySystem: BodySystem){
        this.bodySystem = bodySystem;
        initMouseEventPickHandler(this);
    }
    
    /**
     * 
     * @param v  pointer position between [-1, 1] for x and y 
     * @returns picked body or null
     */
    pick(v: Vector): Body | null {
        this.raycaster.setFromCamera(new Vector2(v.x, v.y), this.bodySystem.camera);
        const intersects = this.raycaster.intersectObjects(this.bodySystem.scene.children);
        
        const names = intersects.map((intersected) => intersected.object.name).filter(name => name.length > 0);
        return names.length > 0 ? this.bodySystem.getBody(names[0]): null;
    }

    setEnabled(isEnabled: boolean) {
        this.isEnabled = isEnabled;
    }

}


function initMouseEventPickHandler(picker:  Picker) {

    window.addEventListener( 'pointermove', throttle(300, undefined, 
        (event: MouseEvent) => {
            if (!picker.isEnabled) {
                return;
            }

            

           const hoveredBody =  picker.pick({
                x: ( event.clientX / window.innerWidth ) * 2 - 1,
                y: - ( event.clientY / window.innerHeight ) * 2 + 1
            });

            console.log("pick body:" + hoveredBody?.name || "none");
            // can be null
            PubSub.publish(MOUSE_HOVER_OVER_BODY_TOPIC, {body: hoveredBody} ); 

        }
    ));

    window.addEventListener( 'click', throttle(300, undefined,
        (event: MouseEvent) => {
            if (!picker.isEnabled) {
                return;
            }

           const clickedBody =   picker.pick({
                x: ( event.clientX / window.innerWidth ) * 2 - 1,
                y: - ( event.clientY / window.innerHeight ) * 2 + 1
            });

            // can be null
            PubSub.publish(MOUSE_CLICK_ON_BODY_TOPIC, {body: clickedBody}); 

    }));

}