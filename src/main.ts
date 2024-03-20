import './style.css';
// import './notify.css';
import { BodySystem, BodySystemOptionsState } from './scene/BodySystem.ts'
import { NBodySystemUpdater } from './body/NBodySystemUpdater.ts';
import { Body} from './domain/Body.ts';
import { SimpleUI } from './ui/ui.ts';
import LocationBar from './ui/LocationBar.ts';
import { DataService } from './services/dataservice.ts';
import config from './configuration.ts';

const mainElement = document.querySelector<HTMLDivElement>('#scene-container')!;
const statusElement =document.querySelector<HTMLInputElement>("#status-container")!;

async function start(){
    const dataService = new DataService(config.spacefield_host, config.baseUrl);
    const bodySystemUpdater = new NBodySystemUpdater();
    const options = LocationBar.getState();
    const date = options.date ? new Date(options.date): new Date()
    const bodies: Body[] = await dataService.loadSolarSystem(date);    
    const bodySystem = new BodySystem(mainElement, bodies, bodySystemUpdater, options);

    // Set the up of the viewer to be perpendicular to earth's orbit (the
    // ecliptic plane). 
    // TO consider: We could also offer options to change the 
    // camera up to be based off the normal of any planet's orbital plane or
    // equatorial plane that is selected.
    const earth = bodySystem.getBody("earth");
    bodySystem.setCameraUp(earth.get_orbital_plane_normal());
    const ui = new SimpleUI(statusElement, bodySystem, dataService);
    bodySystem.start();
}

try {
    console.log(`Starting with config: \n${JSON.stringify(config)}`);
    start();
}catch(err: any) {
    console.error("Could not start application:"+ err.message)
};