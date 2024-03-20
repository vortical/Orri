import { assert, expect, test } from 'vitest';

import { VectorComponents } from "../src/domain/models";

import { Vector } from "../src/system/vecs";

import { compositeReviver, namedPropertyReviver } from "../src/domain/reviver";
import { LatLon } from '../src/system/geometry';
// import { CameraMode, CameraModes } from '../src/scene/CameraTargetingState';
import { BodySystemOptionsState } from '../src/scene/BodySystem';

const partial = (f: (...arg: any) => any, ...a: any) => (...others: any) => f.apply(null, [...a, ...others]);



test('reviver ', () => {
    const x = {
        a: "letter",
        b: new Vector(1,2,3),
        c: 1
    };

    const xs1 = JSON.parse(JSON.stringify(x), compositeReviver([
        namedPropertyReviver("a", (v) => v.toUpperCase()), 
        namedPropertyReviver("b", (v) => Vector.fromVectorComponents(v) )]));

    assert(xs1.a === "LETTER" && xs1.b instanceof Vector);


});





interface CameraModeElement {
    name: string,
    stateBuilder: () => string
};

const CameraModes = {
    LookAtTarget: {name: "Look At Target", stateBuilder: () => "test1" },
    FollowTarget: {name: "Follow Target", stateBuilder: () => "test2" },
    ViewTargetFromSurface: {name: "View From lat,lon", stateBuilder: () => "test2" }
} as const;

type CameraMode = typeof CameraModes[keyof typeof CameraModes];


type BodySystemOptionsState = {
    target?: string;
    targettingCameraMode?: CameraMode;
};


test('reviver2 ', () => {


    const cameraMode: CameraMode = CameraModes.ViewTargetFromSurface;
    
    const options: BodySystemOptionsState = {};
    options.targettingCameraMode = cameraMode;

    const reviver = namedPropertyReviver("targettingCameraMode", (v: {name: string}): CameraMode => modeForName(v.name));
    const compReviver = compositeReviver([namedPropertyReviver]);

    const optionsJson = JSON.stringify(options);
    const parseOptions: BodySystemOptionsState = JSON.parse(optionsJson, reviver);

    const a = CameraModes.ViewTargetFromSurface; 
    const b = parseOptions.targettingCameraMode;

    const mode = getMode("targettingCameraMode");

    assert(a == b);

});




function getMode(modeName: string) {

    

    

    const propertynames = Object.getOwnPropertyNames(CameraModes);
    const name = propertynames[0];

    
    const n = name as keyof typeof CameraModes;
    
    const mode = CameraModes[n]

    return mode;

}

function getMode2(modeName: string) {

    

    

    const propertynames = Object.getOwnPropertyNames(CameraModes);
    const name = propertynames[0];

    
    const n = name as keyof typeof CameraModes;
    
    const mode = CameraModes[n]

    return mode;

}


const modeForName = (name:string) => CameraModes[Object.getOwnPropertyNames(CameraModes).filter((x) => CameraModes[x].name == name)[0] as keyof typeof CameraModes];