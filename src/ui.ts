import './style.css'

import { BodySystem } from './scene/BodySystem.ts'
import  GUI  from 'lil-gui';
import PubSub from 'pubsub-js';
import { SYSTEM_TIME_TOPIC } from './system/event-types.ts';
import LocationBar from './LocationBar.ts';


export default function UI(parentElement:HTMLElement, dateinput: HTMLInputElement, bodySystem: BodySystem){
    buildLilGui(bodySystem);
    new DateTimeInputComponent(dateinput, bodySystem);

}

function buildLilGui(bodySystem: BodySystem){
    const gui = new GUI().title("planets");
    const bodyNames = bodySystem.bodies.map((b)=>b.name);

    let savedSettings = {};

    const options  = {
        target: bodySystem.target?.name || "",
        timeScale: bodySystem.getTimeScale(),
        sizeScale: 1.0,
        fov: bodySystem.getFov(),
        backgroudLightLevel: bodySystem.getAmbiantLightLevel(),
        showAxes: bodySystem.hasAxesHelper(),
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
        }        

    };

    const targetController = gui.add(options, 'target', bodyNames).listen();
    const scaleController = gui.add(options, "sizeScale", 1.0, 400.0, 0.1).name( 'Scale celestial objects sizes');
    const fovController = gui.add(options, "fov", 10, 70, 0.5).name( 'Field Of Vue (degrees)')
    const backgroundLightLevelController = gui.add(options, "backgroudLightLevel", 0, 0.5, 0.01)
    const timeController = gui.add(options, "timeScale", 0.1, 3600 * 24 * 30, 1).name( 'Time multiplier'); // 3600 * 24 * 30 is 30 days per second.
    const showAxesController = gui.add(options, "showAxes");
    const showStatsController = gui.add(options, "showStats");

    gui.add(options, "saveUISettings")
    const loadButton = gui.add(options, "loadUISettings");
    gui.add(options, "pushStateToLocationBar");
    loadButton.disable();

    showStatsController.onChange((v: boolean) => {
        bodySystem.showStats(v);
    });

    showAxesController.onChange((v: boolean) => {
        bodySystem.setAxesHelper(v);
    });

    targetController.onFinishChange((targetName: string)=> {
        bodySystem.setTarget(targetName);
    });
    
    scaleController.onChange((v:number) => {
        bodySystem.setScale(v);
    });
    
    timeController.onChange((v: number) => {
        bodySystem.setTimeScale(v);
    });

    fovController.onChange((v: number) => {
        bodySystem.setFOV(v);
    });

    backgroundLightLevelController.onChange((v: number) => {
        bodySystem.setAmbiantLightLevel(v);
    });

    bodySystem.setTarget(targetController.getValue())

    return gui;
}
        


class DateTimeInputComponent {

    
    /**
     * Not a real component yet, just threw in the code dealing with the date input here
     * 
     * 
     * @param bodySystem 
     * @param dateinput 
     */
    constructor(dateinput: HTMLInputElement, bodySystem: BodySystem) {


        const timeSubscriber = function(msg, timeMs){
            dateinput.value = new Date(timeMs).toISOString().slice(0, -5)+'Z';
        };

        
        function subscribeToTime(): string {
            return PubSub.subscribe(SYSTEM_TIME_TOPIC, timeSubscriber);
        }
        
        let timeSubscription = subscribeToTime();

        dateinput.addEventListener("change", (event) => {
            bodySystem.setDatetime(event.target.value);
            console.log("Change Selected date:", event.target.value);
        });
    
        dateinput.addEventListener("focus", (event) => {
            PubSub.unsubscribe(timeSubscription);
            console.log("Focus Selected date:", event.target.value);
        });
    
        dateinput.addEventListener("blur", (event) => {
            timeSubscription = subscribeToTime();
            console.log("Blur Selected date:", event.target.value);
        });
    
        dateinput.addEventListener("keydown", function(event) {
            // Check if the Enter key is pressed and lose focus
            if (event.keyCode === 13) {
                datetimePickerElement.blur();
            }
      });
    

    }
}
