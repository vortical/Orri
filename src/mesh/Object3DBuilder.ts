import { Object3D } from "three";
import { Body } from '../body/Body.ts';

type Object3DBuilderFactory = (body: Body) => Object3DBuilder;

type Object3DBuilder = (body: Body) => Object3D;

export type { Object3DBuilder, Object3DBuilderFactory };


// export abstract class MeshBuilder {
//     public abstract createMesh(body: Body): Mesh;

// }
