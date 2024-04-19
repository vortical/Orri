import { Spherical } from "three";
import { convert as convertLatLon } from 'geo-coordinates-parser';
import { toRad } from "./geometry";

export class LatLon {
  static LON_OFFSET = 90;

  lat: number;
  lon: number;

  /**
   *
   * @param lat degrees latitude
   * @param lon degrees longitude
   */
  constructor(lat: number, lon: number) {
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      throw new Error(`Coordonates out of bounds: ${lat}, ${lon}. Expected values for latitudes: [-90, 90] and longitudes:[-180,180].`);
    }

    this.lat = lat;
    this.lon = lon;
  }

  toString(): string {
    return `${this.lat}, ${this.lon}`;
  }


  /**
   * Parse lat lon coordinates from various string representations (not just our own).
   *
   * @param s
   * @returns
   */
  static fromString(s: string): LatLon | undefined {
    if (s == undefined || s.trim().length == 0) return undefined;

    try {
      const converted = convertLatLon(s);
      return new LatLon(parseFloat(converted.decimalLatitude), parseFloat(converted.decimalLongitude));
    } catch (e: any) {
      const locationString = s.split(",");
      const lat = parseFloat(locationString[0]);
      const lon = parseFloat(locationString[1]);
      if (isNaN(lat) || isNaN(lon)) {
        throw new Error(`Could not parse coordinates.`);
      }
      return new LatLon(lat, lon);
    }
  }

  /**
   *
   * @param radius radius of body in km
   * @returns
   */
  toSpherical(radius: number): Spherical {
    const phi = toRad(90 - this.lat);
    const theta = toRad(this.lon + LatLon.LON_OFFSET);
    const sphereCoords = new Spherical(radius, phi, theta);
    return sphereCoords;
  }
}
