import { Lensflare, LensflareElement } from 'three/addons/objects/Lensflare.js';
import { StarBodyObject3D } from './StarBodyObject3D';
import { getObjectScreenSize } from '../system/geometry';
import { Dim } from "../system/Dim.ts";
import { textureLoader } from '../services/textureLoader.ts';


const FLARE_TEXTURE_SIZE = 512;

/**
 * Lensflare are not an Object#d with an inherent geometry. They have a static size and always face the camera. 
 * 
 * We create a set of flares with different sizes (i.e. scales).
 *   
 * For every frame rendered, we determine the scaled flare to make visible depending on distance to sun.
 */

function* logSequenceGenerator(start: number, end: number, nbSteps: number): Generator<number> {
    const stepSize = (Math.log(end) - Math.log(start)) / (nbSteps - 1);
    for (let i = 0; i < nbSteps; i++) {
        yield Math.exp(Math.log(start) + i * stepSize);
    }
}

function* linearSequenceGenerator(start: number, end: number, nbSteps: number): Generator<number> {
    const stepSize = (end - start) / (nbSteps - 1);
    for (let i = start; i <= end; i += stepSize) {
        yield i;
    }
}

class ScaledLensflare {
    scale: number;
    lensflare: Lensflare;

    constructor(scale: number, lensflare: Lensflare) {
        this.scale = scale;
        this.lensflare = lensflare
    }
}

export class FlareEffect {
    flares: ScaledLensflare[] = [];
    star: StarBodyObject3D;
    lensflare?: Lensflare;

    constructor(star: StarBodyObject3D) {
        this.star = star;

        // I think the log scale is better, we should ditch the linearSequenceGenerator.
        this.flares = createFlares(star.pointLight.color, logSequenceGenerator(0.015, 20, 60));
        this.star.pointLight.add(...(this.flares.map(it => it.lensflare)));
    }

    getFlare(scale: number): Lensflare {
        const closest = this.flares.reduce((prev, cur) => (Math.abs(cur.scale - scale) < Math.abs(prev.scale - scale)) ? cur : prev, this.flares[0]);
        return closest.lensflare;
    }


    update() {

        function computeFlareScaleForStarSize(bodysizePixels: Dim): number {
            // the flare texture size is 512, and the center part of it (i.e. 2/29 or ~7%) represents the 
            // central part 'kinda around/matching' actual body.
            // So given a bodysizePixels size, we determine the scale value of this texture.
            const centerBodySize = FLARE_TEXTURE_SIZE * 2 / 29; // ~35 pixels - 7%
            const scale = Math.max(bodysizePixels.w, bodysizePixels.h) / centerBodySize;
            return scale;
        }

        const starSizePixels: Dim = getObjectScreenSize(new Dim(this.star.body.radius * 2 / 1000, this.star.body.radius * 2 / 1000), this.star.object3D.position, this.star.bodySystem.camera, this.star.bodySystem.getSize());
        let scale = computeFlareScaleForStarSize(starSizePixels);

        // add zoom factor
        scale = scale * this.star.object3D.scale.getComponent(0);
        const flare = this.getFlare(scale);

        if (this.lensflare !== flare) {
            if (this.lensflare) {
                this.lensflare.visible = false;
            }
            this.lensflare = flare;
            this.lensflare.visible = true;
        }
    }
}


function createFlares(color: any, scales: Iterable<number>): ScaledLensflare[] {
    const textureFlare0 = textureLoader.load('/assets/textures/lensflare/lensflare0_alpha.png');
    const flares = [];

    // create all possible lensflares but don't make them visible.
    for (const scale of scales) {
        const lensflare = new Lensflare();
        lensflare.addElement(new LensflareElement(textureFlare0, 512 * scale, 0, color));
        const scaledFlare = new ScaledLensflare(scale, lensflare)
        lensflare.visible = false;
        flares.push(scaledFlare);
    }
    return flares;
}