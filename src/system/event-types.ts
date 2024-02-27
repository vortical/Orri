import { BodyObject3D } from "../mesh/BodyObject3D";

export const SYSTEM_TIME_TOPIC = Symbol('Topic for time messages from a clock');
export const MOUSE_HOVER_OVER_BODY_TOPIC = Symbol('Topic for mouse hovered over a body');
export const MOUSE_CLICK_ON_BODY_TOPIC = Symbol('Topic for mouse clicked body');
export const BODY_SELECT_TOPIC = Symbol('Topic from BodySystem when target changes');


export type BodySelectEventMessageType = {
    body: BodyObject3D
}
