import { act, recon } from "./deps.ts";

const htmlTagNames = new Set([
  "div", "span",
  "img", "picture", "canvas",
  "details", "summary", "section",
  "video", "audio",
  "h1", "h2", "h3", "h4", "h5", "h6",
  'p',
  "ol", "ul", "li",
  "table",
  "pre",

  "form", "input", "label", "button", "select", "textarea",
] as const);
const svgTagName = new Set([
  "svg",
  "line",
  "path",
  "polyline",
  "circle",
  "rect",
  "g",
  "text",
] as const);
type SetValue<T extends Set<string>> = T extends Set<infer X> ? X : never;

export type HTMLTagName = SetValue<typeof htmlTagNames>;
export type SVGTagName = SetValue<typeof svgTagName>;

export const el = {
  ...Object.fromEntries([...htmlTagNames].map(t => [t, t])),
  ...Object.fromEntries([...svgTagName].map(t => [t, t])),
} as Record<HTMLTagName | SVGTagName, HTMLTagName | SVGTagName>;


export const createWebRenderer = (
  rootDomNode: Node,
  rootActNode: act.Node,
  onThread: (thread: recon.WorkThread) => unknown = () => {}
) => {
  const commits = new Map<recon.CommitID, recon.Commit>();

  const elementsByCommit = new Map<recon.CommitID, null | Node>();
  const commitsByElement = new Map<Node, recon.CommitRef>();

  const rootId = act.createId<"CommitID">();
  const rootRef = { id: rootId, path: [rootId] };

  const createDOMElement = (element: act.Element) => {
    switch (typeof element.type) {
      case "function":
        return null;
    }
    if (htmlTagNames.has(element.type as HTMLTagName)) {
      return document.createElementNS('http://www.w3.org/1999/xhtml', (element.type as HTMLTagName));
    }
    if (svgTagName.has(element.type as SVGTagName)) {
      return document.createElementNS("http://www.w3.org/2000/svg", (element.type as SVGTagName));
    }
    switch (element.type) {
      case act.primitiveNodeTypes.string:
      case act.primitiveNodeTypes.number:
        return document.createTextNode(element.props.value as string);
      case act.primitiveNodeTypes.array:
      case act.primitiveNodeTypes.boolean:
      case act.primitiveNodeTypes.null:
        return null;
      default:
        throw new Error(`Unsupported element ${element.type.toString()}`);
    }
  };

  const setRefProps = (domElement: Node, next: act.Element | null, prev: act.Element | null) => {
    if (next)
      if (next.props.ref) {
        (next.props.ref as any).current = domElement;
      }
    if (!next && prev) {
      prev.props.ref = null;
    }
  }

  const setDOMElementProps = (domElement: Node, next: null | act.Element, prev: null | act.Element) => {
    if (domElement instanceof Text)
      if (next)
        if (domElement.textContent !== next.props.value)
          domElement.textContent = next.props.value as string;

    if (domElement instanceof HTMLElement) {
      if (prev)
        for (const [name, value] of Object.entries(prev.props)) {
          if (name.startsWith('on')) {
            const eventName = name.slice(2);
            domElement.removeEventListener(eventName.toLowerCase(), (value as any));
          }
        }
      if (next)
        for (const [name, value] of Object.entries(next.props)) {
          if (name === 'ref')
            continue;
          if (name.startsWith('on')) {
            const eventName = name.slice(2);
            domElement.addEventListener(eventName.toLowerCase(), (value as any));
          } else if (name === 'style') {
            for (const [styleName, styleValue] of Object.entries((value as any)))
              (domElement.style as Record<any, any>)[styleName] = styleValue;
          } else {
            (domElement as Record<any, any>)[name] = value;
          }
        }
    }
    if (domElement instanceof SVGElement) {
      if (next)
        for (const [name, value] of Object.entries(next.props)) {
          if (name === 'ref')
            continue;
          if (name === 'style') {
            for (const [styleName, styleValue] of Object.entries((value as any)))
              (domElement.style as Record<any, any>)[styleName] = styleValue;
            continue;
          }
          domElement.setAttribute(name, (value as any));
        }
    }
    
    setRefProps(domElement, next, prev);
  };

  const resolveRefsToElements = (refs: recon.CommitRef[]): Node[] => {
    return refs.flatMap((ref) => {
      const childElement = elementsByCommit.get(ref.id);
      if (childElement) return [childElement];
      const childCommit = commits.get(ref.id);
      if (childCommit) return resolveRefsToElements(childCommit.children);
      return [];
    });
  };

  const mountNodeIntoDom = (node: Node, refs: recon.CommitRef[]) => {
    const children = resolveRefsToElements(refs);
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const childInIndex = node.childNodes[i];
      if (child !== childInIndex) {
        node.appendChild(child);
      }
    }
  };

  const findParentElement = (commit: recon.Commit): null | [Node, recon.Commit] => {
    for (const id of [...commit.path].reverse().slice(1)) {
      const el = elementsByCommit.get(id);
      const c = commits.get(id);
      if (el && c)
        return [el, c];
    }
    const rootCommit = commits.get(rootId);
    if (!rootCommit)
      throw new Error();
    return [rootDomNode, rootCommit];
  }

  const effectMagager = recon.createEffectManager();
  const stateManager = recon.createStateManager(effectMagager, (ref) => {
    setTimeout(() => {
      threadManager.requestRender(ref);
    }, 0);
  });
  const deltaManager = recon.createDeltaManager(stateManager, commits);

  const threadManager = recon.createThreadManager(
    deltaManager,
    commits,
    rootRef,
    act.convertNodeToElement(rootActNode),
    (thread) => {
      const needsReordering = new Set<[Node, recon.Commit]>();

      for (const { prev, next, ref } of thread.completedDeltas) {
        const domElement =
          elementsByCommit.get(ref.id) ||
          (next && createDOMElement(next.element));
        
        if (!prev && next && domElement) {
          const parentElement = findParentElement(next);
          if (parentElement)
            needsReordering.add(parentElement);

          elementsByCommit.set(ref.id, domElement);
          commitsByElement.set(domElement, ref);
          setDOMElementProps(domElement, next.element, null);
          if (ref.path.length === 1) {
            mountNodeIntoDom(rootDomNode, [next]);
          }
        } else if (prev && !next) {
          if (domElement && domElement.parentNode) {
            const parentCommitRef = commitsByElement.get(domElement.parentNode);
            const parentCommit =
              parentCommitRef && commits.get(parentCommitRef.id);
            if (parentCommit)
              needsReordering.add([domElement.parentNode, parentCommit]);
            domElement.parentNode.removeChild(domElement);
            elementsByCommit.delete(ref.id);
            commitsByElement.delete(domElement);
          }
        } else if (prev && next && domElement) {
          setDOMElementProps(domElement, next.element, prev.element);
        }

        if (next)
          commits.set(ref.id, next);
        else
          commits.delete(ref.id);
      }

      for (const [elementToReorder, commit] of needsReordering) {
        mountNodeIntoDom(elementToReorder, commit.children);
      }

      for (const effect of thread.pendingEffects) effect.task();

      onThread && onThread(thread);
    }
  );

  threadManager.requestRender(rootRef);

  return {
    commits,
  }
};
