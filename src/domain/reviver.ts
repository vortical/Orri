
export type PropertyReviver = (key:string, value: any) => any;
export type ValueReviver = (value: any) => any;


export const compositeReviver = (revivers: PropertyReviver[]) => (key: string, value: any) => revivers.reduce( (v, f) => f(key, v), value);


export const namedPropertyReviver: PropertyReviver = (filteringName: string, f: ValueReviver) => (key: string, value: any) => {
    if (key == filteringName){
        return f(value);
    }
    return value;
}
