import { Mesh, PerspectiveCamera, Sphere, Vector3 } from "three";
import { Dim } from "./Dim";


export function toRad(degrees: number): number {
  return degrees * Math.PI / 180;
}

export function toDeg(rad: number): number {
  return rad * 180 / Math.PI;
}

/**
 * 
 * Returns an angle from 0 to 2*PI. The rotation of the angle is along the plane 
 * normal vector.
 * 
 * @param v1 
 * @param v2 
 * @param plane the normal of the plane from which we measure the angle
 * @returns 
 */
export function angleTo(v1: Vector3, v2: Vector3, plane: Vector3): number {
  const v1Projected = v1.clone().projectOnPlane(plane);
  const v2Projected = v2.clone().projectOnPlane(plane);
  const angle = v1Projected.angleTo(v2Projected);
  const cross = v1Projected.clone().cross(v2Projected);
  return cross.angleTo(plane) < Math.PI / 2 ? angle : Math.PI * 2 - angle;
}

/**
 * Size of a mesh's bounds in pixels on a screen.
 *  
 * @param mesh 
 * @param camera 
 * @param screenSize 
 * @returns 
 */
export function getMeshScreenSize(mesh: Mesh, camera: PerspectiveCamera, screenSize: Dim): Dim {
  const cameraSize = getMeshSizeFromCameraView(mesh, camera);
  return new Dim(screenSize.w * cameraSize.w, screenSize.h * cameraSize.h);
}

export function getObjectScreenSize(objsectSize: Dim, objectPosition: Vector3, camera: PerspectiveCamera, screenSize: Dim): Dim {
  const cameraSize = getObjectSizeFromCameraView(objsectSize, objectPosition, camera);
  return new Dim(screenSize.w * cameraSize.w, screenSize.h * cameraSize.h);
}

/**
 * 
 * Given a mesh is shown on a perspective camera, what percentage of the view does the mesh occupy in x and y.
 * We use this to determine the size in pixels of a mesh shown in a view if we know the screen size 
 * (@see getObjectScreenSize).
 * 
 * @param mesh 
 * @returns the x and y ratio of the mesh on the screen.
 */
function getMeshSizeFromCameraView(mesh: Mesh, camera: PerspectiveCamera): Dim {
  mesh.geometry.computeBoundingSphere();
  const sphere: Sphere = mesh.geometry.boundingSphere!;
  return getObjectSizeFromCameraView(new Dim(sphere.radius * 2, sphere.radius * 2), mesh.position, camera);
}

function getObjectSizeFromCameraView(objsectSize: Dim, objectPosition: Vector3, camera: PerspectiveCamera): Dim {
  const camPos = camera.position;
  const distance = camPos.distanceTo(objectPosition);
  const fovDeg = camera.getEffectiveFOV();
  const fovRad = toRad(fovDeg);
  const height = 2 * Math.tan(fovRad / 2) * distance;
  const width = camera.aspect * height;
  return new Dim(objsectSize.w / width, objsectSize.h / height);
}

