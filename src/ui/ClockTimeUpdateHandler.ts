import { Controller } from "lil-gui";
import { SYSTEM_TIME_TOPIC } from "../system/event-types";



function toIsoString(date: Date) {
    var tzo = -date.getTimezoneOffset(),
        dif = tzo >= 0 ? '+' : '-',
        pad = function(num: number) {
            return (num < 10 ? '0' : '') + num;
        };
  
    return date.getFullYear() +
        '-' + pad(date.getMonth() + 1) +
        '-' + pad(date.getDate()) +
        'T' + pad(date.getHours()) +
        ':' + pad(date.getMinutes()) +
        ':' + pad(date.getSeconds()) +
        dif + pad(Math.floor(Math.abs(tzo) / 60)) +
        ':' + pad(Math.abs(tzo) % 60);
  }

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
        // time comes in as zulu tz
        this.subscribtion = PubSub.subscribe(SYSTEM_TIME_TOPIC, (msg, timeMs) => {
            this.controller.setValue( toIsoString(new Date(timeMs)));
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