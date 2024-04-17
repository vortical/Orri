import { TimeUnit, timePeriodToUnits } from "../system/time.ts";


/**
 * A set of predetermined time scales used by UI's prev and next 
 * buttons.
 * 
 * The time scales are also mirrored into negative range.
 * 
 * Calling setCurrentScale does not necessarily need to match a
 * predetermined scale.
 */
export class TimeScaleProvider {

    timeScales = [
        0,
        timePeriodToUnits({seconds:1}, TimeUnit.Seconds),
        timePeriodToUnits({seconds:10},TimeUnit.Seconds),
        timePeriodToUnits({seconds:30},TimeUnit.Seconds),
        timePeriodToUnits({minutes:1},TimeUnit.Seconds),
        timePeriodToUnits({minutes:10},TimeUnit.Seconds),
        timePeriodToUnits({minutes:30},TimeUnit.Seconds),
        timePeriodToUnits({hours:1},TimeUnit.Seconds),
        timePeriodToUnits({hours:6},TimeUnit.Seconds),
        timePeriodToUnits({hours:12},TimeUnit.Seconds),
        timePeriodToUnits({days:1},TimeUnit.Seconds),
        timePeriodToUnits({days:2},TimeUnit.Seconds),
        timePeriodToUnits({days:7},TimeUnit.Seconds),
        timePeriodToUnits({days:14},TimeUnit.Seconds),
        timePeriodToUnits({days:28},TimeUnit.Seconds)
    ];

    currentScale!: number;
    currentIndex!: number; 

    constructor(scale: number){
        this.setCurrentScale(scale);
    }

    /**
     * Honors the scale argument, but sets the index to closest scale
     * that a subsequent call next/prev will use.
     * 
     * @param scale 
     * @returns 
     */
    setCurrentScale(scale: number): TimeScaleProvider{
        const sign = Math.sign(scale);
        let index = this.timeScales.findIndex((v, i) => v > sign*scale);
        if(index == -1){
            // The scale argument surpassed the highest scale,
            // we don't honor that scale; set it to highest value we have.
            index = this.timeScales.length;
            this.currentScale = sign * this.timeScales[index-1];
        }else{
            // We honor it.
            this.currentScale = scale;
        }
        index = Math.max(index-1, 0);        
        this.currentIndex = sign*index;
        return this;
    }

    current(): number {
        return this.currentScale;
    }

    prev(): number {
        return this.next(-1);
    }

    next(direction: -1|1 = 1): number {
        const index = this.currentIndex + direction;
        this.currentIndex = ( Math.abs(index) > this.timeScales.length - 1)? this.currentIndex : index;
        this.currentScale = this.timeScales[Math.abs(this.currentIndex)] * Math.sign(this.currentIndex);
        return this.currentScale;

    }
};

