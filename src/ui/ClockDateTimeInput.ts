import { SYSTEM_TIME_TOPIC } from "../system/event-types";
import { Instance } from "flatpickr/dist/types/instance";
import flatpickr from "flatpickr";
import { BodySystem } from "../scene/BodySystem";

/**
 * When the Calendar is opened: stop listening and updating the input's time from the clock events.
 * 
 * When changes are made to the Calendar, keep track of them internally but don't trigger the 
 * 'onFinishChangeHandler'.
 *
 *  When the Calendar is closed: if there were changes to the time then call the 'onFinishChangeHandler'
 * if its registered.
 * 
*/
export class ClockDateTimeInput {
    flatpicker: Instance;
    subscribtion: any;
    bodySystem: BodySystem;
    currentTime?: Date;
    changedTime?: Date;
    onFinishChangeHandler?: (v: Date | string) => void;

    constructor(inputElementId: string, bodySystem: BodySystem) {
        this.bodySystem = bodySystem;
        this.flatpicker = flatpickr("#datetimePicker", {
            enableTime: true,
            disableMobile: true,
            altInput: true,
            altFormat: "M j, Y  H:i:S",
            // dateFormat: "Y-m-d H:i:s",
            time_24hr: false,
            enableSeconds: true,
            minDate: new Date("2016-01-01"),
            maxDate: new Date("2045-12-31"),
            defaultDate: new Date(bodySystem.clock.getTime()),
            onOpen: () => this.onFlatpickrOpen(),
            onClose: () => this.onFlatpickrClose(),
            onChange: (d) => this.onFlatpickrChange(d)
        }) as Instance;

        this.subscribeToClockTime();
    }

    onFlatpickrOpen() {
        this.unsubscribeToClockTime();
    }

    onFlatpickrClose() {
        // our internal times have millisecond resolution (i.e.: the current time), but the flatpickr ignores the millis.
        if (this.currentTime && this.changedTime && Math.floor(this.currentTime?.getTime() / 1000) !== Math.floor(this.changedTime.getTime() / 1000)) {
            const changedTime = this.changedTime;
            this.currentTime = undefined;
            this.changedTime = undefined;
            this.onFinishChangeHandler && this.onFinishChangeHandler(changedTime);
        }
        this.subscribeToClockTime()
    }

    onFlatpickrChange(d: Date[]) {
        // keep track of changes, but don't invoke the callback until after the date is changed.
        // this is all handled in the onFlatpickrClose.
        this.changedTime = d[0];
    }

    subscribeToClockTime() {
        this.subscribtion = PubSub.subscribe(SYSTEM_TIME_TOPIC, (msg, timeMs) => {
            this.currentTime = new Date(timeMs);
            this.flatpicker.setDate(timeMs, false);
        });
    }

    unsubscribeToClockTime() {
        PubSub.unsubscribe(this.subscribtion);
    }

    onFinishChange(c: (v: string | Date) => void) {
        this.onFinishChangeHandler = c;
        return this;

    };
}