import { PropertyReviver, ValueReviver, compositeReviver, namedPropertyReviver } from '../domain/reviver.ts';
import { BodySystemOptionsState } from '../scene/BodySystem.ts'
import { CameraModes } from '../scene/CameraTargetingState.ts'

import LZString from 'lz-string';
import { Vector } from '../system/Vector.ts';
import { LatLon } from "../system/LatLon.ts";
import { VectorComponents } from '../domain/models.ts';

type ParamName = "zstate" | "state";

/**
 * Manage history based on state being pushed. Users can also copy the location/share it.
 * 
 * State can be represented as either compressed or uncompressed json via either zipstate or state param.
 * @see pushState(state: BodySystemOptionsState, toCompress = false)
 * 
 * 
 */
export default class LocationBar {

    static getState(): BodySystemOptionsState {
        return LocationBar.mapURLSearchParamsToState(new URLSearchParams(decodeURI(window.location.search)))
    }

    static pushState(state: BodySystemOptionsState, toCompress = false) {

        const jsonString = JSON.stringify(state);

        // Interestingly, the compressToEncodedURIComponent is longer. So compression is an option.
        const stateString = toCompress ? LZString.compressToEncodedURIComponent(jsonString) : encodeURI(jsonString);

        const stateParam: ParamName = toCompress ? "zstate" : "state";
        if (new URLSearchParams(window.location.search).get(stateParam) !== stateString) {
            window.history.pushState(stateString, "", "?".concat(stateParam, "=", stateString));
        }
    }

    /**
     * Revivers for properties that have special revival/marshaling requirements
     */
    static reviver(): PropertyReviver {
        return compositeReviver([
            namedPropertyReviver("location", (v: { lat: number, lon: number }) => new LatLon(v.lat, v.lon)),
            namedPropertyReviver("targettingCameraMode", (v: { name: string }) => modeForName(v.name))
        ]);
    }

    static mapURLSearchParamsToState(params: URLSearchParams): BodySystemOptionsState {
        const state = params.get('zstate') ?
            LZString.decompressFromEncodedURIComponent(params.get('zstate')!) :
            params.get("state") || "{}";

        return JSON.parse(state, LocationBar.reviver());
    }

    static reload() {
        location.reload();
    }
};

const modeForName = (name: string) =>
    CameraModes[
    Object.getOwnPropertyNames(CameraModes)
        .filter((x) => CameraModes[x as keyof typeof CameraModes].name == name)[0] as keyof typeof CameraModes
    ];

