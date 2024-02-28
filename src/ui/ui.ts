import { BodySystem } from '../scene/BodySystem.ts'
import GUI from 'lil-gui';
import PubSub from 'pubsub-js';
import { SYSTEM_TIME_TOPIC, MOUSE_HOVER_OVER_BODY_TOPIC, MOUSE_CLICK_ON_BODY_TOPIC, BODY_SELECT_TOPIC } from '../system/event-types.ts';
import LocationBar from './LocationBar.ts';
import { PickerEvent } from '../scene/Picker.ts';
import { throttle } from "../system/timing.ts";
import { ClockTimeUpdateHandler } from './ClockTimeUpdateHandler.ts';
import { BodiesAtTimeUpdater } from '../body/BodiesAtTimeUpdater.ts';
import { DataService } from '../services/dataservice.ts';

/**
 * A terse UI...
 */ 
export class SimpleUI {

    constructor(statusElement: HTMLElement, bodySystem: BodySystem, dataService: DataService) {
        buildLilGui(bodySystem, dataService);
        new StatusComponent(statusElement, bodySystem);

        // // Handle the history back button
        window.addEventListener('popstate', function (event) {
            if (event.state) {
                location.href = location.href;
            }
        });
    }
}

function buildLilGui(bodySystem: BodySystem, dataService: DataService) {
    const gui = new GUI().title("Settings");
    const bodyNames = bodySystem.bodies.map((b) => b.name);

    // stored in the closure... not in class instance.
    let savedSettings = {};

    const options = {
        date: "",
        target: bodySystem.target?.name || "",
        timeScale: bodySystem.getTimeScale(),

        sizeScale: 1.0,
        fov: bodySystem.getFov(),
        backgroudLightLevel: bodySystem.getAmbiantLightLevel(),
        showAxes: bodySystem.hasAxesHelper(),
        // showShadows:  this is whewre I am 
        projectShadows: bodySystem.areShadowsEnabled(),
        showStats: bodySystem.hasStats(),
        saveUISettings() {
            savedSettings = gui.save();

            loadButton.enable();
        },
        loadUISettings() {
            gui.load(savedSettings);
        },
        pushStateToLocationBar() {
            const state = bodySystem.getState();
            LocationBar.pushState(state);
        },
        setTimeToNow() {
            // if timescale is not 1, then it should be enabled
            checkTimeToNowButtonState();
            setSystemTime(new Date());
        },
        resetTimeScale() {
            timeScaleController.setValue(1);
            resetTimeScaleButton.disable();
        }
    };

    function checkTimeToNowButtonState(){
        if (timeScaleController.getValue() != 1){
            timeToNowButton.enable();
        } else {
            timeToNowButton.disable();
        }
    }

    function setSystemTime(datetime: string|Date){
        return new Promise(async (resolve) => {
            try {
                const time = new Date(datetime);
                const kinematics = await dataService.loadKinematics(Array.from(bodySystem.bodyObjects3D.keys()), time);
                bodySystem.addUpdater(new BodiesAtTimeUpdater(kinematics, time));

            } catch (e) {
                console.log(e)
            }
        });
    }

    const dateController = new ClockTimeUpdateHandler(gui.add(options, "date").name('DateTime (editable)'))
    .onFinishChange( (datetime: string|Date) => {
        timeToNowButton.enable();
        return setSystemTime(datetime);
    });
    
    const timeToNowButton = gui.add(options, "setTimeToNow").name('Set Time To "Now"');        
    
    const timeScaleController = gui.add(options, "timeScale", 0.1, 3600 * 24 * 30, 1).name('Time Scale')
    .onChange((v: number) => {
        bodySystem.setTimeScale(v);
        timeToNowButton.enable();
        if(v != 1){
            resetTimeScaleButton.enable();
        }else{
            resetTimeScaleButton.disable();
        }
    });

    timeScaleController.load

    const resetTimeScaleButton = gui.add(options, "resetTimeScale").name('Reset Time Scale');
    
    const targetController = gui.add(options, 'target', bodyNames).name("Target")
    .onFinishChange((targetName: string) => {
        bodySystem.setTarget(targetName);
    });
    
    gui.add(options, "pushStateToLocationBar").name('Push State to Location Bar and History');

    const scaleController = gui.add(options, "sizeScale", 1.0, 200.0, 0.1).name('Size Scale')
        .onChange((v: number) => {
            bodySystem.setScale(v);
        });
    

    const projectShadowsController = gui.add(options, "projectShadows").name('Cast Shadows')
        .onChange((v: boolean) => {
            bodySystem.setShadowsEnabled(v);
        });


    
    const fovController = gui.add(options, "fov", 10, 70, 0.5).name('Field Of Vue')
        .onChange((v: number) => {
            bodySystem.setFOV(v);
        });
    
    const backgroundLightLevelController = gui.add(options, "backgroudLightLevel", 0, 0.4, 0.01).name('Ambiant Light')
        .onChange((v: number) => {
            bodySystem.setAmbiantLightLevel(v);
        });
    
    const showAxesController = gui.add(options, "showAxes").name('ICRS Axes')
        .onChange((v: boolean) => {
            bodySystem.setAxesHelper(v);
        });
    
    const showStatsController = gui.add(options, "showStats").name('Perf Stats')
        .onChange((v: boolean) => {
            bodySystem.showStats(v);
        });

    gui.add(options, "saveUISettings").name('Save Settings');
    const loadButton = gui.add(options, "loadUISettings").name('Load Settings');
    loadButton.disable();
    checkTimeToNowButtonState();

    PubSub.subscribe(BODY_SELECT_TOPIC, (msg, event) => {
        if (event.body && options.target != event.body.name) {
            targetController.setValue(event.body.getName()).updateDisplay();
        }
    });

    bodySystem.setTarget(targetController.getValue())

    return gui;
}

