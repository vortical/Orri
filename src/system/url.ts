

interface SomethingThatGets {
    get(name: string): string | null;
    has(name: string): boolean;
}


export class SomethingThatGetsOrElse {
    
    something: SomethingThatGets;

    constructor(something: SomethingThatGets){
        this.something = something;
    }
    
    getBoolean(name: string, otherwise: any = undefined): boolean | any {
        const value  = this.something.get(name);
        return value? value.toLowerCase() === "true": otherwise;
    }
    
    getString(name: string, otherwise: any = undefined): string | any {
        return this.something.has(name) ? this.something.get(name)!: otherwise;
    }
    
    getFloat(name: string, otherwise: any = undefined): number | any {
        const value = this.something.get(name);
        if (!value){
            return otherwise;
        }
        
        const n = parseFloat(value); 
        return typeof n == "number"? n : undefined;
    }

}

