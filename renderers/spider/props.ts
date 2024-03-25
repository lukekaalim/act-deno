import { act, recon } from "./deps";

export const setProps = (
  node: HTMLElement | SVGElement,
  
  next: act.Element,
  prev: null | act.Element
) => {
  if (node instanceof HTMLElement) {
    setHTMLElementProps(node, next, prev);
  }
  if (node instanceof SVGElement) {

  }
}

export const setHTMLElementProps = (
  node: HTMLElement,
  
  next: act.Element,
  prev: null | act.Element
) => {
  setPropObject(node as any, next.props, prev && prev.props, (name, next, prev) => {
    if (name.startsWith('on')) {
      const eventName = name.slice(2).toLocaleLowerCase();
      setEventProp(node as any, eventName, next, prev);
      return true;
    }
    switch (name) {
      case 'ref':
        (next as any).current = node;
        return true;
      case 'style':
        return (setStyleProp(node.style, next as any, prev as any), true);
      case 'className':
        node.className = next as string;
        return true;
      case 'classList':
        const classNames = (next as string[]).filter(Boolean).join(' ');
        node.className = classNames;
        return true;
      default:
        return false;
    }
  })
}

export const setEventProp = (
  node: EventSource,
  type: string,
  next: unknown,
  prev: unknown,
) => {
  if (prev === next)
    return;
  if (prev) {
    node.removeEventListener(type, prev as any)
  }
  if (next) {
    node.addEventListener(type, next as any)
  }
}

export const setStyleProp = (
  node: CSSStyleDeclaration,
  style: null | Record<keyof CSSStyleDeclaration, string | number>,
  prevStyle: null | Record<keyof CSSStyleDeclaration, string | number>,
) => {
  setPropObject(node as any, style, prevStyle)
}

const setPropObject = (
  target: Record<string, unknown>,
  next: null | Record<string, unknown>,
  prev: null | Record<string, unknown>,
  assign: null | ((name: string, next: unknown, prev: unknown) => boolean) = null, 
) => {
  const names = new Set([
    ...Object.keys(next || {}),
    ...Object.keys(prev || {})
  ]);

  for (const name of names) {
    const nextValue = (next || {})[name];
    const successfulAssign = assign && assign(name, nextValue, (prev || {})[name]);
    if (!successfulAssign) {
      if (target[name] !== nextValue) {
        target[name] = nextValue;
      }
    }
  }
}