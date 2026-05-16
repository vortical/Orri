import { RenderableBody } from "../mesh/RenderableBody";
import { OrbitLength, OrbitLengthType, OrbitTrajectoryOutline } from "../mesh/OrbitOutline";
import { BODY_SELECT_TOPIC, BodySelectEventMessageType } from "../system/event-types";
import { BodySystem } from "./BodySystem";
import { Body } from "../body/Body";
import { hashCode } from "../system/functions";


export class OrbitOutlinesStateHandler {
    bodySystem: BodySystem;

    selectedSystem?: Body;
    selectedBody?: RenderableBody;

    orbitsEnabled: boolean =  false;
    unselectedSystemOpacity: number = 0.2;
    selectedSystemOpacity: number = 0.5;
    orbitalLength: OrbitLength = {value: 350, lengthType: OrbitLengthType.AngleDegrees};



    constructor(bodySystem: BodySystem){

        

        this.bodySystem = bodySystem;

        
        this.createBodySelectionSubscribtion();
    }

    createBodySelectionSubscribtion() {
        PubSub.subscribe(BODY_SELECT_TOPIC, (msg, event: BodySelectEventMessageType) => {        
          console.log("OrbitOutline body selected");    
            
                const selectedBody = event.body;
                this.setTargetBody(selectedBody);
                
            
        });
    }


    setTargetBody(targetBody: RenderableBody) {
      if(this.selectedBody != targetBody){
        this.setTargetSystem(targetBody.planetarySystem())
        this.selectedBody = targetBody;
      }
    }
    setTargetSystem(targetSystem: Body){
        if(targetSystem != this.selectedSystem){
            if(this.selectedSystem){
                // unselect existing selected system
                this.setMoonOrbitalOutlinesEnabled(this.selectedSystem, false);
            }
            
            this.selectedSystem = targetSystem;
            this.setSelectedOrbitalOutlinesOpacity(this.selectedSystemOpacity);
            this.setUnselectedOrbitalOutlinesOpacity(this.unselectedSystemOpacity);
            this.setMoonOrbitalOutlinesEnabled(this.selectedSystem, this.orbitsEnabled);
        }
        
    }



    setPlanetaryMoonOrbitalOutlinesColorHues(){
        this.bodySystem.renderableBodies
        .filter(b => b.body.type == "moon")
        .forEach(b => b.trajectoryOutline.colorHue = (hashCode(b.getName()) % 100)/100);

    }

    setMoonOrbitalOutlinesEnabled(system: Body, value: boolean) {
        this.bodySystem.renderableBodies
        .filter(b => b.body.parent == system)
        .forEach(b => b.setOrbitOutlineEnabled(value ))
    }

    setOrbitalOutlinesEnabled(value: boolean) {

      this.orbitsEnabled = value;

      // these are managed elswhere
      this.bodySystem.renderableBodies
        .filter(b => b.body.type == "spacecraft")
        .forEach(b => b.setOrbitOutlineEnabled(value));


        this.bodySystem.renderableBodies
        .filter(b => b.body.type == "planet")
        .forEach(b => b.setOrbitOutlineEnabled(value));

        // moon orbits are only shown if their planet is the target
        this.bodySystem.renderableBodies
        .filter(b => b.body.type == "moon")
        .forEach(b => b.setOrbitOutlineEnabled(b.isPlanetarySystemSelected() && value ))
    }

    getOrbitalOutlinesEnabled(): boolean {
      return this.orbitsEnabled;
    }

    setSelectedOrbitalOutlinesOpacity(value: number) {
      this.selectedSystemOpacity = value;

      const objects = this.bodySystem.renderableBodies
        .filter(bodyObject => bodyObject.planetarySystem() == this.selectedSystem)

      objects.forEach(bodyObject => bodyObject.trajectoryOutline.opacity = value);
    }

    setUnselectedOrbitalOutlinesOpacity(value: number) {
      this.unselectedSystemOpacity = value;

      this.bodySystem.renderableBodies
        .filter(bodyObject => bodyObject.planetarySystem() != this.selectedSystem)
        .forEach(bodyObject => bodyObject.trajectoryOutline.opacity = value);
    }

 
    getSelectedOrbitalOutlinesOpacity(): number {
      return this.selectedSystemOpacity;
    }

    getUnselectedOrbitalOutlinesOpacity(): number {
      return this.unselectedSystemOpacity;
    }


    setOrbitalOutlineLength(value: OrbitLength){
        console.log("Line :"+value.lengthType + ", "+value.value)
        for(const bodyObject3D of this.bodySystem.renderableBodies){
            const outline = bodyObject3D.trajectoryOutline;
            if (outline instanceof OrbitTrajectoryOutline) {
                outline.orbitLength = value;
            }
        }
    }

    getOrbitalOutlineLength(): OrbitLength{
        const firstOrbit = this.bodySystem.renderableBodies
            .map(b => b.trajectoryOutline)
            .find((o): o is OrbitTrajectoryOutline => o instanceof OrbitTrajectoryOutline)!;
        return firstOrbit.orbitLength;
    }


}

   // setOrbitalOutlinesOpacity(value: number) {        
    //   for(const bodyObject3D of this.bodySystem.renderableBodies.values()){
    //       bodyObject3D.orbitOutline.opacity = value;
    //   }
    // }    