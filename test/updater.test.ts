import { assert, expect, test } from 'vitest';
import { DataService } from '../src/services/dataservice.ts';
import config from '../src/configuration.ts';
import { Body } from '../src/body/Body.ts';
import { PositionedMass, VectorComponents } from '../src/domain/models.ts';
import { INFINITY } from 'three/examples/jsm/nodes/Nodes.js';
import { e } from 'vitest/dist/reporters-rzC174PQ.js';
import { centerOfMass } from '../src/system/geometry.ts';
import { ConvexHull } from 'three/examples/jsm/Addons.js';


// abstract class List<A> {
//     static of<A>(...args: A[]): List<A> {
//         const head = args[0];        
//         if(head == undefined){
//             return Nil;
//         }

//         return new Cons(head, List.of(...args.slice(1)));
//     }

//     abstract asString(): string;

// }



// class Cons<A> implements List<A> {
//     head: A;
//     tail: List<A>;
    
//     constructor(head: A, tail: List<A>){
//         this.head = head;
//         this.tail = tail;
//     }
    
//     asString(): string {
        
//         return `${this.head}`.concat(this.tail? ", " + this.tail.asString(): "");
//     }
    
// }

// const Nil: List<null> = undefined;



class Box {

    min: VectorComponents;
    max: VectorComponents;

    median: VectorComponents;

    constructor(min:VectorComponents, max:VectorComponents){
        this.min = min;
        this.max = max;
        this.median = {
            x:(this.min.x + this.max.x)/2.0,
            y: (this.min.y + this.max.y)/2.0,
            z: (this.min.z + this.max.z)/2.0
        };

    }

    contains(position: VectorComponents){
        const min = this.min;
        // max boundary is excluded
        const max = this.max;
        
        return min.x <= position.x  && position.x < max.x &&
                min.y <= position.y  && position.y < max.y &&
                min.z <= position.z  && position.z < max.z;  

    }


}


const DIM = 15.0e12; // meters



interface Octree {
    parent?: Octree;
    box: Box;
    centerOfMass(): PositionedMass;
    depth(): number;
}

 

// abstract class Octree {
//     parent?: Octree;
//     box: Box;
//     abstract centerOfMass(): PositionedMass;

//     static of(bodies: Set<PositionedMass>=new Set(), box: Box=new Box({x: -DIM, y: -DIM, z: -DIM},{x: DIM, y: DIM, z: DIM})): Octree {
        
//         if(bodies.size <= 1){
//             return new OctreeLeaf(bodies, box);
//         }
    
//         return new CompositeOctree(divide(bodies, box), box )
    
//     }    

//     abstract depth(): number;

// }

class OctreeLeaf implements Octree {
    parent?: Octree;
    bodies: PositionedMass[];
    box: Box;
    _com?: PositionedMass;

    constructor(bodies: PositionedMass[] = [], box: Box=new Box({x: -DIM, y: -DIM, z: -DIM},{x: DIM, y: DIM, z: DIM} )){
        
        this.bodies = bodies
        this.box = box;        
    }

    centerOfMass(): PositionedMass{
        if(this._com == undefined){
            if (this.bodies.length == 0){
                this._com = {position: this.box.median, mass:0};
            }else {
                this._com = centerOfMass(this.bodies);
            }
        }
        return this._com;
    }


    depth(): number {
        return 1;
    }
}



class CompositeOctree implements Octree {

    parent?: Octree;
    children: Octree[];
    box: Box;

    _com?: PositionedMass;

    centerOfMass(): PositionedMass {
        if(this._com == undefined){
            this._com = centerOfMass(this.children.map(c => c.centerOfMass()))
        }
        return this._com;
    }

    // todo: children should represent some octant, not just a list... 
    // so maybe a list of Octant Elements to position the elements.
    // Cause:
    // Just a list would almost never work unless you knew the ordering to impose...
    constructor( children: Octree[], box: Box=new Box({x: -DIM, y: -DIM, z: -DIM},{x: DIM, y: DIM, z: DIM} )){
        this.children = children;
        this.box = box;
        children.forEach(c => c.parent = this);
    }

    /**
     * For testing
     * 
     * @param x 
     * @param y 
     * @param z 
     */
    depth(): number {
        return 1 + Math.max(...this.children.map(c => c.depth()));
    }

