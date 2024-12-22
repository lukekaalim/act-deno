import * as act from '@lukekaalim/act';
import * as recon from '@lukekaalim/act-recon';

import { createSimpleRenderSpace } from '@lukekaalim/act-backstage/mod.ts';

import { setProps } from './props.ts';

export const HTML: act.Component = ({ children }) => act.h(act.primitiveNodeTypes.render, { type: 'web:html' }, children);
export const SVG: act.Component = ({ children }) => act.h(act.primitiveNodeTypes.render, { type: 'web:svg' }, children);

export const createWebSpace = (tree: recon.CommitTree, root: HTMLElement, document: Document = window.document) => {
  return createSimpleRenderSpace(tree, {
    rootTypes: new Set(['web:html', 'web:svg']),
    create(element, rootType) {
      const tag = element.type;
      
      switch (typeof tag) {
        case 'symbol': {
          switch (tag) {
            case act.primitiveNodeTypes.string:
              return document.createTextNode("");
            default:
              return null;
          }
        }
        case 'string': {
          switch (rootType) {
            case 'web:html':
              return document.createElementNS('http://www.w3.org/1999/xhtml', tag);
            case 'web:svg':
              return document.createElementNS('http://www.w3.org/2000/svg', tag);
          }
        }
        default:
          return null;
      }
    },
    update(el, next, prev) {
      setProps(el, next, prev);
    },
    link(el, parent) {
      (parent || root).appendChild(el);
    },
    sort(el, children) {
      if (el instanceof Text)
        return;
      el.replaceChildren(...children);
    },
    destroy(prev) {
      if (prev.parentNode)
        prev.parentNode.removeChild(prev);
    },
  });
};
