import { BodyObject3D } from "../mesh/BodyObject3D";
import { OrbitLength } from "../mesh/OrbitOutline";
import { BODY_SELECT_TOPIC, BodySelectEventMessageType } from "../system/event-types";
import { BodySystem } from "./BodySystem";
import { Body } from "../body/Body";
import { hashCode } from "../system/functions";


export class OrbitOutlinesStateHandler {
    bodySystem: BodySystem;

    selectedSystem?: Body;
    selectedBody?: BodyObject3D;

    orbitsEnabled: boolean =  false;
    unselectedSystemOpacity: number = 0.2;
    selectedSystemOpacity: number = 0.5;



    constructor(bodySystem: BodySystem){

        

        this.bodySystem = bodySystem;

        
        this.createBodySelectionSubscribtion();
    }

    createBodySelectionSubscribtion() {
        PubSub.subscribe(BODY_SELECT_TOPIC, (msg, event: BodySelectEventMessageType) => {            
            if(this.getOrbitalOutlinesEnabled()){            
                const selectedBody = event.body;
                this.setTargetBody(selectedBody);
                
            }
        });
    }


    setTargetBody(targetBody: BodyObject3D) {
      if(this.selectedBody != targetBody){
        this.setTargetSystem(targetBody.planetarySystem())
        this.selectedBody = targetBody;
      }
    }
    setTargetSystem(targetSystem: Body){
        if(targetSystem.planetarySystem() != this.selectedSystem){
            if(this.selectedSystem){
                // unselect existing selected system
                this.setMoonOrbitalOutlinesEnabled(this.selectedSystem, false);
            }
            
            this.selectedSystem = targetSystem.planetarySystem();
            this.setSelectedOrbitalOutlinesOpacity(this.selectedSystemOpacity);
            this.setUnselectedOrbitalOutlinesOpacity(this.unselectedSystemOpacity);
            this.setMoonOrbitalOutlinesEnabled(this.selectedSystem, true);

        }
        
    }



    setPlanetaryMoonOrbitalOutlinesColorHues(){
        [...this.bodySystem.bodyObjects3D.values()]
        .filter(b => b.body.type == "moon")
        .forEach(b => b.orbitOutline.colorHue = (hashCode(b.getName()) % 100)/100);

    }

    setMoonOrbitalOutlinesEnabled(system: Body, value: boolean) {
        [...this.bodySystem.bodyObjects3D.values()]
        .filter(b => b.body.parent == system)
        .forEach(b => b.setOrbitOutlineEnabled(value ))
    }

    setOrbitalOutlinesEnabled(value: boolean) {

      [...this.bodySystem.bodyObjects3D.values()]
        .filter(b => b.body.type == "spacecraft")
        .forEach(b => b.setOrbitOutlineEnabled(false));


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

    setSelectedOrbitalOutlinesOpacity(value: number) {
      this.selectedSystemOpacity = value;

      const objects = [...this.bodySystem.bodyObjects3D.values()]
        .filter(bodyObject => bodyObject.planetarySystem() == this.selectedSystem)

      objects.forEach(bodyObject => bodyObject.orbitOutline.opacity = value);
    }

    setUnselectedOrbitalOutlinesOpacity(value: number) {
      this.unselectedSystemOpacity = value;

      [...this.bodySystem.bodyObjects3D.values()]
        .filter(bodyObject => bodyObject.planetarySystem() != this.selectedSystem)
        .forEach(bodyObject => bodyObject.orbitOutline.opacity = value);
    }    

 
    getSelectedOrbitalOutlinesOpacity(): number {
      return this.selectedSystemOpacity;
    }

    getUnselectedOrbitalOutlinesOpacity(): number {
      return this.unselectedSystemOpacity;
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

   // setOrbitalOutlinesOpacity(value: number) {        
    //   for(const bodyObject3D of this.bodySystem.bodyObjects3D.values()){
    //       bodyObject3D.orbitOutline.opacity = value;
    //   }
    // }    