    getOctant(x:0|1, y:0|1, z:0|1): Octree {
        const index = (x*4) + (y*2) + (z);
        return this.children[index];
    }

    toString(){
        return `${this.box.toString()} -> [ ${this.children.map(c => c.toString())} ]`;       
    }
}

function of(bodies: PositionedMass[]=[], box: Box=new Box({x: -DIM, y: -DIM, z: -DIM},{x: DIM, y: DIM, z: DIM})): Octree {
        
    if(bodies.length <= 1){
        return new OctreeLeaf(bodies, box);
    }

    return new CompositeOctree(divide(bodies, box), box )

}   

   
function divide(bodies:PositionedMass[], box: Box): Octree[] {
    // to do : rewrite this.

    const children = new Array<Octree>();
    const boxes = new Array<Box>();
    const boxGroupBodies = new Array<PositionedMass[]>(8);
    const median = box.median;
    
    function getGroup(body: PositionedMass){

        const index = (body.position.x < median.x ? 0 : 4) + (body.position.y < median.y ? 0: 2) + (body.position.z < median.z ? 0: 1);
        let group = boxGroupBodies[index];
        if (group == undefined) {
            group = [];
            boxGroupBodies[index] = group;
        }        
        return group;
    }

    for(let x=0; x<2; x++){
        for(let y=0; y<2; y++){
            for(let z=0; z<2; z++){

                const min = {
                    x: x == 0 ? box.min.x: median.x, 
                    y: y == 0 ? box.min.y: median.y, 
                    z: z == 0 ? box.min.z: median.z 
                };
                
                const max = {
                    x: x == 0 ? median.x: box.max.x, 
                    y: y == 0 ? median.y: box.max.y, 
                    z: z == 0 ? median.z: box.max.z
                }
                boxes.push(new Box(min, max));
    
            }
        }
    }

    bodies.forEach( v => getGroup(v).push(v));        
    const octrees = boxes.map( (box, i) => of(boxGroupBodies[i], box));
    return octrees;
}
    

function validateContainment(octree: CompositeOctree): boolean {
    return octree.children.filter(c => !c.box.contains(c.centerOfMass().position)).length == 0;
}


test('octree leaf ',  () => {

    
    const bodies =  [

        {mass: 1, position: {x: 1, y:1, z:1 }},    

    ];
    
    const box = new Box({x:-2, y: -2, z: -2}, {x:2, y: 2, z: 2})
    const octree = of(bodies, box) 
    expect(octree.depth()).toBe(1);
    expect(octree).toBeInstanceOf(OctreeLeaf);

    
})


test('octree depth 2 a ',  () => {
    
    const bodies =  [
        {mass: 1, position: {x: 1, y:1, z:1 }},    
        {mass: 1, position: {x: 1, y:1, z:-1 }}    
    ];
    
    const box = new Box({x:-2, y: -2, z: -2}, {x:2, y: 2, z: 2})
    const octree = of(bodies, box) 
    expect(octree.depth()).toBe(2);
    expect(octree).toBeInstanceOf(CompositeOctree);
    expect(validateContainment(octree as CompositeOctree)).toBeTruthy();    
});



test('octree depth 2 b ',  () => {
    
    const bodies =  [
        {mass: 1, position: {x: -1, y:1, z:1 }},    
        {mass: 1, position: {x: 1, y:1, z:-1 }}    
    ];
    
    const box = new Box({x:-2, y: -2, z: -2}, {x:2, y: 2, z: 2})
    const octree = of(bodies, box) 
    
    expect(octree).toBeInstanceOf(CompositeOctree);
    expect(octree.depth()).toBe(2);
    expect(validateContainment(octree as CompositeOctree)).toBeTruthy();
});


test('octree depth 2 c ',  () => {
    
    const bodies =  [
        {mass: 1, position: {x: -1, y:-1, z:1 }},    
        {mass: 1, position: {x: 1, y:1, z:-1 }}    
    ];
    
    const box = new Box({x:-2, y: -2, z: -2}, {x:2, y: 2, z: 2})
    const octree = of(bodies, box) 
    
    expect(octree).toBeInstanceOf(CompositeOctree);
    expect(octree.depth()).toBe(2);    
    expect(validateContainment(octree as CompositeOctree)).toBeTruthy();
});


