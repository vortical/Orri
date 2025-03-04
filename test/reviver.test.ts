import { assert, expect, test } from 'vitest';
import { compositeReviver, namedPropertyReviver } from "../src/domain/reviver.ts";
import { Vector } from "../src/system/Vector.ts";
import {PromisePool} from '@supercharge/promise-pool';

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

const wait = (n: number): Promise<void> => new Promise(r => setTimeout(() => r(), n));

test("some-iterator-1", () => {
    type IResult<T> = {value?: T , done: boolean} 
    
    interface Iterator <T>{
        next: () => IResult<T>;
    }


    function makeIterator(start = 0, end= 10, step=1) {        


        return {
            next() {
                    let value = start;
                    start += step;
                    return start > end? {done: true}: {value: value, done: false};                  
            }   
        }
    }

    const i1 = makeIterator(0,18,3);
    let r = i1.next();
    while(!r.done){
        console.log(r.value);
        r = i1.next();
    }



});


test("some-iteratable-1", () => {


    class A {
        index: number = 0;
        data: number[];

        constructor(...data:number[]){
            this.data = data;
        }

        next() {
            if (this.index < this.data.length) {
                return { value: this.data[this.index++], done: false };
            } else {
                return { value: undefined, done: true };
            }
        }

        [Symbol.iterator]() {
            return this;
        }
    };

    
    for(const i of new A(1,2,3,4)){
        console.log(i);
    }



});


test("some-iteratable-2", () => {

    function makeIterator(start = 0, end= 10, step=1) {
        const x =  {
            next(){
                let value = start;
                start += step;
                return start > end? {done: true}: {value: value, done: false};
            },
            [Symbol.iterator]() {
                return x;
            }
        };
        return x;
    }
    
    for(const i of makeIterator(1,5,2)){
        console.log(i);
    }



});

test("some-generator-1", () => {

    
    function* makeIterator(start = 0, end= 10, step=1){        
        for(let i = start; i < end; i+=step){
            yield i;
        }

    }

    const iterator = makeIterator(0,13,3);
    let r = iterator.next();
    while(!r.done){
        console.log(r.value);
        r = iterator.next();
    }
});


test("some-generator-2", () => {

    
    function* makeIterator(start = 0, end= 10, step=1){        
        for(let i = start; i < end; i+=step){
            yield i;
        }

    }

    const iterator = makeIterator(0,23,3);

    for(let i of iterator){
        console.log(i);
        
    }

    console.log(iterator === iterator[Symbol.iterator]() );

});


test("some-generator-3", () => {

    
    function* makeIterator(start = 0, end= 10, step=1){        
        for(let i = start; i < end; i+=step){
            yield i;
        }

    }

    const s = [...makeIterator(0,23,3)];

    console.log(s);

});

test("some-generator-4", () => {

    function* stuff(){
        yield 1;
        yield 2;
        
    }
    
    const results = [...stuff()];
    console.log(results)




});



test('promise-pool', async() => {

    const data: number[] = [];
    const xx:number[] = [];
    
    for(let i = 0; i< 1000; i++){
        data.push(i);
    }

    const {results, errors} =  await PromisePool
        .for(data)
        .withConcurrency(1)
        .process( async n =>  {
            await wait(10);
            return n * 2;
        });




    console.log("done");

    await wait(4000);    

});




test('promises', async () => {




    class Runner {

        run(s: number): Promise<string> {
            return new Promise((resolve) => {
                setTimeout(() => {             
                    console.log(`task: ${s}`);       
                    resolve(`Result of task: ${s}`);
                }, 100);
            });
        }
    }

      
    class Pool {
        // pool: PoolElement[] = [];



        executing: Set<Promise<any>>  = new Set();

        pendingQueue: (() => Runner)[]
        size: number;

        constructor(size: number){
            this.size = size;
        }

        execute(f: () => Promise<any>){
            

            
            // const x = Promise.resolve().then(f);
            // this.executing.add(x);
            // x.then(() => this.executing.delete(x));

            if(this.executing.size < this.size){
                console.log("run...")
                const x = Promise.resolve().then(f);
                this.executing.add(x);
                return x.then((v) => {
                    this.executing.delete(x);
                    return v;
                }); // its done
    
            }else{
                console.log("enqueue...")
                // executorAvailable is a promise that resolved when next one is freed up.
                const executorAvailable = Promise.race(this.executing);
                return executorAvailable.then(() => this.execute(f));
            }

            //.then( (executing) => this.clean(executing));

            // return x;
        

        }

    }
      
    
    const t = Date.now();
    const pool = new Pool(2);

    pool.execute(()=> new Runner().run(1))
        // .then(x => console.log((Date.now() - t )+": done: " + x));
        pool.execute(()=> new Runner().run(2))
    const x = await pool.execute(()=> new Runner().run(3))

    console.log((Date.now() - t )+": done: " + x)
    // await wait(4000);        

})




