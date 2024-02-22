export function zipCombine<T>(aa: T[], bb: T[], f:(a:T, b: T)=>T ){
    return aa.map( (a,i) => f(a, bb[i]));
};


export const partial = (f: (...arg: any) => any, ...a: any) => (...others: any) => f.apply(null, [...a, ...others]);
