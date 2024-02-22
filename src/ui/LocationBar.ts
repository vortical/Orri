import { BodySystemOptionsState } from '../scene/BodySystem.ts'

/**
 * Manage history based on state being pushed. Users can also copy the location/share it.
 */
export default class LocationBar {

    static getState(): BodySystemOptionsState {
        return LocationBar.mapURLSearchParamsToBodySystemOptions(new URLSearchParams(window.location.search))
    }

    static pushState(state: BodySystemOptionsState) {
        const stateString = JSON.stringify(state);

        if (new URLSearchParams(window.location.search).get('state') !== stateString) {
            window.history.pushState(stateString, "", "/?state="+stateString);
        }
    }  

    static mapURLSearchParamsToBodySystemOptions(params: URLSearchParams): BodySystemOptionsState {
        return JSON.parse(params.get('state')||"{}");
    }    
};