class QueuedPromise {
    resolve!: (value: any) => void;
    reject!: (reason?: any) => void;
    promise: Promise<any>;

    constructor(){        
        this.promise = new Promise((res, rej) => {
            this.resolve = res;
            this.reject = rej;
        });
    }
}

/**
 * 
 * Accepts an array of 'executors' which is a set of functions that return promises.
 * 
 * The ExecutorPool ensures that none of the functions are invoked from
 * more than one process at the same time; hence given a limited number
 * of executors, no more than the amount of executors can be running
 * at the same time. If the pool has 10 executors, only 10 can be 
 * running asynchronously at the same time.
 * 
 */
export class ExecutorPool<A, T> {
    // TODO: does not handle rejects...
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

    execute(value: A): Promise<T> {
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
};