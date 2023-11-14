import { act, recon } from "./deps.ts";

export const div = Symbol('div');
export const span = Symbol('span');
export const h1 = Symbol('h1');
export const h2 = Symbol('h2');
export const h3 = Symbol('h3');

export const createWebRenderer = (rootDomNode: Node, rootActNode: act.Node) => {
  const commits = new Map<recon.CommitID, recon.Commit>();

  const elementsByCommit = new Map<recon.CommitID, null | Node>();
  const commitsByElement = new Map<Node, recon.CommitRef>();

  const rootId = act.createId<"CommitID">();
  const rootRef = { id: rootId, path: [rootId] };

  const createDOMElement = (element: act.Element) => {
    switch (typeof element.type) {
      case 'function':
        return null;
    }
    switch (element.type) {
      case div:
        return document.createElement('div');
      case act.primitiveNodeTypes.string:
        return document.createTextNode(element.props.value as string);
      default:
        throw new Error(`Unsupported element ${element.type.toString()}`)
    }
  };
  const setDOMElementProps = (domElement: Node, actElement: act.Element) => {
    if (domElement instanceof Text)
      if (domElement.textContent !== actElement.props.value)
        domElement.textContent = actElement.props.value as string;
  }

  const resolveRefsToElements = (refs: recon.CommitRef[]): Node[] => {
    return refs.flatMap(ref => {
      const childElement = elementsByCommit.get(ref.id);
      if (childElement)
        return [childElement];
      const childCommit = commits.get(ref.id);
      if (childCommit)
        return resolveRefsToElements(childCommit.children);
      return [];
    });
  }

  const mountNodeIntoDom = (node: Node, refs: recon.CommitRef[]) => {
    const children = resolveRefsToElements(refs);
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const childInIndex = node.childNodes[i];
      if (child !== childInIndex) {
        node.appendChild(child);
      }
    }
  }

  const effectMagager = recon.createEffectManager();
  const stateManager = recon.createStateManager(effectMagager, ref => {
    threadManager.requestRender(ref);
  });
  const deltaManager = recon.createDeltaManager(stateManager, commits)

  const threadManager = recon.createThreadManager(deltaManager, commits, rootRef, act.convertNodeToElement(rootActNode), (thread) => {
    const needsReordering = new Set<[Node, recon.Commit]>();

    for (const { prev, next, ref } of thread.completedDeltas) {
      const domElement = elementsByCommit.get(ref.id) || (next && createDOMElement(next.element));
      if (!prev && next && domElement) {
        needsReordering.add([domElement, next]);
        elementsByCommit.set(ref.id, domElement)
        commitsByElement.set(domElement, ref);
        if (ref.id === rootId) {
          mountNodeIntoDom(rootDomNode, [next])
        }
      }
      else if (prev && !next) {
        if (domElement && domElement.parentNode) {
          const parentCommitRef = commitsByElement.get(domElement.parentNode);
          const parentCommit = parentCommitRef && commits.get(parentCommitRef.id);
          if (parentCommit)
            needsReordering.add([domElement.parentNode, parentCommit]);
          domElement.parentNode.removeChild(domElement)
          elementsByCommit.delete(ref.id);
          commitsByElement.delete(domElement);
        }
      }
      else if (prev && next && domElement) {
        setDOMElementProps(domElement, next.element)
      }
    }

    for (const [elementToReorder, commit] of needsReordering) {
      mountNodeIntoDom(elementToReorder, commit.children);
    }

    // Always remount the root - its easier than
    // figuring out when it changes
    const rootCommit = commits.get(thread.root.id);
    if (rootCommit)
      mountNodeIntoDom(rootDomNode, [rootCommit])

    for (const effect of thread.pendingEffects)
      effect.task();
  });
  threadManager.requestRender(rootRef);

  //const tree = recon.createTree(threadManager, commits);
  //tree.mount(rootActNode);

  //return tree;
};