import { h } from "@lukekaalim/act";
import { createWebSpace, HTML } from "./space";
import { createRenderFunction, RenderFunction, Scheduler } from "@lukekaalim/act-backstage";

const intervalScheduler: Scheduler<number> = {
  duration: 10,
  request: func => setInterval(func, 10),
  cancel: id => clearInterval(id),
}

export const render: RenderFunction<HTMLElement> = (node, root) => 
  createRenderFunction(intervalScheduler, createWebSpace)(h(HTML, {}, node), root);
