import { Raycaster, Vector2 } from "three";
import { VectorComponents } from "../domain/models.ts";
import { RenderableBody } from "../mesh/RenderableBody.ts";
import { MOUSE_HOVER_OVER_BODY_TOPIC } from "../system/event-types";
import { throttle } from "../system/throttle.ts";
import { BodySystem } from "./BodySystem.ts";
import { MoveIntent } from "./CameraTargetingState.ts";

export type PickerEvent = {
    body: RenderableBody | null;
}

/**
 * Publishes events based on the state of the pointer/mouse in relation with
 * bodies in the scene: hover over a body, click on a body.
 *
 * Two click sources are unified here:
 *   - Click on the canvas / empty scene area → raycast from screen coordinates.
 *   - Click on a body label → read the label DOM's `data-body-name` attribute
 *     (set by ObjectLabels) and look the body up directly. This avoids raycaster
 *     misses when a label is offset from its body's screen position.
 */
export class Picker {
    raycaster = new Raycaster();
    bodySystem: BodySystem;
    isEnabled: boolean = true;

    constructor(bodySystem: BodySystem) {
        this.bodySystem = bodySystem;
        new PointerInteraction(this);
    }

    /**
     * Raycast from normalised pointer position to find a body in the scene.
     *
     * @param v pointer position between [-1, 1] for x and y
     * @returns picked body or null
     */
    pick(pointer: VectorComponents): RenderableBody | null {
        this.raycaster.setFromCamera(new Vector2(pointer.x, pointer.y), this.bodySystem.camera);
        const intersects = this.raycaster.intersectObjects(this.bodySystem.scene.children);

        const names = intersects.map((intersected) => intersected.object.name).filter(name => name.length > 0);
        return names.length > 0 ? this.bodySystem.getRenderableBody(names[0]) : null;
    }

    /**
     * Resolve a pointer event into the body that was clicked, if any.
     *
     * Returns:
     *   - The body tagged on a label DOM element (`data-body-name`) when the
     *     event target is a label.
     *   - The raycast result when the event target is the canvas or the
     *     labelRenderer's empty space.
     *   - `undefined` when the event is outside the scene area (UI overlay) —
     *     callers should ignore these.
     */
    bodyForTarget(target: HTMLElement | null, clientX: number, clientY: number): RenderableBody | null | undefined {
        if (!target || !this.bodySystem.parentElement.contains(target)) return undefined;

        const labelBodyName = target.dataset?.bodyName;
        if (labelBodyName) {
            return this.bodySystem.getRenderableBody(labelBodyName) ?? null;
        }

        return this.pick({
            x: (clientX / window.innerWidth) * 2 - 1,
            y: -(clientY / window.innerHeight) * 2 + 1,
            z: 0,
        });
    }

    bodyForEvent(event: MouseEvent): RenderableBody | null | undefined {
        return this.bodyForTarget(event.target as HTMLElement | null, event.clientX, event.clientY);
    }

    setEnabled(isEnabled: boolean) {
        this.isEnabled = isEnabled;
    }
}



export class PointerInteraction {

    private isDown = false;
    private hasMoved = false;
    // CSS2DRenderer re-transforms label elements every render frame, so the
    // element under the cursor at `pointerup` may not be the same as the one
    // at `pointerdown` even if the user didn't move. Capture the pointerdown
    // target so we can resolve the click against what the user *actually
    // pressed on*.
    private downTarget: HTMLElement | null = null;

    constructor(private picker: Picker){
        this.initListeners();
    }

    initListeners(){
        window.addEventListener('pointermove', throttle(300, this, (event: MouseEvent) => this.handleHover(event)));
        window.addEventListener('pointermove', (event: MouseEvent) => this.handlePointerMove(event));
        window.addEventListener('pointerdown', (event: MouseEvent) => this.handlePointerDown(event));
        window.addEventListener('pointerup', (event: MouseEvent) => this.handlePointerUp(event));
    }

    handleHover(event: MouseEvent) {
        if (!this.picker.isEnabled) return;
        const body = this.picker.bodyForEvent(event);
        if (body === undefined) return;
        PubSub.publish(MOUSE_HOVER_OVER_BODY_TOPIC, { body });
    }

    handlePointerMove(_event: MouseEvent){
        if (this.isDown && !this.hasMoved) {
            this.hasMoved = true;
        }
    }

    handlePointerDown(event: MouseEvent){
        this.isDown = true;
        this.hasMoved = false;
        this.downTarget = event.target as HTMLElement | null;
    }

    handlePointerUp(event: MouseEvent){
        const wasDrag = this.hasMoved;
        const downTarget = this.downTarget;
        this.isDown = false;
        this.downTarget = null;
        if (wasDrag || !this.picker.isEnabled) return;

        const body = this.picker.bodyForTarget(downTarget, event.clientX, event.clientY);
        // undefined (UI click) or null (empty scene area) → no-op.
        if (!body) return;
        // Pass force=true so a second click on the already-targeted body
        // re-fires the camera tween (moves closer to its standard distance).
        this.picker.bodySystem.moveToTarget(body, 0.5 as MoveIntent );
    }

}
