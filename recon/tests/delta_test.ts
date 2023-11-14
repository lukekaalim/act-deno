import { assertEquals } from "https://deno.land/std@0.204.0/assert/mod.ts";
import { act } from "../deps.ts";
import {
  Commit,
  createDeltaManager,
  createStateManager,
  Update,
} from "../mod.ts";

Deno.test("DeltaManager create new Update", () => {
  const commits = new Map();
  const state = createStateManager();

  const deltaManager = createDeltaManager(state, commits);

  const id = act.createId<"CommitID">();
  const ref = { id, path: [id] };

  const element = act.h("MyNewElement");

  const update: Update = {
    ref,
    prev: null,
    next: element,
    targets: [],
  };

  const [delta, childUpdates] = deltaManager.applyUpdate(update);
  assertEquals(childUpdates, [], "Element has no children");
  assertEquals(delta && !!delta.next, true);
});

Deno.test("DeltaManager update existing commit", () => {
  const commits = new Map();
  const state = createStateManager();

  const deltaManager = createDeltaManager(state, commits);

  const id = act.createId<"CommitID">();
  const version = act.createId<"CommitVersion">();
  const prevElement = act.h("MyNewElement", { myProp: true });
  const nextElement = act.h("MyNewElement", { myProp: false });
  const commit: Commit = {
    id,
    path: [id],
    element: prevElement,
    version,
    children: [],
  };

  const update: Update = {
    ref: commit,
    prev: commit,
    next: nextElement,
    targets: [],
  };

  const [delta, childUpdates] = deltaManager.applyUpdate(update);
  assertEquals(childUpdates, [], "Element has no children");
  assertEquals(delta && (delta.next !== delta.prev), true);
  assertEquals(delta && delta.next && delta.next.element, nextElement);
});

Deno.test("DeltaManager no change", () => {
  const commits = new Map();
  const state = createStateManager();

  const deltaManager = createDeltaManager(state, commits);

  const id = act.createId<"CommitID">();
  const version = act.createId<"CommitVersion">();
  const element = act.h("MyNewElement", { myProp: true });
  const commit: Commit = {
    id,
    path: [id],
    element,
    version,
    children: [],
  };

  const update: Update = {
    ref: commit,
    prev: commit,
    next: element,
    targets: [],
  };

  const [delta, childUpdates] = deltaManager.applyUpdate(update);
  assertEquals(childUpdates, [], "Element has no children");
  assertEquals(!!delta, false, "Elements are equal, there is no change");
});

Deno.test("DeltaManager destroy element", () => {
  const commits = new Map();
  const state = createStateManager();

  const deltaManager = createDeltaManager(state, commits);

  const id = act.createId<"CommitID">();
  const version = act.createId<"CommitVersion">();
  const element = act.h("MyNewElement", { myProp: true });
  const commit: Commit = {
    id,
    path: [id],
    element,
    version,
    children: [],
  };

  const update: Update = {
    ref: commit,
    prev: commit,
    next: null,
    targets: [],
  };

  const [delta, childUpdates] = deltaManager.applyUpdate(update);
  assertEquals(childUpdates, [], "Element has no children");
  assertEquals(delta && delta.next === null, true);
});
