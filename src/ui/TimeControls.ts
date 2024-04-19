import { BodySystem } from '../scene/BodySystem.ts';
import PubSub from 'pubsub-js';
import { TIME_SCALE_TOPIC } from '../system/event-types.ts';
import { TimeUnit, formatPeriod, timeEquals, unitsToTimePeriod } from "../system/time.ts";
import { DataService } from '../services/dataservice.ts';
import { TimeScaleProvider } from './TimeScaleProvider.ts';
import { ClockDateTimeInput } from './ClockDateTimeInput.ts';

export class TimeControls {
    rewindButton: HTMLInputElement;
    playPauseButton: HTMLInputElement;
    forwardButton: HTMLInputElement;
    nowButton: HTMLInputElement;
    resetTimeScaleButton: HTMLInputElement;
    timeScaleLabel: HTMLDivElement;
    timeScalePeriodLabel: HTMLDivElement;

    bodySystem: BodySystem;
    dataService: DataService;
    scaleProvider: TimeScaleProvider;
    clockDateTimeInput: ClockDateTimeInput;
    timescaleSubscribtion: any;

    constructor(bodySystem: BodySystem, dataService: DataService) {
        this.timeScalePeriodLabel = document.querySelector<HTMLInputElement>("#timeScalePeriod")!;
        this.timeScaleLabel = document.querySelector<HTMLInputElement>("#timeScale")!;
        this.rewindButton = document.querySelector<HTMLInputElement>("#rewindButton")!;
        this.playPauseButton = document.querySelector<HTMLInputElement>("#playPauseButton")!;
        this.forwardButton = document.querySelector<HTMLInputElement>("#forwardButton")!;
        this.nowButton = document.querySelector<HTMLInputElement>("#nowButton")!;
        this.resetTimeScaleButton = document.querySelector<HTMLInputElement>("#resetTimeScaleButton")!;

        this.rewindButton.addEventListener("click", () => this.rewind());
        this.playPauseButton.addEventListener("click", () => this.playPause());
        this.forwardButton.addEventListener("click", () => this.forward());
        this.nowButton.addEventListener("click", () => this.now());
        this.resetTimeScaleButton.addEventListener("click", () => this.resetTimeScale());

        this.subscribeToTimeScale();

        this.bodySystem = bodySystem;
        this.dataService = dataService;
        this.scaleProvider = new TimeScaleProvider(this.bodySystem.getTimeScale());

        this.updateLabels();
        this.clockDateTimeInput = new ClockDateTimeInput("#datetimePicker", bodySystem)
            .onFinishChange((datetime: string | Date) => bodySystem.setSystemTime(datetime));

    }

    rewind() {
        this.bodySystem.setTimeScale(this.scaleProvider.prev());
    }

    isPaused(): boolean {
        return this.bodySystem.isPaused();
    }

    updateLabels() {
        const isPaused = this.isPaused();
        this.playPauseButton.innerHTML = isPaused ? '<div class="blink">&gt;</div>' : "||";
        this.timeScaleLabel.innerHTML = isPaused ? '<div class="blink">Paused</div>' : this.bodySystem.getTimeScale().toLocaleString().concat('X');
    }

    playPause() {
        const isPaused = this.bodySystem.setPaused(!this.bodySystem.isPaused());
        this.updateLabels();
    }

    forward() {
        this.bodySystem.setTimeScale(this.scaleProvider.next());
    }
    now() {
        const now = new Date();
        const systemTime = new Date(this.bodySystem.clock.getTime());

        if (timeEquals(now, systemTime, TimeUnit.Seconds)) return;

        // Given the bodies are moving, when user clicks now we slow down the time scale for a
        // subtile smoother transition.
        const scale = this.bodySystem.getTimeScale();
        this.bodySystem.setTimeScale(1);
        this.bodySystem.setSystemTime(now);
        this.bodySystem.setTimeScale(scale);
    }

    resetTimeScale() {
        this.scaleProvider.setCurrentScale(1);
        this.bodySystem.setTimeScale(this.scaleProvider.current());
    }

    subscribeToTimeScale() {
        this.timescaleSubscribtion = PubSub.subscribe(TIME_SCALE_TOPIC, (msg, scale) => {
            const timePeriod = unitsToTimePeriod(scale, TimeUnit.Seconds);
            this.timeScalePeriodLabel.textContent = formatPeriod(timePeriod);
            this.timeScaleLabel.innerHTML = this.isPaused() ? '<div class="blink">Paused</div>' : scale.toLocaleString().concat('X');
        });
    }

    unsubscribeToTimeScale() {
        PubSub.unsubscribe(this.timescaleSubscribtion);
    }
}
