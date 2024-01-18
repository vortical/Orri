import { Mesh } from "three";
import { Body } from '../body/Body.ts';

type MeshBuilderFactory = (body: Body) => MeshBuilder;

type MeshBuilder = (body: Body) => Mesh;

export type { MeshBuilder, MeshBuilderFactory };


// export abstract class MeshBuilder {
//     public abstract createMesh(body: Body): Mesh;

// }