test('promises-2', async () => {

    class Runner {

        run(s: number): Promise<string> {
            return new Promise((resolve) => {
                setTimeout(() => {             
                    console.log(`task: ${s}`);       
                    resolve(`Result of task: ${s}`);
                }, 10);
            });
        }
    }

      
    class Pool {
        executing: Set<Promise<any>>  = new Set();
        size: number;


        constructor(size: number){
            this.size = size;
        }

        execute(f: () => Promise<any>){
            console.log("")
            if(this.executing.size >= this.size){
                // executorAvailable is a promise that resolved when next one is freed up.
                // this can be problematique cause many will end up waiting for the race.
                // if I have 10 queued up, then they all are all resolved and all except one get blocked again...
                const executorAvailable = Promise.race(this.executing); 
                return executorAvailable.then(() => this.execute(f));
            }
            
            // console.log("run...")
            const x = Promise.resolve().then(f);
            this.executing.add(x);
            return x.then((v) => {
                this.executing.delete(x);
                return v;
            });
        }
    }
      
    
    const t = Date.now();
    const pool = new Pool(10);

    for(let i = 0; i < 100; i++){
        pool.execute(()=> new Runner().run(i)).then(x => console.log("Done:" + (Date.now() - t ) + ": " + x));
    }
    await wait(3000);        

})




test('promises-3', async () => {

    class Runner {

        run(s: number): Promise<string> {
            return new Promise((resolve) => {
                setTimeout(() => {             
                    console.log(`task: ${s}`);       
                    resolve(`Result of task: ${s}`);
                }, 100);
            });
        }
    }


    class Reaper {
        // executing: Set<Promise<any>>;
        

        pending: (() => Promise<any>)[] = [];
        pool: Pool;

        constructor(pool: Pool ) {
            // this.executing = pool.executing;
            this.pool = pool;
        }

        equeue(p: () => Promise<any>){
            this.pending.push(p);
            return this.process(p)

        }

        process(p: () => Promise<any>){


            const executorAvailable = Promise.race(this.pool.executing); 

            return executorAvailable
                .then(() => this.pending.shift())
                .then(f => f && this.pool.execute(f));

            // Promise.race(this.executing);

        }
        
   
    }
      
    class Pool {
        executing: Set<Promise<any>>  = new Set();
        size: number;

        pending: [];

        constructor(size: number){
            this.size = size;
        }




        execute(f: () => Promise<any>){
            console.log("")
            if(this.executing.size >= this.size){
                // executorAvailable is a promise that resolved when next one is freed up.
                // this can be problematique cause many will end up waiting for the race.
                // if I have 10 queued up, then they all are all resolved and all except one get blocked again...

                // so what I need is a single queue of jobs that get processed as the executing is dequeued

                const executorAvailable = Promise.race(this.executing); 
                return executorAvailable.then(() => this.execute(f));
            }
            
            console.log("run...")
            const x = Promise.resolve().then(f);
            this.executing.add(x);
            return x.then((v) => {
                this.executing.delete(x);
                return v;
            });
        }
    }
      
    
    const t = Date.now();
    const pool = new Pool(10);

    for(let i = 0; i < 1000; i++){
        pool.execute(()=> new Runner().run(i)).then(x => console.log("Done:" + (Date.now() - t ) + ": " + x));
    }
    await wait(12000);        

})




test('async iterator', async () => {

    // async functions return promises

    async function* asyncIterator(){
        yield 1;
        yield 2;
        yield 3;
    }

    const iterator = asyncIterator();

    // to use async iterators, you use for await
    for await (const i of iterator){
        console.log(i);
    }

})


test('async iterator 1', async () => {

    // async functions return promises

    async function* asyncIterator(){
        yield 11;
        yield 22;
        yield 33;
    }

    const iterator = asyncIterator();

    const a = iterator.next()
        .then(r => {
            console.log(r);
            return iterator.next();
        })
        .then(r => {
            console.log(r);
            return iterator.next();
        })
        .then(r => {
            console.log(r);
            return iterator.next();
        })
        .then(r => {
            console.log(r);
            return iterator.next();
        }); 


    console.log("------------")    
    const iterator2 = asyncIterator();

    console.log(await iterator2.next());
    console.log(await iterator2.next());
    console.log(await iterator2.next());
    console.log(await iterator2.next());

});

