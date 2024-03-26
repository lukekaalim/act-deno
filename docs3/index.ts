import { finale } from '@lukekaalim/act-finale/mod.ts';
import { spider, hs } from '@lukekaalim/act-spider/mod.ts';
import { multi } from '@lukekaalim/act-backstage/mod.ts';
import * as act from '@lukekaalim/act/mod.ts';
import { createReconciler } from '@lukekaalim/act-recon/mod.ts';

import { fromMarkdown } from 'mdast-util-from-markdown';
import classes from './index.module.css';
import readme from './readme.md?raw';
import { createMarkdownActNodes } from '../extras/markdown/mod';

const { h } = act;

const DocsApp: act.Component = () => {
  return hs('article', { className: classes.page }, 
    createMarkdownActNodes(fromMarkdown(readme)))
}

createReconciler(h(DocsApp), multi([spider(), finale()]));
