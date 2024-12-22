import { createWebSpace } from "./space";
import { createRenderFunction, Scheduler } from "@lukekaalim/act-backstage";

const intervalScheduler: Scheduler<NodeJS.Timeout> = {
  duration: 10,
  request: func => setInterval(func, 10),
  cancel: id => clearInterval(id),
}

export const render = createRenderFunction(intervalScheduler, createWebSpace);