test('async iterator 2', async () => {

    // async functions return promises

    async function* asyncIterator(){
        yield 11;
        yield 22;
        yield 33;
        yield 44;
        yield 55;
    }

    for await(const i of asyncIterator() ){
        console.log(i);
    }
})


test('async iterator 3', async () => {

    // async functions return promises

    const x = [0,1,2,3,4,5];
    async function* asyncIterator(){
        yield* x;
    }


    const iterator = asyncIterator();

    const a = iterator.next()
        .then(r => {
            console.log(r);
            return iterator.next();
        })
        .then(r => {
            console.log(r);
            return iterator.next();
        })

    for await(const i of asyncIterator() ){
        console.log(i);
    }
})



test('async iterator 4', async () => {

    // async functions return promises


    async function*  asyncIterator<T>(c: T[] ){
        yield* c;
    }

    const iterator = asyncIterator([0,1]);

    const a = iterator.next()
        .then(r => {
            console.log(r);
            return iterator.next();
        })
        .then(r => {
            console.log(r);
            return iterator.next();
        })
        
    for await(const i of asyncIterator([4,5,6]) ){
        console.log(i);
    }
})


test('async iterator 5', async () => {

    // async functions return promises


    async function*  asyncIterator<T>(c: T[] ){
        yield* c;
    }

    const iterator = asyncIterator([0,1]);

    const p1 = iterator.next();
    const p2 = iterator.next();
    const p3 = iterator.next();

    const results = Promise.all([p1,p2,p3]).then(results => {
        console.log("res:"+results);
        return results;

        }
    )

})


test('Do it AGAIN', async () => {

  
    // this is es2024
    // let { promise, resolve, reject } = Promise.withResolvers();

    function getPromise(){
        
        const f = () => {
            let resolve, reject;

            const promise = new Promise((res, rej) => {
                resolve = res;
                reject = rej;
            });
            
            return { promise, resolve, reject }
        }
        return f();
    
    }


    function getPromise2(){
        

            let resolve, reject;

            const promise = new Promise((res, rej) => {
                resolve = res;
                reject = rej;
            });
            
            return { promise, resolve, reject }
    
    }


    const {promise, resolve, reject} = getPromise();


    // console.log(promise);

    promise.then(r => console.log("got :"+r));

    await wait(500);
    
    resolve(10);
    
    await wait(500);

    const x  = getPromise2();
    const y  = getPromise2();

    x.promise.then(r => console.log("got xx :"+r));
    y.promise.then(r => console.log("got yy :"+r));

    await wait(500);
    
    y.resolve(22);
    x.resolve(11);

    
    await wait(500);

 
    
})



test('Another try 1', async () => {


    class Runner {

        constructor(public id: number){}

        run(s: number): Promise<string> {
            return new Promise((resolve) => {
                setTimeout(() => {             
                    console.log(`Runner[${this.id}]: task: ${s}`);       
                    resolve(`Result of task: ${s}`);
                }, 150*Math.floor(Math.random() * 6))
            });
        }
    }

    


    class QueuedPromise { // extends Promise or should we just make this a type/struct
        resolve: (value: any) => void;
        reject: (reason?: any) => void;
        promise: Promise<any>;

        constructor(f: () => Promise<any>){
            this.promise = new Promise((res, rej) => {
                this.resolve = res;
                this.reject = rej;
            });
        }

    }
    


    class Pool {

        size: number;
        pool:Runner[] = []
        executing: Set<Promise<any>>  = new Set();
        queued: QueuedPromise[] = [];


        constructor(size: number){
            this.size = size;
            this.pool = Array.from({length: size}).map( (_, i) => new Runner(i));
        }

        notify(){

            const queuedPromise = this.queued.shift();

            if(queuedPromise == undefined){
                return;
            }
            console.log("Dequeuing");
            queuedPromise.resolve(null);

        }




        execute(f: () => Promise<any>){
            // console.log("")

            const runner = this.pool.pop();


            if(runner == undefined){
                const queuedPromise = new QueuedPromise(f);
                this.queued.push(queuedPromise);

                return queuedPromise.promise.then(() => this.execute(f)); 
                // return executorAvailable.then(() => this.execute(f));
            }
            
            // console.log("run...")
            const x = Promise.resolve().then(f);
            // this.executing.add(x); // maybe we can cancel executing.
            return x.then((v) => {
                this.pool.push(runner);
                this.notify();


                // this.executing.delete(x);

                return v;
            });
        }
    }
    

    const t = Date.now();
    const pool = new Pool(10);

    for(let i = 0; i < 100; i++){
        pool.execute(()=> new Runner(i).run(i))
            .then(x => console.log("Done:" + (Date.now() - t ) + ": " + x));
    }
    await wait(7000);        
});