test('octree depth 2 d ',  () => {
    
    const bodies =  [
        {mass: 1, position: {x: -1, y:-1, z:-1 }},    
        {mass: 1, position: {x: 1, y:1, z:-1 }}    
    ];
    
    const box = new Box({x:-2, y: -2, z: -2}, {x:2, y: 2, z: 2})
    const octree = of(bodies, box) 

    expect(octree).toBeInstanceOf(CompositeOctree);
    expect(octree.depth()).toBe(2);    
    expect(validateContainment(octree as CompositeOctree)).toBeTruthy();    

});



test('octree depth 2 e ',  () => {
    
    const bodies =  [
        {mass: 1, position: {x: -1, y:-1, z:-1 }},    
        {mass: 1, position: {x: -1, y:1, z:-1 }}    
    ];

    const box = new Box({x:-2, y: -2, z: -2}, {x:2, y: 2, z: 2})
    const octree = of(bodies, box) 

    expect(octree).toBeInstanceOf(CompositeOctree);
    expect(octree.depth()).toBe(2);        
    expect(validateContainment(octree as CompositeOctree)).toBeTruthy();
    
});


test('octree depth 2 f ',  () => {
    
    const bodies =  [
        {mass: 1, position: {x: -1, y:-1, z:-1 }},    
        {mass: 1, position: {x: -1, y: -1, z:1 }}    
    ];
    
    const box = new Box({x:-2, y: -2, z: -2}, {x:2, y: 2, z: 2})
    const octree = of(bodies, box) 

    expect(octree).toBeInstanceOf(CompositeOctree);
    expect(octree.depth()).toBe(2);
    expect(validateContainment(octree as CompositeOctree)).toBeTruthy();
    
});


test('octree depth 2 with 3 bodies ',  () => {
    
    const bodies =  [
        {mass: 1, position: {x: 1, y:-1, z:-1 }},    
        {mass: 1, position: {x: -1, y:-1, z:-1 }},    
        {mass: 1, position: {x: -1, y: -1, z:1 }}    
    ];
    
    const box = new Box({x:-2, y: -2, z: -2}, {x:2, y: 2, z: 2})
    const octree = of(bodies, box) 

    expect(octree).toBeInstanceOf(CompositeOctree);
    expect(octree.depth()).toBe(2);
    expect(validateContainment(octree as CompositeOctree)).toBeTruthy();
});



test('octree depth 3 with 2 bodies ',  () => {
    
    const bodies =  [
        {mass: 1, position: {x: 0.5, y:0.5, z:0.5 }},    
        {mass: 1, position: {x: 1.5, y:1.5, z:1.5 }},    


    ];
    
    const box = new Box({x:-2, y: -2, z: -2}, {x:2, y: 2, z: 2})
    const octree = of(bodies, box) 

    expect(octree).toBeInstanceOf(CompositeOctree);
    expect(octree.depth()).toBe(3);
    expect(validateContainment(octree as CompositeOctree)).toBeTruthy();
});


test('octree depth 3 with 3 bodies ',  () => {
    
    const bodies =  [
        {mass: 1, position: {x: 0.5, y:0.5, z:0.5 }},    
        {mass: 1, position: {x: 1.5, y:1.5, z:1.5 }},    

        {mass: 1, position: {x: 1, y:1, z:-1 }}    

    ];
    
    const box = new Box({x:-2, y: -2, z: -2}, {x:2, y: 2, z: 2})
    const octree = of(bodies, box) 

    expect(octree).toBeInstanceOf(CompositeOctree);
    expect(octree.depth()).toBe(3);
    expect(validateContainment(octree as CompositeOctree)).toBeTruthy();
});


test('deep octree with 3 bodies ',  () => {
    
    const bodies =  [
        {mass: 1, position: {x: 0.5, y:0.5, z:0.5 }},    
        {mass: 1, position: {x: 0.50001, y:0.5, z:0.5 }},    
        {mass: 1, position: {x: 1, y:1, z:-1 }}    

    ];
    
    const box = new Box({x:-2, y: -2, z: -2}, {x:2, y: 2, z: 2})
    const octree = of(bodies, box) 

    expect(octree).toBeInstanceOf(CompositeOctree);
    const d = octree.depth();

    // expect(octree.depth()).toBe(3);
    expect(validateContainment(octree as CompositeOctree)).toBeTruthy();
});