function formatDistance(distance: number): string {
    return Math.trunc(distance).toLocaleString();
}

/**
 * A poor man implementation of some status. 
 * todo: This type of information should be setup as an overlay over the 3d canvas. Include body speeds etc...
 */
class StatusComponent {

    constructor(element: HTMLElement, bodySystem: BodySystem) {
        /*
        <div>
            <div>
                target distance = ...
            </div>
            <br>
            <div>
                Mouse over xxx at distance = ...
            </div>
        </div>
        */
        
        const statusDivElement = document.createElement('div');
        const targetElement = document.createElement('div');
        const hoverElement = document.createElement('div');
        statusDivElement.appendChild(targetElement)
        statusDivElement.appendChild(document.createElement('br'));
        statusDivElement.appendChild(hoverElement);
        element.appendChild(statusDivElement);

        bodySystem.controls.addEventListener("change", throttle(200, undefined, (e) => {
            const targetText = `Target distance is ${formatDistance(bodySystem.controls.getDistance())} km`;
            targetElement.innerHTML = targetText;
        }));

        PubSub.subscribe(MOUSE_HOVER_OVER_BODY_TOPIC, (msg, pickEvent: PickerEvent) => {
            if (pickEvent.body) {
                if (pickEvent.body != bodySystem.target) {
                    const hover_text = `Mouse over ${pickEvent.body!.name} at distance: ${formatDistance(bodySystem.getDistance(pickEvent.body))} km`;
                    hoverElement.innerHTML = hover_text
                } else {
                    const hover_text = `This is your target ${pickEvent.body!.name}`;
                    hoverElement.innerHTML = hover_text
                }
            } else {
                hoverElement.innerHTML = '...';
            }
        });

        PubSub.subscribe(MOUSE_CLICK_ON_BODY_TOPIC, (msg, pickEvent: PickerEvent) => {
            if (pickEvent.body && pickEvent.body != bodySystem.target) {
                bodySystem.setTarget(pickEvent.body, false);
            }
        });
    }
}