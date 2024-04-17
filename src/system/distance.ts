export const DistanceUnits = {
    au: { abbrev: "au", conversion: 149597870.691 },
    mi: { abbrev: "mi", conversion: 1.609344 },
    km: { abbrev: "km", conversion: 1 },
    m: { abbrev: "m", conversion: 0.001 },
}

export type DistanceUnit = typeof DistanceUnits[keyof typeof DistanceUnits];

export function convertDistance(source: number, sourceUnits: DistanceUnit, targetUnits: DistanceUnit): number {
    return source * sourceUnits.conversion / targetUnits.conversion;
}

export class DistanceFormatter {

    distanceUnit: DistanceUnit;

    constructor(unit: DistanceUnit) {
        this.distanceUnit = unit;
    }

    format(distance: number): string {
        function formatNumber(n: number, decimals: number = 0): string {
            return n.toLocaleString(undefined, { maximumFractionDigits: decimals })
        }

        const decimals = this.distanceUnit == DistanceUnits.au ? 3 : 0;
        return formatNumber(distance / this.distanceUnit.conversion, decimals).concat(" ", this.distanceUnit.abbrev);
    }
};