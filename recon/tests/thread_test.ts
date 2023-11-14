import { act } from "../deps.ts";
import { Commit, CommitID, WorkThread, createDeltaManager, createStateManager, createThreadManager } from "../mod.ts";

const { h } = act

Deno.test("ThreadManager", () => {
  const commits = new Map<CommitID, Commit>();
  const stateManager = createStateManager();
  const deltaManager  = createDeltaManager(stateManager, commits);
  const threadManager = createThreadManager(deltaManager, commits);

  const App = ({ enabled = true }) => {
    if (!enabled)
      return null;
    return h("MyComponent", {}, h("MyChild!"))
  }
  const id = act.createId<"CommitID">();
  const ref = { id, path: [id] };

  type Tree = string | Tree[];

  const logTree = (id: CommitID): Tree[] => {
    const commit = commits.get(id);
    if (!commit)
      return [];
    if (typeof commit.element.type === 'string')
      return [commit.element.type, commit.children.map(r => logTree(r.id))]

    if (typeof commit.element.type === 'function')
      return [commit.element.type.name, commit.children.map(r => logTree(r.id))]
    return commit.children.map(r => logTree(r.id));
  }

  let thread: WorkThread = {
    root: ref,
    pendingUpdates: [
      { next: h(App, { enabled: true }), prev: null, ref, targets: [] }
    ],
    completedDeltas: [],
  };

  threadManager.syncThread(thread);
  threadManager.applyThread(thread);
  //console.log(logTree(id))

  thread = {
    root: ref,
    pendingUpdates: [
      { next: h(App, { enabled: false }), prev: commits.get(id) || null, ref, targets: [] }
    ],
    completedDeltas: [],
  };

  threadManager.syncThread(thread);
  threadManager.applyThread(thread);
  //console.log(logTree(id))

  thread = {
    root: ref,
    pendingUpdates: [
      { next: h(App, { enabled: true }), prev: commits.get(id) || null, ref, targets: [] }
    ],
    completedDeltas: [],
  };

  threadManager.syncThread(thread);
  threadManager.applyThread(thread);
  //console.log(logTree(id))
});