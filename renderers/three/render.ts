import { createRenderFunction, RenderSpace, Scheduler } from "@lukekaalim/act-backstage";
import { createWebSpace } from '@lukekaalim/act-web';
import { createFinaleSpace } from "./space";

const intervalScheduler: Scheduler<number> = {
  duration: 10,
  request: func => setInterval(func, 10),
  cancel: id => clearInterval(id),
}

export const render = createRenderFunction<number, HTMLElement>(intervalScheduler, (tree, root) => RenderSpace.combine([
  createWebSpace(tree, root),
  createFinaleSpace(tree),
]));
