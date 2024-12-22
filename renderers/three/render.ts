import { createRenderFunction, RenderSpace, Scheduler } from "@lukekaalim/act-backstage";
import { createWebSpace } from '@lukekaalim/act-web';
import { createFinaleSpace } from "./space";

const intervalScheduler: Scheduler<NodeJS.Timeout> = {
  duration: 10,
  request: func => setInterval(func, 10),
  cancel: id => clearInterval(id),
}

export const render = createRenderFunction<NodeJS.Timeout, HTMLElement>(intervalScheduler, (tree, root) => RenderSpace.combine([
  createWebSpace(tree, root),
  createFinaleSpace(tree),
]));
