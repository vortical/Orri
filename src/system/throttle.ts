

// export function delay(i: number): Promise<void> {
//     return new Promise((resolve, reject) => setTimeout(() => resolve(), i));
// }
;
/**
 *
 *
 * Limit the invocation frequency of a function.
 *
 * E.g. of usage:
 *
 * async function throttling() {
 *
 *   function delay(i: number): Promise<void> {
 *       return new Promise((resolve, reject) => setTimeout(() => resolve(), i))
 *   }
 *
 *   const context = {
 *       value: "Some property"
 *   };
 *
 *   const throttledFunction = throttle(200, context, (v: number, x: number) => {
 *          console.log(this.value+" args:"+v+","+x);
 *       }
 *   });
 *
 *
 *   for(let i=0; i< 10000; i++){
 *       throttledFunction(i, i+100);
 *       await delay(1);
 *   }
* }

 * @param threshold represents minimum interval delta between invocation
 * @param scope the scope/context of the function
 * @param fn the function.
 * @returns
 */


export function throttle(threshold: number, scope: any | undefined, fn: (...args: any) => any) {
    let last: number | undefined = undefined;
    let timeoutId: any = undefined;
    return function (...args: any) {
        const context = scope || this;
        const now = new Date().getTime();
        last = last || now - threshold;

        // replace previous throttled invocation, update
        // time with remaining time until threshold is met.
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            last = now;
            fn.apply(context, args);
        }, threshold - (now - last));
    };
}

