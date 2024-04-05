import { TimePeriod } from "../domain/models";
import { SYSTEM_TIME_TOPIC, TIME_SCALE_TOPIC } from "./event-types";

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

/**
 * Javascript's date toIsoString is borked.
 * 
 * @param date 
 * @returns 
 */
export function toIsoString(date: Date) {
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

export enum TimeUnit {
    Milliseconds,
    Seconds,
    Minutes,
    Hours,
    Days
}

/**
 * Compares the dates based on the resolution. 
 * 
 * E.g.: if resolution TimeUnit.Minutes then they are equal if they have less
 * than a minute difference.
 * 
 * 
 * @param date1 
 * @param date2 
 * @param resolution A timeUnit
 * @returns 
 */
export function timeEquals(date1: Date, date2: Date, resolution: TimeUnit): boolean {
    const timeMs = convert(1, resolution, (units, mult) => units * mult);
    return Math.abs(date1.getTime() - date2.getTime()) < timeMs;
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

export function unitsToTimePeriod(units: number, baseUnit: TimeUnit=TimeUnit.Milliseconds): TimePeriod{

    const period: TimePeriod = {};
    const ms = unitsToMs(units, baseUnit);

    period.days = Math.floor(ms/timePeriodToMs({days:1}));
    period.hours = Math.floor((ms - timePeriodToMs(period))/timePeriodToMs({hours:1}));
    period.minutes = Math.floor((ms - timePeriodToMs(period))/timePeriodToMs({minutes:1}));
    period.seconds = Math.floor((ms - timePeriodToMs(period))/timePeriodToMs({seconds:1}));
    period.millis = Math.floor((ms - timePeriodToMs(period))/timePeriodToMs({millis:1}));
    return period;
}


function convert(units: number, unit: TimeUnit=TimeUnit.Milliseconds, op: (n: number, n2: number) => number): number {
    switch (unit) {
        case TimeUnit.Milliseconds:
            return units;
        case TimeUnit.Seconds:
            return op(units, 1000.0);
        case TimeUnit.Minutes:
            return op(units, 60000.0);
        case TimeUnit.Hours: 
            return op(units, 3600000.0);
        case TimeUnit.Days:
            return op(units, 86400000.0);
        default:
            throw new Error()
    }
}

export function timeMsToUnits(timeMs: number, unit: TimeUnit=TimeUnit.Milliseconds): number {
    return convert(timeMs, unit, (ms, div) => ms / div);
}

export function unitsToMs(units: number, baseUnit: TimeUnit=TimeUnit.Milliseconds): number {
    return convert(units, baseUnit, (units, mult) => units * mult);
}

export type PeriodPropertyNames = {
    day: string
    days: string,
    hour: string,
    hours: string,
    minute: string,
    minutes: string,
    second: string,
    seconds: string,
    milli: string,
    millis: string
}

const defaultPeriodPropertyNames: PeriodPropertyNames = {
    day: "day",
    days: "days",
    hour: "hr",
    hours: "hr",
    minute: "min",
    minutes: "min",
    second: "s",
    seconds: "s",
    milli: "ms",
    millis: "ms"
};

export function formatPeriod(period: TimePeriod, periodPropertyNames: PeriodPropertyNames=defaultPeriodPropertyNames): string {

    const propertyNames = {...defaultPeriodPropertyNames,...periodPropertyNames};

    const components: String[] = [];

    if(period.days==1){
        components.push(period.days.toString().concat(propertyNames.day));
    } 

    if(period.days && period.days > 1){
        components.push(period.days.toString().concat(propertyNames.days));        
    }     

    if(period.hours==1){
        components.push(period.hours.toString().concat(propertyNames.hour));
    } 
    
    if(period.hours && period.hours > 1){
        components.push(period.hours.toString().concat(propertyNames.hours));
    }     

    if(period.minutes==1){
        components.push(period.minutes.toString().concat(propertyNames.minute));
    }

    if(period.minutes && period.minutes > 1){
        components.push(period.minutes.toString().concat(propertyNames.minutes));        
    } 

    if(period.seconds == 1){
        components.push(period.seconds.toString().concat(propertyNames.second));                
    }
    
    if(period.seconds && period.seconds > 1){
        components.push(period.seconds.toString().concat(propertyNames.seconds));                
    } 

    if(period.millis == 1){
        components.push(period.millis.toString().concat(propertyNames.milli));                        
    }

    if(period.millis && period.millis > 1){
        components.push(period.millis.toString().concat(propertyNames.millis));                        
    }   

    return components.join(", ");
    
}



/**
 * A timer associated to a clock. 
 * 
 * This timer is used internally to determine the time delta between each animation loop with a clock
 * that can be sped/slowed up/down.
 */
export class Timer {

    clock: Clock
    name: string;
    timestamp!: number;

    constructor(clock: Clock, name: string){
        this.clock = clock;
        this.name = name;
    }

    /**
     * 
     * @returns time in ms
     */
    getDelta(): number {        
        // note that the scale could have changed between calls to getDelta, we'd have to account for this...
        const now = performance.now();
        const delta = this.clock.scale * (now - this.timestamp);
        this.timestamp = now;
        return delta;
    }

    start(): Timer{
        // this.startTime = performance.now();
        this.timestamp = performance.now();    
        return this;
    }
}


/**
 * Manages the animation time, can be sped up/slowed down using scales which 
 * can have positive or negative values. 
 * 
 * Can have downstream timers associated to it.
 * 
 * Also publishes its current time at each realtime second to a topic: SYSTEM_TIME_TOPIC. The 
 * time is in ms based on the usual the UNIX epoch (January 1, 1970 00:00:00 UTC) .
 * 
 */
export class Clock {
    
    /**
     * clockTimeMs is the scaled time.
     */
    clockTimeMs!: number;
    
    /**
     * realTimestampMs keeps track of actual time in ms.
     * 
     * When scales are changed, the realtime reflects the initial
     * time when the scale was applied. 
     * 
     * Thus clockTimeMs is always:
     * clockTimeMs + (now-realTimestampMs)*scale
     * 
     */
    realTimestampMs!: number;
    _isPaused: boolean = false;
    scale: number = 1;   
    savedScale: number = 1;
    timers = new Map<string, Timer>();

    /**
     * references the pub/sub publisher once started, else indefined
     */
    timePublisherId: any = undefined;

    
    

    /**
     * 
     * @param msToUnit units based on ms
     */
    constructor(clockTimeMs: number = Date.now() ){
        this.setTime(clockTimeMs);
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

    getScale():number{
        return this.isPaused()? this.savedScale: this.scale;        
    }
    
    publishTimeScale = throttle(200, undefined, (scale: number) => PubSub.publish(TIME_SCALE_TOPIC, scale)); 

    setScale(scale: number){
        if(this.isPaused()){
            this.savedScale = scale;
            this.publishTimeScale(this.savedScale);
            
        } else {
            this.setTime(this.getTime());
            this.scale = scale;
            this.publishTimeScale(this.scale);            
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


