import { SYSTEM_TIME_TOPIC } from "./event-types";

export function delay(i: number): Promise<void> {
    return new Promise((resolve, reject) => setTimeout(() => resolve(), i))
};
    

export class Timer {

    clock: Clock

    /**
     * Base unit is 1 ms.
     */
    
    name: string;
    timestamp: number;
    startTime: number;

    constructor(clock: Clock, name: string){
        this.clock = clock;
        this.name = name;
        
    }

    /**
     * 
     * @returns time in clock units
     */
    getDelta(): number {        
        // note that the scale could have changed between calls to getDelta, we'd have to account for this...
        const now = performance.now();
        const delta = this.clock.scale * (now - this.timestamp);
        this.timestamp = now;
        return delta;
    }

    getTime(): number {
        const now = performance.now();
        return this.clock.scale * (now - this.startTime);
    }

    start(): Timer{
        this.startTime = performance.now();
        this.timestamp = this.startTime;    
        return this;
    }


}



export class Clock {
    
    /**
     * 
     * * ms since the UNIX epoch (January 1, 1970 00:00:00 UTC) 
     */

    
    
    clockTimeMs: number;
    realTimestampMs: number;

    /**
     * Default scale 1 is 1:1
     */

    scale: number = 1;   
    timers = new Map<string, Timer>();
    timePublisherId: any = undefined;

    /**
     * 
     * @param msToUnit units based on ms. So 1000 msToUnit is a second.
     */
    constructor(){
        this.clockTimeMs = Date.now();
        
        this.realTimestampMs = this.clockTimeMs;

        

    }
    
    setTime(timeMs: number) {
        this.realTimestampMs = Date.now();
        this.clockTimeMs = timeMs;
    }

    getTime(): number {
        const realTimeDelta = Date.now() - this.realTimestampMs;

        const clockTime = this.clockTimeMs + (realTimeDelta) * this.scale;
        return clockTime;
    }


    setScale(scale: number){
        this.setTime(this.getTime());
        this.scale = scale;
    }
    
    enableTimePublisher(isEnabled: boolean){

        if(isEnabled){
            if(this.timePublisherId){
                return;    
            }

            this.timePublisherId = setInterval(() => {
                PubSub.publish(SYSTEM_TIME_TOPIC, this.getTime()) 
            }, 1000);            
            
        } else {
            if (!this.timePublisherId){
                return;
            }

            clearTimeout(this.timePublisherId);
            this.timePublisherId = undefined;
        }
    }

    createTimer(timerId: string): Timer {
        const timer = new Timer(this, timerId);
        this.timers.set(timerId, timer);
        return timer;
    }

    startTimer(timerId: string): Timer {
        const timer = this.timers.get(timerId) || this.createTimer(timerId);
        return timer.start();
    }
    
    /**
     * 
     * @returns time in units
     */
    getDelta(timerId: string=""): number | undefined { 
        return this.timers.get(timerId)?.getDelta();
    }


}
