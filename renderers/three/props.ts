import { act, three } from "./deps";

export const setProps = (object: three.Object3D, props: act.Element["props"]) => {
  if (props.position)
    object.position.copy(props.position as three.Vector3);
  if (props.scale)
    object.scale.copy(props.scale as three.Vector3);
  if (props.quaternion)
    object.quaternion.copy(props.quaternion as three.Quaternion);
  if (props.ref)
    (props.ref as Record<string, unknown>).current = object;
  
  if (object instanceof three.Mesh) {
    object.geometry = props.geometry;
    object.material = props.material;
  }
  if (object instanceof three.PerspectiveCamera) {
    object.updateProjectionMatrix();
  }
  if (object instanceof three.Scene) {
    object.background = (props.background as three.Color);
  }
};