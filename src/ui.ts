import './style.css'

import { BodySystem } from './scene/BodySystem.ts'
import  GUI  from 'lil-gui';
import PubSub from 'pubsub-js';
import { SYSTEM_TIME_TOPIC, MOUSE_HOVER_OVER_BODY_TOPIC, MOUSE_CLICK_ON_BODY_TOPIC, BODY_SELECT_TOPIC } from './system/event-types.ts';
import LocationBar from './LocationBar.ts';
import { PickerEvent } from './scene/Picker.ts';
import { throttle } from './system/throttler.ts';


export default function UI(parentElement:HTMLElement, dateinput: HTMLInputElement, statusElement: HTMLElement, bodySystem: BodySystem){
    buildLilGui(bodySystem);
    new DateTimeInputComponent(dateinput, bodySystem);

    new StatusComponent(statusElement, bodySystem);

    // // Handle the history back button
    window.addEventListener('popstate', function(event) {
        // poor mans implementatio, but it works...with flashes and bangs.

        // So consider just set the state without a full page reload, 
        if (event.state){
            location.href = location.href;
        }
    });

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


    PubSub.subscribe(BODY_SELECT_TOPIC,  (msg, event) =>  {        
        if (event.body && options.target != event.body.name ){
            options.target = event.body.name;
        }
    });

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
                dateinput.blur();
            }
      });
    

    }
}

class UserInteraction {

    constructor(bodySystem: BodySystem) {        

        PubSub.subscribe(MOUSE_HOVER_OVER_BODY_TOPIC, (msg, pickerEvent: PickerEvent) => {        
            if (pickerEvent.body){
                bodySystem.setTarget(pickerEvent.body, false);
            }
        });
    }
}


function formatDistance(distance: number): string {
    return Math.trunc(distance).toLocaleString();
}

/**
 * A poor man implementation of some status
 */
class StatusComponent {
    
    constructor(element: HTMLElement, bodySystem: BodySystem) {
        /*
        <div>
            target distance = ...
        </div>
        <br>
        <div>
            Mouse over xxx at distance = ...
        </div>
        */
        const targetElement = document.createElement('div');
        element.appendChild(targetElement);
        element.appendChild(document.createElement('br'));
        const hoverElement = document.createElement('div');
        element.appendChild(hoverElement);
    

        bodySystem.controls.addEventListener("change", throttle(200, undefined, (e) => {
            const targetText = `Target distance is ${formatDistance(bodySystem.controls.getDistance())} km`;            
            targetElement.innerHTML = targetText;            
        }));


        PubSub.subscribe(MOUSE_HOVER_OVER_BODY_TOPIC, (msg, pickEvent: PickerEvent)  => {

            if (pickEvent.body){
                if (pickEvent.body != bodySystem.target){
                    const hover_text = `Mouse over ${pickEvent.body!.name} at distance: ${formatDistance(bodySystem.getDistance(pickEvent.body))} km`;
                    hoverElement.innerHTML = hover_text
                }else{
                    const hover_text = `This is your target ${pickEvent.body!.name}`;
                    hoverElement.innerHTML = hover_text
                }

            }else {
                hoverElement.innerHTML = '...';
            }
            
        });


        PubSub.subscribe(MOUSE_CLICK_ON_BODY_TOPIC, (msg, pickEvent: PickerEvent)  => {

            if (pickEvent.body && pickEvent.body != bodySystem.target){
                bodySystem.setTarget(pickEvent.body, false);
            }
            
        });
    }



}
