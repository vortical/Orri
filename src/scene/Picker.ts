import { Raycaster, Vector2 } from "three";
import { VectorComponents } from "../domain/models.ts";
import { BodyObject3D } from "../mesh/BodyObject3D.ts";
import { MOUSE_CLICK_ON_BODY_TOPIC, MOUSE_HOVER_OVER_BODY_TOPIC } from "../system/event-types";
import { throttle } from "../system/throttle.ts";
import { BodySystem } from "./BodySystem.ts";

export type PickerEvent = {
    body: BodyObject3D | null;
}

/**
 * Publishes events based on the state of the pointer/mouse in relation with 
 * bodies in the scene: hover over a body, click on a body
 */
export class Picker {
    raycaster = new Raycaster();
    bodySystem: BodySystem;
    isEnabled: boolean = true;

    constructor(bodySystem: BodySystem) {
        this.bodySystem = bodySystem;
        const pointerInteraction = new PointerInteraction(this);
    }

    /**
     * 
     * @param v  pointer position between [-1, 1] for x and y 
     * @returns picked body or null
     */
    pick(v: VectorComponents): BodyObject3D | null {
        this.raycaster.setFromCamera(new Vector2(v.x, v.y), this.bodySystem.camera);
        const intersects = this.raycaster.intersectObjects(this.bodySystem.scene.children);

        const names = intersects.map((intersected) => intersected.object.name).filter(name => name.length > 0);
        return names.length > 0 ? this.bodySystem.getBodyObject3D(names[0]) : null;
    }

    setEnabled(isEnabled: boolean) {
        this.isEnabled = isEnabled;
    }
}



export class PointerInteraction {

    private isDown = false;
    private hasMoved = false;

    constructor(private picker: Picker){
        this.initListeners();
    }

    initListeners(){
        window.addEventListener('pointermove', throttle(300, this, (event: MouseEvent) => this.handleHover(event)));
        window.addEventListener('pointermove', (event: MouseEvent) => this.handlePointerMove(event));
        window.addEventListener('pointerdown', (event: MouseEvent) => this.handlePointerDown(event));
        window.addEventListener('pointerup', (event: MouseEvent) => this.handlePointerUp(event));
    }

    /**
     * Publish MOUSE_HOVER_OVER_BODY_TOPIC when user moves pointer around. 
     * 
     * If there are no bodies behind hovered over: event message will will have null as the body
     * 
     * If there is a body being hovered over: event message will specify the body.
     * 
     * @param event 
     * @returns 
     */
    handleHover(event: MouseEvent) {
        if (!this.picker.isEnabled) return;

        PubSub.publish(MOUSE_HOVER_OVER_BODY_TOPIC, {
            body: this.picker.pick({
                x: (event.clientX / window.innerWidth) * 2 - 1,
                y: - (event.clientY / window.innerHeight) * 2 + 1,
                z: 0
            })
        });
        
    }
    
    handlePointerMove(event: MouseEvent){
        if(this.isDown && !this.hasMoved) {
            this.hasMoved = true;
        }
    }
    
    handlePointerDown(event: MouseEvent){
        this.isDown = true;
        this.hasMoved = false;
        
    }
    
    handlePointerUp(event: MouseEvent){
        
        if (!this.hasMoved && this.picker.isEnabled) {
            PubSub.publish(MOUSE_CLICK_ON_BODY_TOPIC, {
                body: this.picker.pick({
                    x: (event.clientX / window.innerWidth) * 2 - 1,
                    y: - (event.clientY / window.innerHeight) * 2 + 1,
                    z: 0
                })
            });
        }
        
        this.isDown = false;
    }

}

