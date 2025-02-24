import { Component, h } from "@lukekaalim/act";
import { Commit, CommitID, CommitTree } from "@lukekaalim/act-recon";
import { hs } from "@lukekaalim/act-web";
import { getElementName } from "./utils";
import stringHash from '@sindresorhus/string-hash';

import classes from './TreeViewer.module.css';
import { CommitAttributeTag } from "./AttributeTag";

export type TreeViewerProps = {
  tree: CommitTree,
  
  selectedCommits: Set<CommitID>,
  onSelectCommit?: (id: CommitID) => unknown,
}

export const TreeViewer: Component<TreeViewerProps> = ({ tree, selectedCommits, onSelectCommit = _ => {} }) => {
  const roots = CommitTree.getRootCommits(tree);

  return h('ol', { className: [classes.commitList, classes.top].join(' ') }, roots.map(root =>
    h('li', {}, h(CommitPreview, { commit: root, tree, selectedCommits, onSelectCommit }))));
};

type CommitPreviewProps = {
  commit: Commit,
  tree: CommitTree,

  depth?: number,
  selectedCommits: Set<CommitID>,
  onSelectCommit: (id: CommitID) => unknown,
}

const CommitPreview: Component<CommitPreviewProps> = ({ commit, tree, depth = 0, selectedCommits, onSelectCommit }) => {
  const children = commit.children.map(childRef => tree.commits.get(childRef.id) as Commit);
  const background = `hsl(${(depth * 22.3) % 360}deg, 50%, 80%)`;
  const elementBackground = `hsl(${stringHash(getElementName(commit.element)) % 360}deg, 60%, 80%)`;

  const selected = selectedCommits.has(commit.id);
  const onClick = () => {
    onSelectCommit(commit.id);
  }

  return hs('div', { className: classes.commit, style: { background } }, [
    hs('div', { className: [classes.elementBar, selected && classes.selected].join(' ') }, [
      hs('button', { onClick, className: classes.elementName, style: { background: elementBackground } },
        getElementName(commit.element)),
      h(CommitAttributeTag, { name: 'Id', value: commit.id.toString() }),
      //h(CommitAttributeTag, { name: 'Version', value: commit.version.toString() }),
    ]),
    hs('ol', { className: classes.commitList }, children.map(child =>
      h('li', {}, h(CommitPreview, { commit: child, tree, depth: depth + 1, selectedCommits, onSelectCommit })))),
  ])
};
