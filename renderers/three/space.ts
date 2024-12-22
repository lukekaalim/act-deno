import { createSimpleRenderSpace } from "@lukekaalim/act-backstage/mod.ts"
import { act, recon, three } from "./deps"
import { setProps } from "./props";
import { primitiveNodeTypes } from "@lukekaalim/act";

export const ThreeJS: act.Component = ({ children }) => act.h(primitiveNodeTypes.render, { type: 'threejs' }, children)

export const createFinaleSpace = (tree: recon.CommitTree) => {
  return createSimpleRenderSpace(tree, {
    rootTypes: new Set(['threejs']),
    create(element) {
      switch (element.type) {
        case 'mesh':
          return new three.Mesh();
        case 'perspectivecamera':
          return new three.PerspectiveCamera();
        case 'scene':
          return new three.Scene();
        default:
          return null;
      }
    },
    update(el, next, prev) {
      setProps(el, next.props);
    },
    link(el, parent) {
      parent && parent.add(el)
    },
    destroy(el) {
      if (el.parent)
        el.removeFromParent()
    },
  })
}

export const finale = createFinaleSpace;