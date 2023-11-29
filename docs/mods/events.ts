import { rxjs } from "./deps.ts";

export const createPointerObservables = (current: Element) => {
  const down =  rxjs.fromEvent<PointerEvent>(current, 'pointerdown')
  const up =    rxjs.fromEvent<PointerEvent>(current, 'pointerup')
  const move =  rxjs.fromEvent<PointerEvent>(current, 'pointermove');

  const all = rxjs.merge(down, up, move)

  return { down, up, move, all }
};

export const createTouchObservables = (current: Element) => {
  const start =   rxjs.fromEvent<TouchEvent>(current, 'touchstart')
  const end =     rxjs.fromEvent<TouchEvent>(current, 'touchend')
  const cancel =  rxjs.fromEvent<TouchEvent>(current, 'touchcancel');
  const move =    rxjs.fromEvent<TouchEvent>(current, 'touchmove');

  const all = rxjs.merge(start, move, cancel, end);

  return { start, end, move, cancel, all };
};
