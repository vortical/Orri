import { Controller } from "lil-gui";
import { SYSTEM_TIME_TOPIC } from "../system/event-types";

export class ClockTimeUpdateHandler {
    subscribtion: any;

    controller: Controller;
    _onFinishChange?: (v: string) => void;

    currentValue?: string;

    constructor(controller: Controller){
        this.controller = controller;
        
        this.subscribeToClockTime();

        // stop listening to clock when it gains focus
        this.controller.domElement.addEventListener("click", (event) => {
            this.currentValue = this.controller.getValue();
            this.unsubscribeToClockTime();
        });
    
        this.controller.onFinishChange((v: string) => {
            // start listening again to clock
            this.subscribeToClockTime();
            // only trigger if the value was changed
            if (this.currentValue !== v){
                this.currentValue = undefined;
                this._onFinishChange && this._onFinishChange(v);

            }

        });
    }

    subscribeToClockTime(){
        this.subscribtion = PubSub.subscribe(SYSTEM_TIME_TOPIC, (msg, timeMs) => {
            this.controller.setValue(new Date(timeMs).toISOString().slice(0, -5)+'Z')            
            this.controller.updateDisplay()
        });
    }

    unsubscribeToClockTime() {
        PubSub.unsubscribe(this.subscribtion);
    }

    onFinishChange(c: (v: string | Date) => void){
        this._onFinishChange = c;
        return this;

    };
}