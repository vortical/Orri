import { BodyObject3D } from "../mesh/BodyObject3D";
import { OrbitLength } from "../mesh/OrbitOutline";
import { BODY_SELECT_TOPIC, BodySelectEventMessageType } from "../system/event-types";
import { BodySystem } from "./BodySystem";
import { Body } from "../body/Body";


export class OrbitOutlinesStateHandler {
    bodySystem: BodySystem;

    selectedSystem?: Body;

    constructor(bodySystem: BodySystem){

        

        this.bodySystem = bodySystem;

        
        this.createBodySelectionSubscribtion();
    }

    createBodySelectionSubscribtion() {
        PubSub.subscribe(BODY_SELECT_TOPIC, (msg, event: BodySelectEventMessageType) => {            
            if(this.getOrbitalOutlinesEnabled()){            
                const selectedBody = event.body;
                this.setTargetSystem(selectedBody.planetarySystem())
            }
        });
    }



    setTargetSystem(targetSystem: Body){
        if(targetSystem.planetarySystem() != this.selectedSystem){
            if(this.selectedSystem){
                // unselect existing selected system
                this.setPlanetaryMoonOrbitalOutlinesEnabled(this.selectedSystem, false);
            }
            this.selectedSystem = targetSystem.planetarySystem();
            this.setPlanetaryMoonOrbitalOutlinesEnabled(this.selectedSystem, true);
        }
        
    }


    setPlanetaryMoonOrbitalOutlinesEnabled(system: Body, value: boolean) {
        [...this.bodySystem.bodyObjects3D.values()]
        .filter(b => b.body.parent == system)
        .forEach(b => b.setOrbitOutlineEnabled(value ))
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
            bodyObject3D.orbitOutline.orbitLength = value;
        }
    }
   
    getOrbitalOutlineLength(): OrbitLength{
        const [firstBody] = this.bodySystem.bodyObjects3D.values();
        return firstBody.orbitOutline.orbitLength;

    }


}