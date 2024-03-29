import { Body } from "../domain/Body.ts";
import { BodyProperties, KinematicObject, VectorComponents } from "../domain/models.ts";

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
         * Our axis are not the same...
         * 
         * @param v 
         * @returns 
         */
        function transform_to_local_coordinate_system(v: VectorComponents): VectorComponents{
            return {x: v.x, y: v.z, z: -v.y};
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

        return  {name: json.name, axis: json.axis, velocity: transform_to_local_coordinate_system(json.velocity), position: transform_to_local_coordinate_system(json.position), datetime: new Date(json.datetime)}; 
    }
    
    loadKinematics(bodyNames: string[], time: Date): Promise<KinematicObject[]> {

        return Promise.all(bodyNames.map( async (name) =>  this.loadKinematicObject(name, time)))

    }
  
    async loadSolarSystem(time: Date = new Date()): Promise<Body[]> {

        const that = this;

        async function postCreate(bodies: Body[]){
            // assign parents
            bodies
                .filter((b) => b.parentName)
                .forEach((b) => b.parent = bodies.find((parent) => parent.name == b.parentName ));
                    
                
        
            return await Promise.all(bodies.map( async (b) => {
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
            // console.error(err);
            throw new Error(`Could not load body data: invalid json data: ${err.message}`);
        })

        let bodies = payloadBodies.map((payload) => new Body(payload));  
        return postCreate(bodies);
    }
  }



// This was needed when we only got speeds in 2d plane and needed to transpose them to the body's orbital
// plane. 
// /**
//  * Kind of messy, but our initial data needs to be massaged until we figure out exactly how
//  * we want to pass in the initial data (e.g.: a data server returning in exact position and speeds for a 
//  * specific time). 
//  * 
//  * @param body 
//  * @returns 
//  */
// function postCreate(body: Body){


//     // /**
//     //  * initial speeds are given in 2D, but they are to be aligned along the orbit plane of the body.
//     //  * 
//     //  * 
//     //  */
//     // function transposeSpeedToOrbitalPlane(body: Body){
  
//     //   if(body.orbitInclination != 0){
  
//     //     // Determine an axis that is 90 degrees rotated around y axis of speed vector, 
//     //     // the oribital tilt will be applied from that axis.
//     //     const childLocalSpeed = body.speed.toVector3();
        
//     //     const rotateAroundY = new Quaternion().setFromAxisAngle( new Vector3(0,1,0), Math.PI/2);
//     //     const axisAngle = childLocalSpeed.clone().applyQuaternion(rotateAroundY).normalize();
        
//     //     // Quaternion of the orbital plane
//     //     const quaternion = new Quaternion().setFromAxisAngle( axisAngle, toRad(body.orbitInclination));
        
//     //     const childSpeedOnOrbitalPlane = childLocalSpeed.clone().applyQuaternion(quaternion);
//     //     // Transform the 2D speed of the child onto the orbital plane and add the parent vector
//     //     const parentSpeed = body.parent!.speed.toVector3();
//     //     body.speed = Vec3D.fromVector(parentSpeed.add(childSpeedOnOrbitalPlane));        
//     //     // need to also add parents position)
//     //     body.position = Vec3D.add(body.position, body.parent!.position);
//     //   }

//     //   return body;
//     // }

//     return body

//     // return transposeSpeedToOrbitalPlane(body);
// }



            // // todo: put this in the backend data service
            // function hackMoonAxisRotation(){
            //     // find position of moon and earth
            //     const earthBody = bodiesWithKinematicData.find(b => b.name.toLowerCase() == "earth")!;
            //     const moonBody =  bodiesWithKinematicData.find(b => b.name.toLowerCase() == "moon")!;

            //     const v: Vector = Vector.substract(moonBody.position,earthBody.position).normalize();




                
            //     const angle = toDeg(angleTo(new Vector(1,0,0), v,  new Vector(0,1,0)));
            //     console.log("angle is "+angle);

            //     const kinematics = moonBody.getKinematics();
            //     kinematics.axis = {direction: kinematics.axis?.direction, rotation: angle}
            //     // moonBody.setKinematics(kinematics)



            //     // v is the direction of the face of 
            //     // what is the 0 direction angle? 

            // }
            // // The back end only returns rotation  data for earth. We'd like to have rotation data for moon
            // // (where its prime meridian is facing the earth (not considering libration... etc..))
          
            // hackMoonAxisRotation();