test('Another try 2', async () => {


    class Runner {

        constructor(public id: number){}

        run(s: number): Promise<string> {
            return new Promise((resolve) => {
                setTimeout(() => {             
                    console.log(`Runner[${this.id}]: task: ${s}`);       
                    resolve(`Result of task: ${s}`);
                }, 150*Math.floor(Math.random() * 6))
            });
        }
    }

    


    class QueuedPromise { // extends Promise or should we just make this a type/struct
        resolve: (value: any) => void;
        reject: (reason?: any) => void;
        promise: Promise<any>;

        constructor(){
            this.promise = new Promise((res, rej) => {
                this.resolve = res;
                this.reject = rej;
            });
        }

    }
    


    class Pool {

        size: number;
        pool:Runner[] = []
        executing: Set<Promise<any>>  = new Set();
        queued: QueuedPromise[] = [];


        constructor(size: number){
            this.size = size;
            this.pool = Array.from({length: size}, (_, i) => new Runner(i));
        }

        notify(){

            const queuedPromise = this.queued.shift();

            if(queuedPromise == undefined){
                console.log("Nothing queued");
                return;
            }
            console.log("Dequeuing");
            queuedPromise.resolve(null);

        }




        execute(value: any) {
            // console.log("")

            const runner = this.pool.pop();


            if(runner == undefined){
                const queuedPromise = new QueuedPromise();
                this.queued.push(queuedPromise);

                return queuedPromise.promise.then(() => this.execute(value)); 
                // return executorAvailable.then(() => this.execute(f));
            }

            console.log("Got runner for value:"+value);
            
            // console.log("run...")
            const x = runner.run(value);

            // const x = Promise.resolve().then(f);
            // this.executing.add(x); // maybe we can cancel executing.
            return x.then((v) => {
                this.pool.push(runner);
                this.notify();

                return v;
            });
        }
    }
    

    const t = Date.now();
    const pool = new Pool(10);

    for(let i = 0; i < 100; i++){
        pool.execute(i)
            .then(x => console.log("Done:" + (Date.now() - t ) + ": " + x));
    }
    await wait(7000);        
});




test('Another try cleanup', async () => {


    class Runner {

        constructor(public id: number){}

        run(s: number): Promise<string> {
            return new Promise((resolve) => {
                setTimeout(() => {             
                    resolve(`Result Runner[${this.id}]: task: ${s}`);
                }, 100 * Math.floor(Math.random() * 10)) // discreet random values of [0, 0.1, 0.2, 0.3, ... 0.9]
            });
        }
    }


    class QueuedPromise { 
        resolve: (value: any) => void;
        reject: (reason?: any) => void;
        promise: Promise<any>;

        constructor(){
            this.promise = new Promise((res, rej) => {
                this.resolve = res;
                this.reject = rej;
            });
        }
    }
    
    class ExecutorPool<A, T> {
        pool: ((s: A) => Promise<T>)[] = [];
        queued: QueuedPromise[] = [];


        constructor(executors: ((s: A) => Promise<T>)[] ){
            this.pool = executors;
        }

        notify(){
            const queuedPromise = this.queued.shift();            
            if(queuedPromise){
                queuedPromise.resolve(null);
            }
        }

        execute(value: A) {
            const runner = this.pool.pop();

            if(runner == undefined){
                const queuedPromise = new QueuedPromise();
                this.queued.push(queuedPromise);
                return queuedPromise.promise.then(() => this.execute(value)); 
            }

            return runner(value).then((v) => {
                this.pool.push(runner);
                this.notify();
                return v;
            });
        }
    }

    const createRunnerFunction  = (id: number) => {
        const runner = new Runner(id);
        return (s: number) => runner.run(s);        
    }

    const t = Date.now();

    const executors = Array.from({length: 5}).map((_, i) => createRunnerFunction(i));
    const pool = new ExecutorPool<number, string>(executors);

    const runs: Promise<any>[] = [];

    for(let i = 0; i < 100; i++){
        runs.push(pool.execute(i).then(x => console.log("Done:" + (Date.now() - t ) + ": " + x)));
    }

    await Promise.all(runs);
    
 });