import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

import config from '../configuration.ts';
import { Loader, Object3D } from 'three';
import { BodySystem } from '../scene/BodySystem.ts';


/**
 * Texture loaders need a path to the textures. This is 
 * the base path of the deployed webapp.
 *  
 */
const gltfLoader = new GLTFLoader();
const fbxLoader = new FBXLoader();

// Make sure we don't make the path just be '/' else image.src ends up with 'http//' or 'https//'
// as per https://datatracker.ietf.org/doc/html/rfc3986#section-4.2
if (config.baseUrl && config.baseUrl.length > 1 && config.baseUrl !== '/') {
    gltfLoader.path = config.baseUrl;
    fbxLoader.path = config.baseUrl;
}

function getModelLoader(assetUri: string): Loader {
  if(assetUri.endsWith(".fbx")){
    return fbxLoader;
  }

  return gltfLoader;

}

export class Model3DLoader {

    bodySystem: BodySystem;

    constructor(bodySystem: BodySystem) {
        this.bodySystem = bodySystem;
    }

    doload(assetUri: string): Promise<Object3D>  {
      if(assetUri.endsWith(".fbx")){
        return this.loadFBX(assetUri);
      }
      return this.loadGLTF(assetUri);
    }

    async loadFBX(assetUri: string): Promise<Object3D>{
      return fbxLoader.loadAsync( assetUri);
    }

    loadGLTF(assetUri: string): Promise<Object3D>{
        return new Promise((resolve, reject) => {
            const l = gltfLoader.load( assetUri, async ( gltf ) => {
                const model = gltf.scene;
                // await shader compilation
                await this.bodySystem.renderer.compileAsync( model, this.bodySystem.camera, this.bodySystem.scene );
                resolve(model);
            });     
        });      
    }

    load(assetUri: string): Promise<Object3D> {
      return this.doload(assetUri);
        
        // return new Promise((resolve, reject) => {
        //     const l = gltfLoader.load( assetUri, async ( gltf ) => {
        //         const model = gltf.scene;
        //         // await shader compilation
        //         await this.bodySystem.renderer.compileAsync( model, this.bodySystem.camera, this.bodySystem.scene );
        //         resolve(model);
        //     });     
        // });
    }
}
