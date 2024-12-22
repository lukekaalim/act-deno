import { noop } from 'lodash-es';

import { describe, it } from "node:test";
import { CommitTree } from "./tree";
import { WorkThread } from "./thread";
import { ComponentService } from "./component";
import { applyUpdate } from "./delta";
import { Update } from "./update";
import { Commit } from "./commit";
import { createId, h } from "@lukekaalim/act";
import { equal } from "node:assert/strict";

describe('delta library', () => {
  it('should create a delete delta for a node, and queue its children to be deleted', () => {
    const tree = CommitTree.new();
    const thread = WorkThread.new();

    const prev = Commit.new(h('element'))

    tree.commits.set(prev.id, prev);

    const comp = ComponentService.create(noop);
    const update = Update.remove(prev);

    applyUpdate(tree, comp, thread, update);

    equal(thread.deltas.removed.length, 1);
  })
})