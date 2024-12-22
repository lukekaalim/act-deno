import { noop } from 'lodash-es';

import { describe, it } from "node:test";
import { CommitTree } from "./tree";
import { WorkThread } from "./thread";
import { ComponentService } from "./component";
import { applyUpdate } from "./delta";
import { Update } from "./update";
import { Commit, CommitRef } from "./commit";
import { h } from "@lukekaalim/act";
import { equal } from "node:assert/strict";

describe('delta library', () => {

  describe('generated deltas', () => {
    it('should make a create delta if there is no prev', () => {
      const tree = CommitTree.new();
      const comp = ComponentService.create(noop);

      const thread = WorkThread.new();
      const element = h('test-element');
      const ref = CommitRef.new();
      const update = Update.fresh(ref, element);

      applyUpdate(tree, comp, thread, update);

      equal(thread.deltas.created.length, 1);
      const delta = thread.deltas.created[0];
      equal(delta.next.element, element);
      equal(delta.next.id, ref.id);
      equal(delta.next.path, ref.path);
    })
    it('should not make any deltas if the prev and next are the same (and there is no targets)', () => {
      const tree = CommitTree.new();
      const comp = ComponentService.create(noop);

      const thread = WorkThread.new();
      const element = h('test-element');
      const prev = Commit.new(element);
      const update = Update.existing(prev, element);
      tree.commits.set(prev.id, prev);

      applyUpdate(tree, comp, thread, update);

      equal(thread.deltas.created.length, 0);
      equal(thread.deltas.updated.length, 0);
      equal(thread.deltas.removed.length, 0);
      equal(thread.deltas.skipped.length, 0);
    })
    it('should make a skip delta if the prev and the next are the same, but there is a target', () => {
      const tree = CommitTree.new();
      const comp = ComponentService.create(noop);

      const thread = WorkThread.new();
      const element = h('test-element');
      const prev = Commit.new(element);
      // an imaginary child
      const target = CommitRef.new(prev.path);

      const update = Update.existing(prev, element);
      update.targets.push(target);
      tree.commits.set(prev.id, prev);

      applyUpdate(tree, comp, thread, update);

      equal(thread.deltas.skipped.length, 1);
    })
  })

  it('should create a delta for a new id, and queue its children for creation', () => {
    const tree = CommitTree.new();
    const comp = ComponentService.create(noop);
    const thread = WorkThread.new();
    const childA = h('child-element-a');
    const childB = h('child-element-b');
    const element = h('new-element', {}, [childA, childB]);

    const update = Update.fresh(Commit.new(element), element);
    applyUpdate(tree, comp, thread, update);

    equal(thread.deltas.created.length, 1);
    equal(thread.pendingUpdates.length, 2);
    
    const delta = thread.deltas.created[0];
    const updateA = thread.pendingUpdates[0];
    const updateB = thread.pendingUpdates[1];

    equal(delta.next.element, element);
    equal(updateA.next, childA);
    equal(updateB.next, childB);
  })
  it('should create a delete delta for a node, and queue its children to be deleted', () => {
    const tree = CommitTree.new();
    const comp = ComponentService.create(noop);
    const thread = WorkThread.new();

    const prev = Commit.new(h('element'))

    tree.commits.set(prev.id, prev);

    const update = Update.remove(prev);

    applyUpdate(tree, comp, thread, update);

    equal(thread.deltas.removed.length, 1);
  })

})