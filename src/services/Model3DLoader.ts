import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

import config from '../configuration.ts';
import { Object3D } from 'three';
import { BodySystem } from '../scene/BodySystem.ts';


/**
 * Texture loaders need a path to the textures. This is 
 * the base path of the deployed webapp.
 *  
 */
const gltfLoader = new GLTFLoader();

// Make sure we don't make the path just be '/' else image.src ends up with 'http//' or 'https//'
// as per https://datatracker.ietf.org/doc/html/rfc3986#section-4.2
if (config.baseUrl && config.baseUrl.length > 1 && config.baseUrl !== '/') {
    gltfLoader.path = config.baseUrl;
}


export class Model3DLoader {

    bodySystem: BodySystem;

    constructor(bodySystem: BodySystem) {
        this.bodySystem = bodySystem;
    }

    load(assetUri: string): Promise<Object3D> {
        
        return new Promise((resolve, reject) => {
            const l = gltfLoader.load( assetUri, async ( gltf ) => {
                const model = gltf.scene;
                // await shader compilation
                await this.bodySystem.renderer.compileAsync( model, this.bodySystem.camera, this.bodySystem.scene );
                resolve(model);
            });     
        });
    }
}
