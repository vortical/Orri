import { TimePeriod } from "../domain/models";
import { SYSTEM_TIME_TOPIC } from "./event-types";

export function delay(i: number): Promise<void> {
    return new Promise((resolve, reject) => setTimeout(() => resolve(), i))
};
    


/**
 *
 *
 * Limit the invocation frequency of a function.
 * 
 * E.g. of usage:
 * 
 * async function throttling() {
 *
 *   function delay(i: number): Promise<void> {
 *       return new Promise((resolve, reject) => setTimeout(() => resolve(), i))
 *   }
 *
 *   const context = {
 *       value: "Some property"
 *   };
 *
 *   const throttledFunction = throttle(200, context, (v: number, x: number) => {
 *          console.log(this.value+" args:"+v+","+x);
 *       }
 *   });
 *
 * 
 *   for(let i=0; i< 10000; i++){
 *       throttledFunction(i, i+100);
 *       await delay(1);
 *   }
* }

 * @param threshold represents minimum interval delta between invocation
 * @param scope the scope/context of the function
 * @param fn the function.
 * @returns
 */
export function throttle(threshold: number, scope: any | undefined, fn: (...args: any) => any) {
    let last: number | undefined = undefined;
    let timeoutId: any = undefined;
    return function (...args: any) {
        const context = scope || this;
        const now = new Date().getTime();
        last = last || now - threshold;

        // replace previous throttled invocation, update
        // time with remaining time until threshold is met.
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            last = now;
            fn.apply(context, args);
        }, threshold - (now - last));
    };
};

export enum TimeUnit {
    Milliseconds,
    Seconds,
    Minutes,
    Hours,
    Days
}

export function timePeriodToMs(timePeriod: TimePeriod): number {
    const daysToMillis = (days?: number) => days? days * hoursToMillis(24) : 0
    const hoursToMillis = (hours?: number) => hours? hours * minutesToMillis(60) : 0;
    const minutesToMillis = (minutes?: number) => minutes? minutes * secondsToMillis(60): 0;
    const secondsToMillis = (seconds?: number) => seconds? seconds * 1000: 0;
    const millisToMills = (millis? :number) => millis? millis : 0;

    return daysToMillis(timePeriod.days) + hoursToMillis(timePeriod.hours)+minutesToMillis(timePeriod.minutes)+secondsToMillis(timePeriod.seconds) + millisToMills(timePeriod.millis);
}

export function timePeriodToUnits(timePeriod: TimePeriod, unit: TimeUnit=TimeUnit.Milliseconds): number {
    return timeMsToUnits(timePeriodToMs(timePeriod), unit);
}

export function timeMsToUnits(timeMs: number, unit: TimeUnit=TimeUnit.Milliseconds): number {
    switch (unit) {
        case TimeUnit.Milliseconds:
            return timeMs;
        case TimeUnit.Seconds:
            return timeMs / 1000.0;
        case TimeUnit.Minutes:
            return timeMs / 60000.0;
        case TimeUnit.Hours: 
            return timeMs / 3600000.0;
        case TimeUnit.Days:
            return timeMs / 86400000.0;
        default:
            throw new Error()
    }
}


/**
 * A timer associated to a clock. 
 * 
 * This timer is used internally to determine the time delta between each animation loop with a clock
 * that can be sped/slowed up/down.
 */
export class Timer {

    clock: Clock

    /**
     * Base unit is 1 ms.
     */
    name: string;
    timestamp!: number;
    // startTime!: number;

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

    // getTime(): number {
    //     const now = performance.now();
    //     return this.clock.scale * (now - this.startTime);
    // }

    start(): Timer{
        // this.startTime = performance.now();
        this.timestamp = performance.now();    
        return this;
    }
}


/**
 * Manages the animation time, can be sped up/slowed down. Can have downstream timers associated to
 * it.
 * 
 * Also publishes its current time at each second to a topic: SYSTEM_TIME_TOPIC.
 */
export class Clock {
    
    /**
     * ms based on the usual the UNIX epoch (January 1, 1970 00:00:00 UTC) 
     */
    clockTimeMs!: number;
    realTimestampMs!: number;

    _isPaused: boolean = false;
    /**
     * Default scale 1 is 1:1
     */
    scale: number = 1;   

    savedScale: number = 1;

    timers = new Map<string, Timer>();

    /**
     * references the pub/sub publisher once started, else indefined
     */
    timePublisherId: any = undefined;

    /**
     * 
     * @param msToUnit units based on ms. So 1000 msToUnit is a second.
     */
    constructor(clockTimeMs: number = Date.now() ){
        this.setTime(clockTimeMs);
        // this.clockTimeMs = Date.now();
        // this.realTimestampMs = this.clockTimeMs;
    }

    
    setPaused(value: boolean): boolean {
        if(value){
            if(!this.isPaused()){
                this.savedScale = this.scale;
                this.setScale(0);
                this._isPaused = true;
            }
        }else{
            if(this.isPaused()){
                this._isPaused = false;
                this.setScale(this.savedScale);
            }
        }
        return this.isPaused();
    }

    isPaused(): boolean {
        return this._isPaused;
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
        if(this.isPaused()){
            this.savedScale = scale;
        } else {
            this.setTime(this.getTime());
            this.scale = scale;
        }
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
     * @returns time ms
     */
    getDelta(timerId: string=""): number | undefined { 
        return this.timers.get(timerId)?.getDelta();
    }
}
