import { Component, Element, h, useEffect, useState } from '@lukekaalim/act';
import { Commit, CommitID, CommitTree, Reconciler, Update, WorkThread } from '@lukekaalim/act-recon';
import { hs } from '@lukekaalim/act-web';

import { TreeViewer } from './TreeViewer';

import { debounce } from 'lodash-es'
import { getElementName } from './utils';

export type InsightAppProps = {
  reconciler: Reconciler,
  onReady: () => void,
}

export const InsightApp: Component<InsightAppProps> = ({ reconciler, onReady }) => {
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

  const [selectedCommits, setSelectedCommits] = useState(new Set<CommitID>());
  const onSelectCommit = (id: CommitID) => {
    if (selectedCommits.has(id))
      setSelectedCommits(new Set([...selectedCommits].filter(commitId => commitId !== id)))
    else
      setSelectedCommits(new Set([id]))
  }

  return h('div', {}, [
    hs('div', {}, [
      hs('button', { onClick: onWorkClick }, pendingWork ? 'Do Pending Work' : 'Work'),
      hs('label', {}, [
        hs('span', {}, 'Toggle Auto-Work'),
        hs('input', { type: 'checkbox', onInput: onToggleAutoWork, checked: autoWork }),
      ])
    ]),
    currentThread && [
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
    tree && [
      hs('pre', {}, `Size=${tree.commits.size}`),
      h(TreeViewer, { tree, selectedCommits, onSelectCommit }),
    ],
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
