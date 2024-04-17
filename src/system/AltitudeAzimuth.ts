
export type ElevationmTrend = 1|-1;

export class AltitudeAzimuth {
  elevation: number;
  azimuth: number;

  trend?: ElevationmTrend;

  constructor(elevation: number, azimuth: number) {
    this.elevation = elevation;
    this.azimuth = azimuth;
  }

  toString(): string {
    const trendCharacter = this.trend == -1 ? '\u2193' : this.trend == 1 ? '\u2191' : '';
    const northOrSouth = this.elevation < 0 ? "S" : "N";
    const elevationString = Math.abs(this.elevation).toLocaleString(undefined, { maximumFractionDigits: 1 });
    const azimuthString = this.azimuth.toLocaleString(undefined, { maximumFractionDigits: 1 });
    return `${elevationString}\u00B0${northOrSouth}${trendCharacter}, ${azimuthString}\u00B0`;
  }

  calcTrend(previous?: AltitudeAzimuth) {
    if (previous != undefined) {
      if (this.elevation < previous.elevation) {
        this.trend = -1;
      } else if (this.elevation > previous.elevation) {
        this.trend = 1;
      }
    }
  }
}
