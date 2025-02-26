export function zipCombine<T>(aa: T[], bb: T[], f:(a:T, b: T)=>T ){
    return aa.map( (a,i) => f(a, bb[i]));
};

// export function hashCode(s: String) {
//     for(var i = 0, h = 0; i < s.length; i++)
//         h = Math.imul(31, h) + s.charCodeAt(i) | 0;
//     return h;
// }