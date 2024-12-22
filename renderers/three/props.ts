import { Object3D } from "three";
import { act, three } from "./deps";

export type Object3DProps<T extends Object3D> = {
  position?: three.Vector3,
  scale?: three.Vector3,
  quaternion?: three.Quaternion,
  rotation?: three.Euler,

  ref?: act.ReadonlyRef<null | three.Object3D>,
}
  & (T extends three.Mesh ? { geometry?: three.BufferGeometry, material?: three.Material } : {})
  & (T extends three.Scene ? { background?: three.Color } : {})

export const setProps = <T extends Object3D>(object: T, props: Object3DProps<T>) => {
  if (props.position)
    object.position.copy(props.position as three.Vector3);
  if (props.scale)
    object.scale.copy(props.scale as three.Vector3);
  if (props.quaternion)
    object.quaternion.copy(props.quaternion as three.Quaternion);
  if (props.rotation)
    object.rotation.copy(props.rotation as three.Euler);
  if (props.ref)
    (props.ref as Record<string, unknown>).current = object;
  
  if (object instanceof three.Mesh) {
    const meshProps = props as Object3DProps<three.Mesh>;
    object.geometry = meshProps.geometry;
    object.material = meshProps.material;
  }
  if (object instanceof three.PerspectiveCamera) {
    object.updateProjectionMatrix();
  }
  if (object instanceof three.Scene) {
    const sceneProps = props as Object3DProps<three.Scene>;
    object.background = (sceneProps.background as three.Color);
  }
};
