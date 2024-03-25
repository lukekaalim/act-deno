import { Nodes } from 'mdast';
import { hs } from '@lukekaalim/act-spider/mod.ts';
import { Node } from '@lukekaalim/act/mod.ts';

export const createMarkdownActNodes = (node: Nodes): Node => {
  switch (node.type) {
    case 'text':
      return node.value;
    case 'paragraph':
      return hs('p', {}, node.children.map(createMarkdownActNodes));
    case 'heading':
      return hs(`h1`, {}, node.children.map(createMarkdownActNodes));
    case 'code':
      return hs('pre', {}, node.value);
    case 'root':
      return node.children.map(createMarkdownActNodes);
    default:
      return 'Unsupported Node Type'
  }
}