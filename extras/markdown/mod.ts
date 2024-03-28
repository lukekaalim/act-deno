import { Nodes } from 'mdast';
import { hs } from '@lukekaalim/act-web/mod.ts';
import { Node } from '@lukekaalim/act/mod.ts';
// Add in the ambient types
import "micromark-extension-gfm";

export const createMarkdownActNodesForChildren = (nodes: Nodes[], spread: boolean = false) => {
  return nodes.map(n => createMarkdownActNodes(n, spread))
}

export const createMarkdownActNodes = (node: Nodes, spread: boolean = false): Node => {
  switch (node.type) {
    case 'list':
      return hs(node.ordered ? 'ol' : 'ul', {},
        createMarkdownActNodesForChildren(node.children, node.spread || false));
    case 'listItem':
      const displayCheckbox = typeof node.checked === 'boolean';
      return hs('li', {}, [
        displayCheckbox && hs('input', { type: 'checkbox', checked: node.checked, disabled: true }),
        createMarkdownActNodesForChildren(node.children, displayCheckbox)
      ]);
    case 'text':
      return node.value;
    case 'paragraph':
      return hs('p', {
        style: spread && { display: 'inline-block', margin: 0 } || {} },
        createMarkdownActNodesForChildren(node.children));
    case 'heading':
      return hs(`h1`, {}, createMarkdownActNodesForChildren(node.children));
    case 'code':
      return hs('pre', {}, node.value);
    case 'root':
      return createMarkdownActNodesForChildren(node.children);
    default:
      return 'Unsupported Node Type'
  }
}