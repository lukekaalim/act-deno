import { Component, Element, h, useEffect, useState } from '@lukekaalim/act';
import { Commit, CommitID, CommitTree, Reconciler, Update, WorkThread } from '@lukekaalim/act-recon';
import { hs } from '@lukekaalim/act-web';

import { TreeViewer } from './TreeViewer';

import { debounce } from 'lodash-es'
import { getElementName } from './utils';
import { CommitViewer } from './CommitViewer';
import classes from './InsightApp.module.css';
import { InsightMode } from './mode';
import { MenuBar } from './MenuBar';

export type InsightAppProps = {
  reconciler: Reconciler,
  onReady: () => void,
}

export const InsightApp: Component<InsightAppProps> = ({ reconciler, onReady }) => {
  const [mode, setMode] = useState<InsightMode>('tree');

  const [renderReportIndex, setRenderReportIndex] = useState(0);
  const [renderReports, setRenderReports] = useState<WorkThread[]>([]);
  const [tree, setTree] = useState<null | CommitTree>(null);

  const [currentThread, setCurrentThread] = useState<WorkThread | null>(null);

  const currentReport = renderReports[renderReportIndex] || null;
  const rootCommits = tree && CommitTree.getRootCommits(tree) || [];

  const [pendingWork, setPendingWork] = useState(false)
  const [autoWork, setAutoWork] = useState(true);

  //const [counter, setCounter] = useState(0);

  useEffect(() => {

    const updateThread = debounce(() => {
      const currentThread = reconciler.scheduler.getCurrentThread();
      if (currentThread)
        setCurrentThread(WorkThread.clone(currentThread));
      else
        setCurrentThread(null);
    }, 100, { leading: true, trailing: true, maxWait: 100 });

    const renderSub = reconciler.on('render', (thread) => {
      setRenderReports(rrs => [...rrs, WorkThread.clone(thread)])
      setTree(reconciler.tree);
      updateThread();
    });
    reconciler.on('request-work', () => {
      updateThread();
      setPendingWork(true);
    })
    reconciler.on('thread-queued', () => {
      updateThread();
    })
    reconciler.on('complete-work', () => {
      updateThread();
    })

    onReady();
    return () => {
      renderSub.cancel();
    }
  }, [])

  useEffect(() => {
    if (autoWork) {
      const id = setInterval(() => {
        reconciler.work();
      }, 5);
      return () => clearInterval(id);
    }
  }, [autoWork, reconciler])

  const onWorkClick = () => {
    setPendingWork(false);
    reconciler.work();
  }
  const onToggleAutoWork = (e: Event) => {
    setAutoWork((e.target as HTMLInputElement).checked);
  }

  const [selectedCommit, setSelectedCommit] = useState<null | CommitID>(null);
  const onSelectCommit = (id: CommitID) => {
    if (selectedCommit === id)
      setSelectedCommit(null)
    else
      setSelectedCommit(id)
  }

  return h('div', {}, [
    h(MenuBar, { currentMode: mode, onSelectMode: setMode }),
    mode === 'thread' && hs('div', {}, [
      hs('button', { onClick: onWorkClick }, pendingWork ? 'Do Pending Work' : 'Work'),
      hs('label', {}, [
        hs('span', {}, 'Toggle Auto-Work'),
        hs('input', { type: 'checkbox', onInput: onToggleAutoWork, checked: autoWork }),
      ])
    ]),
    mode === 'thread' && currentThread && [
      hs('h3', {}, 'Fibers'),
      hs('ul', {}, [...currentThread.pendingUpdates].map((update) => hs('li', {}, h(UpdateDesc, { update })))),
      hs('h3', {}, 'Visited'),
      hs('ul', {}, [...currentThread.visited].map(([id, ref]) => hs('li', {}, id))),
      hs('h3', {}, 'Must Visit'),
      hs('ul', {}, [...currentThread.mustVisit].map(([id, ref]) => hs('li', {}, id))),
      hs('h3', {}, 'Must Render'),
      hs('ul', {}, [...currentThread.mustRender].map(([id, ref]) => hs('li', {}, id))),
      hs('h3', {}, 'Created'),
      hs('ul', {}, currentThread.deltas.created.map(delta => hs('li', {}, [delta.next.id,' ', getElementName(delta.next.element)]))),
      hs('h3', {}, 'Removed'),
      hs('ul', {}, currentThread.deltas.removed.map(delta => hs('li', {}, [delta.ref.id,' ', getElementName(delta.prev.element)]))),
      hs('h3', {}, 'Updated'),
      hs('ul', {}, currentThread.deltas.updated.map(delta => hs('li', {}, [delta.next.id,' ', getElementName(delta.next.element)]))),
      hs('h3', {}, 'Reasons'),
      hs('ul', {}, currentThread.reasons.map(reason => hs('li', {}, [
        reason.type === 'mount' && `MOUNT ${getElementName(reason.element)}`,
        reason.type === 'target' && `TARGET ${reason.ref.id}`,
      ]))),
    ],
    //hs('pre', {}, counter),
    mode === 'tree' && hs('div', { className: classes.treeExplorer }, [
      tree && [
        h(TreeViewer, { tree, selectedCommits: new Set(selectedCommit ? [selectedCommit] : []), onSelectCommit }),
      ],
      selectedCommit && tree && [
        h(CommitViewer, { tree, commitId: selectedCommit, reconciler })
      ]
    ])
  ]);
};

const UpdateDesc = ({ update }: { update: Update }) => {
  if (update.prev && update.next)
    return `Update ${update.ref.id} (${getElementName(update.next)})`;
  if (update.prev && !update.next)
    return `Destroy ${update.ref.id} (${getElementName(update.prev.element)})`;
  if (!update.prev && update.next)
    return `Create ${update.ref.id} (${getElementName(update.next)})`;
  return `???`;
}

export type CommitTreeLeafProps = {
  commit: Commit,
  tree: CommitTree,
}

const CommitTreeLeaf: Component<CommitTreeLeafProps> = ({ commit, tree }) => {
  return [
    hs('pre', {}, [getElementName(commit.element), ` id=${commit.id} v=${commit.version}`]),
    hs('ul', {}, commit.children
      .map(ref => tree.commits.get(ref.id) as Commit)
      .map(commit => h(CommitTreeLeaf, { commit, tree })))
  ];
}
