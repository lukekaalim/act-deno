import { createSimpleRenderSpace } from "@lukekaalim/act-backstage/mod.ts"
import { act, recon, three } from "./deps"
import { setProps } from "./props";
import { primitiveNodeTypes, renderNodeType } from "@lukekaalim/act";
import { getElementHandler } from "./elements";

export const ThreeJS: act.Component = ({ children }) => act.h(renderNodeType, { type: 'threejs' }, children)

export const createFinaleSpace = (tree: recon.CommitTree) => {
  return createSimpleRenderSpace(tree, {
    rootTypes: new Set(['threejs']),
    create(element) {
      const handler = getElementHandler(element.type);
      if (handler)
        return handler.create(element.props);
      return null;
    },
    update(el, next, prev) {
      const handler = getElementHandler(next.type);
      if (handler)
        handler.setProps(el, prev && prev.props, next.props);
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