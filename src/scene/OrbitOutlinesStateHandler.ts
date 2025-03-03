import { OrbitLength } from "../mesh/OrbitOutline";
import { BODY_SELECT_TOPIC, BodySelectEventMessageType } from "../system/event-types";
import { BodySystem } from "./BodySystem";


export class OrbitOutlinesStateHandler {
    bodySystem: BodySystem;


    constructor(bodySystem: BodySystem){

        

        this.bodySystem = bodySystem;

        
        this.createBodySelectionSubscribtion();
    }

    createBodySelectionSubscribtion() {
        PubSub.subscribe(BODY_SELECT_TOPIC, (msg, event: BodySelectEventMessageType) => {
            // if (this.star.shadowingLight) {
            //     if (event.body && this.star.shadowingLight.target !== event.body.object3D) {
            //         this.star.shadowingLight.target = event.body.object3D;
            //     }
            // }
        });
    }


        setOrbitalOutlinesEnabled(value: boolean) {
            [...this.bodySystem.bodyObjects3D.values()]
            .filter(b => b.body.type == "planet")
            .forEach(b => b.setOrbitOutlineEnabled(value));
    
            // moon orbits are only shown if their planet is the target
            [...this.bodySystem.bodyObjects3D.values()]
            .filter(b => b.body.type == "moon")
            .forEach(b => b.setOrbitOutlineEnabled(b.isPlanetarySystemSelected() && value ))
        }
    
        getOrbitalOutlinesEnabled(): boolean {
            const firstBody = [...this.bodySystem.bodyObjects3D.values()].find(v => v.body.type == "planet")!;
            return firstBody.orbitOutline.enabled;
        }
    
        setOrbitalOutlinesOpacity(value: number) {
    
            for(const bodyObject3D of this.bodySystem.bodyObjects3D.values()){
                bodyObject3D.orbitOutline.opacity = value;
            }
        }    
        getOrbitalOutlinesOpacity(): number {
            const [firstBody] = this.bodySystem.bodyObjects3D.values();
            return firstBody.orbitOutline.opacity;
        }
    
        setOrbitalOutlineLength(value: OrbitLength){
            console.log("Line :"+value.lengthType + ", "+value.value)
            for(const bodyObject3D of this.bodySystem.bodyObjects3D.values()){
                // if(bodyObject3D.getName() === "Earth"){
                    bodyObject3D.orbitOutline.orbitLength = value;
    
                // }
            }
        }
    
        // getOrbitalOutlineLength(): OrbitLength {
        //     const body = this.getBodyObject3D("Earth");
        //     return body.orbitOutline.orbitLength;
        // }
    
        getOrbitalOutlineLength(): OrbitLength{
            const [firstBody] = this.bodySystem.bodyObjects3D.values();
            return firstBody.orbitOutline.orbitLength;
    
        }
    

}