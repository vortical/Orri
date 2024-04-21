import './style.css';
import { BodySystem } from './scene/BodySystem.ts'
import { NBodySystemUpdater } from './body/NBodySystemUpdater.ts';
import { Body } from './body/Body.ts';
import { SimpleUI, userNotify } from './ui/ui.ts';
import LocationBar from './ui/LocationBar.ts';
import { DataService } from './services/dataservice.ts';
import config from './configuration.ts';
import { LatLon } from './system/LatLon.ts';

console.log(`Config: \n${JSON.stringify(config)}`);
const mainElement = document.querySelector<HTMLDivElement>('#scene-container')!;

(async () => {
    const dataService = new DataService(config.spacefieldBaseURL, config.baseUrl);
    const bodySystemUpdater = new NBodySystemUpdater();
    const options = LocationBar.getState();
    const date = options.date ? new Date(options.date) : new Date();
    options.location = options.location || await getLocation();
    const bodies: Body[] = await dataService.loadSolarSystem(date);
    const bodySystem = new BodySystem(mainElement, bodies, dataService, bodySystemUpdater, options);
    bodySystem.setCameraUp(bodySystem.getBody("earth").get_orbital_plane_normal());
    const ui = new SimpleUI(bodySystem, dataService);
    bodySystem.start();

})();

async function getLocation(): Promise<LatLon | undefined> {
    try {
        return await LatLon.fromBrowser()
    }catch(e: any){
        userNotify.showWarning("Could not get your location!", e.toString().concat(".<p> You will need to add you coordinates manually in the settings.</p>"))
        return undefined;
    }
}