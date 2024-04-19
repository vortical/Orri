import { assert, expect, test } from 'vitest';
import { compositeReviver, namedPropertyReviver } from "../src/domain/reviver.ts";
import { Vector } from "../src/system/Vector.ts";


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
