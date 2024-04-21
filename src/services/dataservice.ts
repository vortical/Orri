import { Body } from "../body/Body.ts";
import { BodyProperties, KinematicObject, VectorComponents } from "../domain/models.ts";


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

    async loadKinematicObject(name: string, time: Date): Promise<KinematicObject> {

        /**
         * Our coordinate systems are not exactly the same. 
         * 
         * @param v 
         * @returns 
         */
        function transform_to_local_coordinate_system(v: VectorComponents): VectorComponents {
            return { x: v.x, y: v.z, z: -v.y };
        }

        const apiUrl = `${this.spaceFieldBaseURL}/ephemeris/barycentrics/${name}?time=${time.toISOString()}`;
        const requestOptions = {
            method: 'GET',
        };

        const response = await fetch(apiUrl, requestOptions);
        const json = await response.json();


        if (json.axis) {
            json.axis.direction = transform_to_local_coordinate_system(json.axis.direction);
        }

        return { name: json.name, axis: json.axis, velocity: transform_to_local_coordinate_system(json.velocity), position: transform_to_local_coordinate_system(json.position), datetime: new Date(json.datetime) };
    }

    loadKinematics(bodyNames: string[], time: Date): Promise<KinematicObject[]> {

        return Promise.all(bodyNames.map(async (name) => this.loadKinematicObject(name, time)))

    }

    async loadSolarSystem(time: Date = new Date()): Promise<Body[]> {

        const that = this;

        async function postCreate(bodies: Body[]) {
            // find and assign parent instances. 
            bodies
                .filter((b) => b.parentName)
                .forEach((b) => b.parent = bodies.find((parent) => parent.name == b.parentName))

            return await Promise.all(bodies.map(async (b) => {
                const kinematicObject = await that.loadKinematicObject(b.name, time);
                b.setKinematics(kinematicObject);
                return b;
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
