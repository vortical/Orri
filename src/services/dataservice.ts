import { Body } from "../body/Body.ts";
import { BodyProperties, BurnEvent, KinematicObject, VectorComponents } from "../domain/models.ts";


/**
 * Our UI view coordinate systems are not exactly the same, flip:
 *  y = z, z = -y
 * 
 * @param v 
 * @returns transformed coordinates
 */
function transform_to_local_coordinate_system(v: VectorComponents): VectorComponents {
    return { x: v.x, y: v.z, z: -v.y };
}

/**
 * Client to our REST API at:
 * 
 * https://vortical.hopto.org/spacefield/docs
 * 
 * The API provides positions, speeds and axis direction for bodies at a specific time.
 */
export class DataService {
    spaceFieldBaseURL: string;
    assetsBaseUrl: string

    /**
     * assetsBaseUrl is location of data on the client. This is temporary until
     * we move all this to server.
     * 
     * @param host 
     * @param assetsBaseUrl 
     */
    constructor(spaceFieldBaseURL: string, assetsBaseUrl: string = "/") {
        this.spaceFieldBaseURL = spaceFieldBaseURL;
        this.assetsBaseUrl = assetsBaseUrl
    }


    async loadBurnEvents(body: Body): Promise<BurnEvent[]> {
      if (body.type !== "spacecraft"){
        return [];
      }

      const apiUrl = `${this.spaceFieldBaseURL}/ephemeris/spacecraft/${body.name.toLowerCase()}/burns`;
      const requestOptions = {
          method: 'GET',
      };

      const response = await fetch(apiUrl, requestOptions);
      const json = await response.json();

      return json.map((e: { start: string; end: string; burnVector: VectorComponents; }): BurnEvent => ({
        startMs: Date.parse(e.start), 
        endMs: Date.parse(e.end), 
        burnVector: transform_to_local_coordinate_system(e.burnVector)
      }));
  }


  async loadEphemeris(body: Body, time: Date): Promise<KinematicObject> {
    const timeMs = time.getTime();

    if(body.isActiveAt(timeMs)){
    
      const pathPrefix = body.type != "spacecraft"?"ephemeris/bodies":"ephemeris/spacecraft";
      const apiUrl = `${this.spaceFieldBaseURL}/${pathPrefix}/${body.name.toLowerCase()}?time=${time.toISOString()}`;
      const requestOptions = {
          method: 'GET',
      };

      const response = await fetch(apiUrl, requestOptions);
      const json = await response.json();


      if (json.axis) {
          json.axis.direction = transform_to_local_coordinate_system(json.axis.direction);
      }

      return { 
          name: json.name, 
          axis: json.axis, 
          ephemeris: { 
              velocity: transform_to_local_coordinate_system(json.ephemeris.velocity), 
              position: transform_to_local_coordinate_system(json.ephemeris.position)
          }, 
          datetime: new Date(json.datetime) 
      };
    } else {
      // inactive body
      return {
            name: body.name, 
            axis: undefined, 
            ephemeris: undefined,
            datetime: time

      };

    }
  }
  
       
  async loadKinematics(bodies: Body[], time: Date): Promise<KinematicObject[]> {
      return Promise.all(bodies.map(async (body) => this.loadEphemeris(body, time)))
  }

  async loadSolarSystem(time: Date = new Date()): Promise<Body[]> {

      const that = this;

      async function postCreate(bodies: Body[]) {
          // find and assign parent instances. 
          bodies
              .filter((b) => b.parentName)
              .forEach((b) => b.parent = bodies.find((parent) => parent.name == b.parentName))

          return await Promise.all(bodies.map(async (body) => {
              const kinematicObject = await that.loadEphemeris(body, time);
              body.setKinematics(kinematicObject);
              body.burnEvents = await that.loadBurnEvents(body);
              return body;
          }));
      }

      const response = await fetch(`${this.assetsBaseUrl}assets/datasmall.json`).catch((err: Error) => {
          console.error(err);
          throw new Error(`Could not load body data: could not fetch data ${err.message}`);
      })

      const payloadBodies: BodyProperties[] = await response.json().catch((err: Error) => {
          throw new Error(`Could not load body data: invalid json data: ${err.message}`);
      })

      let bodies = payloadBodies.map((payload) => new Body(payload));
      return postCreate(bodies);
  }
}
