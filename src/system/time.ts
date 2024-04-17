import { TimePeriod } from "../domain/models";

const SECOND_TO_MS = 1000;
const MINUTE_TO_MS = 60 * SECOND_TO_MS; 
const HOUR_TO_MS = 60 * MINUTE_TO_MS;
const DAY_TO_MS = 24 * HOUR_TO_MS;


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
 * @param date1 
 * @param date2 
 * @param resolution
 * @returns 
 */
export function timeEquals(date1: Date, date2: Date, resolution: TimeUnit): boolean {
    const timeMs = convert(1, resolution, (units, mult) => units * mult);
    return Math.abs(date1.getTime() - date2.getTime()) < timeMs;
}

export function timePeriodToMs(timePeriod: TimePeriod): number {
    return (timePeriod.days? timePeriod.days * DAY_TO_MS : 0) 
            + (timePeriod.hours? timePeriod.hours * HOUR_TO_MS : 0)
            + (timePeriod.minutes? timePeriod.minutes * MINUTE_TO_MS : 0) 
            + (timePeriod.seconds? timePeriod.seconds * SECOND_TO_MS : 0) 
            + (timePeriod.millis? timePeriod.millis : 0);
}

export function timePeriodToUnits(timePeriod: TimePeriod, unit: TimeUnit=TimeUnit.Milliseconds): number {
    return timeMsToUnits(timePeriodToMs(timePeriod), unit);
}

export function unitsToTimePeriod(units: number, baseUnit: TimeUnit=TimeUnit.Milliseconds): TimePeriod{
    const period: TimePeriod = {};
    
    const ms = unitsToMs(units, baseUnit);
    const floor = units >= 0 ? Math.floor: Math.ceil; 

    period.days = floor(ms / DAY_TO_MS);
    period.hours = floor((ms - timePeriodToMs(period)) / HOUR_TO_MS);
    period.minutes = floor((ms - timePeriodToMs(period)) / MINUTE_TO_MS);
    period.seconds = floor((ms - timePeriodToMs(period)) / SECOND_TO_MS);
    period.millis = floor(ms - timePeriodToMs(period));
    return period;
}

function convert(units: number, unit: TimeUnit=TimeUnit.Milliseconds, op: (n: number, n2: number) => number): number {
    switch (unit) {
        case TimeUnit.Milliseconds:
            return units;
        case TimeUnit.Seconds:
            return op(units, SECOND_TO_MS);
        case TimeUnit.Minutes:
            return op(units, MINUTE_TO_MS);
        case TimeUnit.Hours: 
            return op(units, HOUR_TO_MS);
        case TimeUnit.Days:
            return op(units, DAY_TO_MS);
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

export type PeriodPropertyLabels = {
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

const defaultPeriodPropertyLabels: PeriodPropertyLabels = {
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

export function formatPeriod(period: TimePeriod, periodPropertyNames: PeriodPropertyLabels=defaultPeriodPropertyLabels): string {

    const propertyNames = {...defaultPeriodPropertyLabels,...periodPropertyNames};

    const components: String[] = [];

    if(period.days==1 || period.days == -1){
        components.push(period.days.toString().concat(propertyNames.day));
    } 

    if(period.days && Math.abs(period.days) > 1){
        components.push(period.days.toString().concat(propertyNames.days));        
    }     

    if(period.hours==1 || period.hours== -1){
        components.push(period.hours.toString().concat(propertyNames.hour));
    } 
    
    if(period.hours && Math.abs(period.hours) > 1){
        components.push(period.hours.toString().concat(propertyNames.hours));
    }     

    if(period.minutes == 1 || period.minutes == -1){
        components.push(period.minutes.toString().concat(propertyNames.minute));
    }

    if(period.minutes && Math.abs(period.minutes) > 1){
        components.push(period.minutes.toString().concat(propertyNames.minutes));        
    } 

    if(period.seconds == 1 || period.seconds == -1){
        components.push(period.seconds.toString().concat(propertyNames.second));                
    }
    
    if(period.seconds && Math.abs(period.seconds) > 1){
        components.push(period.seconds.toString().concat(propertyNames.seconds));                
    } 

    if(period.millis == 1 || period.millis == -1){
        components.push(period.millis.toString().concat(propertyNames.milli));                        
    }

    if(period.millis && Math.abs(period.millis) > 1){
        components.push(period.millis.toString().concat(propertyNames.millis));                        
    }   

    return components.join(", ");
    
}




