import './style.css'

import { BodySystem, BodySystemOptionsState } from './scene/BodySystem.ts'
import { DataService } from './data/bodySystems.ts';
import { NBodySystemUpdater } from './body/NBodySystemUpdater.ts';
import { Body} from './body/Body.ts';

import UI from './ui.ts';

import LocationBar from './LocationBar.ts';


console.log("starting....");


const mainElement = document.querySelector<HTMLDivElement>('#scene-container')!;
const datetimePickerElement = document.querySelector<HTMLInputElement>("#system-time")!;




function getCurrentState(): object {

    // var center = coordinateTransformation.getCenter();
    // var eye = view.getEye();
    // var target = view.getTarget();
    // var verticalExaggeration = view.getVerticalExaggeration();

    // var switchedOnGeologies = getSwitchedOnGeologies();
    // return {
    //   lat: Number( (center.lat * 180/Math.PI).toFixed(9)),
    //   lon: Number( (center.lon * 180/Math.PI).toFixed(9)),
    //   eye: eye.map(function(x){return Number( x.toFixed(0));}),
    //   target: target.map(function(x){return Number(x.toFixed(0));}),


    return {

    };
}


const options = LocationBar.getState();
const bodySystemUpdater = new NBodySystemUpdater();
const bodies: Body[] = await DataService.loadSolarSystem();
const bodySystem = new BodySystem(mainElement, bodies, bodySystemUpdater, options);


UI(mainElement, datetimePickerElement, bodySystem);

bodySystem.start();

    
    
    