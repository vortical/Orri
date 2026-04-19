import { BodyObject3D } from "../mesh/BodyObject3D";
import { BODY_ACTIVE_TOPIC, BodyActiveEventMessageType } from "../system/event-types";
import { BodySystem } from "./BodySystem";
import { Body } from "../body/Body";
import { hashCode } from "../system/functions";


export class BodyActiveStateHandler {
    bodySystem: BodySystem;

    constructor(bodySystem: BodySystem){
        this.bodySystem = bodySystem;
        this.createSubscription();
    }

    createSubscription(){
      PubSub.subscribe(BODY_ACTIVE_TOPIC, (msg, event: BodyActiveEventMessageType) => {            
              const selectedBody = event.body;
              this.bodySystem.setBodyActive(selectedBody, event.isActive)
      });
    }
}