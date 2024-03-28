import { createSimpleRenderSpace } from '@lukekaalim/act-backstage/mod.ts';
import { htmlTagNames } from './tags.ts';
import { recon } from './deps.ts';
import { primitiveNodeTypes } from '@lukekaalim/act/mod.ts';
import { setProps } from './props.ts';

export const createWebSpace = (document: Document = window.document) => {
  return createSimpleRenderSpace({
    create(element) {
      const tag = element.type as string;
      if (element.type === primitiveNodeTypes.string)
        return document.createTextNode('');
      if (!htmlTagNames.has(tag as any))
        return null;

      return document.createElement(tag);
    },
    update(el, next, prev) {
      setProps(el, next, prev);
    },
    link(el, parent) {
      (parent || document.body).appendChild(el);
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

export const spider = createWebSpace;