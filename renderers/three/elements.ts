import { DirectionalLight, Group, Line, LineLoop, LineSegments, Mesh, Object3D, OrthographicCamera, PerspectiveCamera, PointLight, Points, Scene, SkinnedMesh, Sprite } from "three";
import { act } from "./deps";
import { Object3DProps, setProps } from "./props";
import { Component, ElementType, h, Node } from "@lukekaalim/act";

const handlers = new Map<string | Symbol, ThreeNodeHandler<any>>();

export type ThreeNodeHandler<T extends Object3D> = {
  type: string | Symbol,
  create: (props: act.Props) => T,
  setProps: (instance: T, prevProps: null | act.Props, nextProps: act.Props) => unknown,
}

export const registerElementHandler = <T extends Object3D>(handler: ThreeNodeHandler<T>): void => {
  handlers.set(handler.type, handler);
}

export const getElementHandler = (type: act.ElementType): null | ThreeNodeHandler<Object3D> => {
  if (typeof type === 'string' || typeof type === 'symbol') {
    const handler = handlers.get(type);
    if (handler)
      return handler;
  }
  return null;
}

export type Newable<T> = { new (): T; };

export const addSimpleElement = <T extends Object3D>(type: string | symbol, ElementClass: Newable<T>) => {
  registerElementHandler<T>({
    type,
    create() {
      return new ElementClass();
    },
    setProps(instance, prevProps, nextProps) {
      setProps(instance, nextProps as Object3DProps<T>);
    },
  })
}

const elementMap = {
  mesh: Mesh,
  points: Points,
  group: Group,
  scene: Scene,
  sprite: Sprite,
  skinnedMesh: SkinnedMesh,

  pointLight: PointLight,
  directionalLight: DirectionalLight,

  line: Line,
  lineLoop: LineLoop,
  lineSegments: LineSegments,

  perspectiveCamera: PerspectiveCamera,
  orthographicCamera: OrthographicCamera,
} as const;
type ElementMap = typeof elementMap;

for (const key in elementMap) {
  addSimpleElement(key, elementMap[key as keyof ElementMap] as any)
}

type ElementNodes = {
  readonly [key in keyof ElementMap]: Component<Object3DProps<InstanceType<ElementMap[key]>>>
};

export const node: ElementNodes = Object.fromEntries(Object.keys(elementMap).map(k => [k, k as ElementType])) as ElementNodes;
