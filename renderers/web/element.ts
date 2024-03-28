import { act } from "./deps";
import { HTMLTagName } from "./tags";

type EventMap = {
  onClick: "click",

  onMouseEnter: "mouseenter",
  onMouseMove: "mousemove",
  onMouseLeave: "mouseleave",

  onPointerEnter: "pointerenter",
  onPointerMove: "pointermove",
  onPointerLeave: "pointerleave",

  onKeyDown: "keydown",
  onKeyUp: "keyup",

  onFocus: "focus",
  onBlur: 'blur',

  onInput: "input",
  onChange: "change",
}

type ElementMap = {
  "button": HTMLButtonElement,
  "div": HTMLDivElement,
  "form": HTMLFormElement,
  "input": HTMLInputElement,
  "pre": HTMLPreElement,
  "canvas": HTMLCanvasElement,
}

export const createSpiderElement = <Type extends HTMLTagName>(
  type: Type,
  props?: {
    ref?: act.Ref<null | (Type extends keyof ElementMap ? ElementMap[Type] : HTMLElement)>,
    key?: string | number,
    style?: { [key in keyof CSSStyleDeclaration]?: number | string },
    classList?: readonly (string | boolean | null | void)[],
    className?: string,
  }
    & Record<string, unknown>
    & {
      //[key in keyof HTMLElement]?: HTMLElement[key] extends Function ? never : HTMLElement[key]
    }
    & {
      [key in keyof EventMap]?: (this: HTMLElement, ev: HTMLElementEventMap[EventMap[key]]) => unknown
    },
  children?: act.Node,
): act.Element => {
  return act.createElement(type, props, children)
};

export const hs = createSpiderElement;
