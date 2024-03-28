import { finale } from '@lukekaalim/act-three/mod.ts';
import { spider, hs } from '@lukekaalim/act-web/mod.ts';
import { multi } from '@lukekaalim/act-backstage/mod.ts';
import * as act from '@lukekaalim/act/mod.ts';
import { createReconciler } from '@lukekaalim/act-recon/mod.ts';

import { fromMarkdown } from 'mdast-util-from-markdown';
import classes from './index.module.css';
import readme from './readme.md?raw';
import { createMarkdownActNodes } from '../extras/markdown/mod';

import { unified } from 'unified';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse'

const { h } = act;

const markdown = unified()
  .use(remarkParse)
  .use(remarkGfm)

const DocsApp: act.Component = () => {
  return hs('article', { className: classes.page }, 
    createMarkdownActNodes(markdown.parse(readme)))
}

createReconciler(h(DocsApp), multi([spider(), finale()]));
