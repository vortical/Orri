import { PerspectiveCamera, Vector3 } from "three";
import { OrbitControls } from "three/examples/jsm/Addons.js";
import { Body } from '../body/Body.ts';

class ViewTransitions {
    camera: PerspectiveCamera;
    controls: OrbitControls;

    constructor(camera: PerspectiveCamera, controls: OrbitControls){
        this.camera = camera;
        this.controls = controls;
    }


    setCameraAndTarget(cameraPosition: Vector3, targetPosition: Vector3){
        this.controls.target = targetPosition;
        this.camera.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z)
    }


    /**
     * 
     * @param body moves camera towards a moving body
     * 
     * @param distance 
     * @param nbSteps 
     * @param moveTime 
     */
    moveToTarget(body: Body, distance?: number, nbSteps: number=20, moveTime: number=1000): void {
        const intervalTime = moveTime/nbSteps;
        const that = this;

        this.controls.enabled = false;

        function calculateDeltas(nbSteps: number){
            const cameraPosition0 = that.camera.position.clone();
            const target0 = that.controls.target.clone();
    
            const target1 = new Vector3(body.position.x/1000, body.position.y/1000, body.position.z/1000);

            if(distance == undefined){
                distance = that.controls.getDistance();
            }
    
    
    
            const directionToTarget = target0.clone().sub(cameraPosition0).normalize();    
            let cameraPosition1 = target1.clone().sub(directionToTarget.clone().multiplyScalar(distance));
    
    
    
            const deltaCameraPosition = cameraPosition1.sub(cameraPosition0).multiplyScalar(1/nbSteps);
            const deltaTargetPosition = target1.sub(target0).multiplyScalar(1/nbSteps);
            return {deltaCamera: deltaCameraPosition, deltaTarget: deltaTargetPosition};
    
        }

        let currentStep = 0;
        //controls.stopListenToKeyEvents();
        
        let timerId = setInterval( () => {

            const { deltaCamera, deltaTarget } = calculateDeltas(nbSteps-currentStep);

            if (currentStep == nbSteps){
                clearInterval(timerId);
                this.controls.enabled = true;
            }
            currentStep++;
    
            that.setCameraAndTarget(
                that.controls.target.clone().add(deltaTarget.clone()),
                that.camera.position.clone().add(deltaCamera.clone())
            )
        }, intervalTime);
    
    
    }


}

export { ViewTransitions }


    // moveToTarget(target: Vector3, distance: number, nbSteps: number=20, moveTime:number=1000) {
    





    //     const cameraPosition0 = camera.position.clone();
    //     const target0 = controls.target.clone();
        
    //     let target1 = target;

    // if(distance == undefined){
    //     distance = controls.getDistance();
    // }
    
    // const directionToTarget = target0.sub(cameraPosition0).normalize();    
    // let cameraPosition1 = target1.clone().sub(directionToTarget.clone().multiplyScalar(distance));

    // const intervalTime = moveTime/nbSteps;

    // const deltaCameraPosition = cameraPosition1.sub(cameraPosition0).multiplyScalar(1/nbSteps);
    // const deltaTargetPosition = target1.sub(target0).multiplyScalar(1/nbSteps);
    // let currentStep = 0;
    // //controls.stopListenToKeyEvents();
    
    // let timerId = setInterval( () => {
    //     if (currentStep == nbSteps){
    //         clearInterval(timerId);
    //   //      controls.listenToKeyEvents(controls.domElement as HTMLElement);
    //         // re-enable controls
    //     }

    //     setView(
    //         target0.clone().add(deltaTargetPosition.clone().multiplyScalar(currentStep)),
    //         cameraPosition0.add(deltaCameraPosition.clone().multiplyScalar(currentStep))
    //     )
    // });

    
    






    

 
    

    
    //controls.stopListenToKeyEvents
// }