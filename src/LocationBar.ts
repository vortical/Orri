import { SomethingThatGetsOrElse } from "./system/url";
import { BodySystemOptionsState } from './scene/BodySystem.ts'

export default class LocationBar {

    static getState(): BodySystemOptionsState {
        return LocationBar.mapURLSearchParamsToBodySystemOptions(new URLSearchParams(window.location.search))
    }

    static pushState(state: BodySystemOptionsState) {
        // in progress... not used yet
        if (window.location.search.substring(1) === state) return;

        // const entries = Object.entries(state).map(e => [e[0], String(e[1])]);
        // const params = new URLSearchParams(Object.entries(entries));

        // const entries = Object.entries(state).map(e => [e[0], String(e[1])]);
        const params = new URLSearchParams(state);


        const stateString = params.toString();
        const url = "/?"+stateString;
        window.history.pushState(state, "", url);
    }  

    static mapURLSearchParamsToBodySystemOptions(params: URLSearchParams): BodySystemOptionsState {
        const getter = new SomethingThatGetsOrElse(params);

        const options: BodySystemOptionsState  = {};
        options.target = getter.getString("target");
        options.sizeScale = getter.getFloat("sizeScale");
        options.timeScale = getter.getFloat("timeScale");
        options.fov = getter.getFloat("fov");
        options.ambientLightLevel = getter.getFloat("ambientLightLevel");
        options.showAxes = getter.getBoolean("showAxes");

        return options;    
    }    
};