import { TextureLoader } from 'three';
import config from '../configuration.ts';


// We want at texture loader to honor the base path of the deployed webapp.
const textureLoader = new TextureLoader();

// Make sure we don't make the path just be '/' else image.src ends up with 'http//' or 'https//'
// as per https://datatracker.ietf.org/doc/html/rfc3986#section-4.2
if(config.baseUrl && config.baseUrl.length > 1 && config.baseUrl !== '/' ){
    textureLoader.path=config.baseUrl;
}

export { textureLoader };
