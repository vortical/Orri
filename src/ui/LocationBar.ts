import { PropertyReviver, ValueReviver, compositeReviver, namedPropertyReviver } from '../domain/reviver.ts';
import { BodySystemOptionsState } from '../scene/BodySystem.ts'

import LZString from 'lz-string';
import { Vector } from '../system/vecs.ts';
import { LatLon } from '../system/geometry.ts';
import { VectorComponents } from '../domain/models.ts';


type ParamName = "zstate" | "state";

/**
 * Manage history based on state being pushed. Users can also copy the location/share it.
 * 
 * State is can be represented as compressed json (zipstate param) or uncompressed (state param).
 * 
 */
export default class LocationBar {

    static getState(): BodySystemOptionsState {
        return LocationBar.mapURLSearchParamsToState(new URLSearchParams(window.location.search))
    }

    static pushState(state: BodySystemOptionsState, toCompress=true) {
        
        const jsonString = JSON.stringify(state);
        const stateString = toCompress? LZString.compressToEncodedURIComponent(jsonString): jsonString;   

        // strangely, the compressToEncodedURIComponent seems longer
        console.log("Compressed to: "+stateString.length/jsonString.length);
        
        const stateParam: ParamName = toCompress? "zstate": "state";
        if (new URLSearchParams(window.location.search).get(stateParam) !== stateString) {
            window.history.pushState(stateString, "", "/?".concat(stateParam, "=", stateString));
        }
    }  


    static reviver(): PropertyReviver {
        // just add filtering revivers for properties that have special revival/marshaling requirements)
        return compositeReviver([
            namedPropertyReviver("location", (v: {lat: number, lon: number}) => new LatLon(v.lat, v.lon)), 
            // don't really have this property... just a place holder
            namedPropertyReviver("bogus_property", (v: VectorComponents) => Vector.fromVectorComponents(v))]);
    }


    static mapURLSearchParamsToState(params: URLSearchParams): BodySystemOptionsState {
        const state = params.get('zstate') ? 
            LZString.decompressFromEncodedURIComponent(params.get('zstate')!) :
            params.get("state") || "{}";

        return JSON.parse(state, LocationBar.reviver());
    }    

    static reload(){
        location.reload();
    }
};