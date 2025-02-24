import { Component, Deps, h, Ref, refSymbol, useState } from "@lukekaalim/act";
import { Commit, CommitID, CommitTree, Reconciler } from "@lukekaalim/act-recon";
import { hs } from "@lukekaalim/act-web"
import { getElementName } from "./utils";
import { CommitAttributeTag } from "./AttributeTag";
import classes from './CommitViewer.module.css';

export type CommitViewerProps = {
  reconciler: Reconciler,
  tree: CommitTree,

  commitId: CommitID
};

export const CommitViewer: Component<CommitViewerProps> = ({ reconciler, tree, commitId }) => {
  const commit = tree.commits.get(commitId) as Commit;

  const state = tree.components.get(commitId);

  const isRef = (value: unknown): value is Ref<unknown> => (
    typeof value === 'object' && !!value && (refSymbol in value)
  );

  const refs = state && [...state.values]
    .filter(([id, value]) => isRef(value))
  const states = state && [...state.values]
    .filter(([id, value]) => !isRef(value))

  const [, setRender] = useState(0);
  const rerender = () => {
    setRender(r => r + 1);
  }

  return hs('div', { className: classes.commitViewer }, [
    hs('h3', {}, getElementName(commit.element)),
    hs('div', {}, [
      h(CommitAttributeTag, { name: 'Version', value: commit.version.toString() }),
      h(CommitAttributeTag, { name: 'ID', value: commit.id.toString() }),
      !!commit.element.props.key && [
        h(CommitAttributeTag, { name: 'Key', value: getValueName(commit.element.props.key) }),
      ]
    ]),
    Object.keys(commit.element.props).length > 0 && [
      hs('h4', {}, 'Props'),
      hs('ul', {}, Object.keys(commit.element.props)
        .map(key => hs('li', {}, [
          h(CommitAttributeTag, { name: 'Key', value: key }),
          h(CommitAttributeTag, { name: 'Value', value: getValueName(commit.element.props[key]) }),
        ]))),
    ],
    !!state && [
      !!states && states.length > 0 && [
        hs('h4', {}, 'State'),
        hs('ul', {}, [...state.values]
          .filter(([id, value]) => !isRef(value))
          .map(([id, value]) => h('li', {}, [
          h(CommitAttributeTag, { name: 'ID', value: id.toString() }),
          ' ',
          hs('pre', { style: { display: 'inline' } }, getValueName(value)),
        ])))
      ],
      !!refs && refs.length > 0 && [
        hs('h4', {}, ['Refs ', hs('button', { onClick: rerender }, 'Reload')]),
        hs('ul', {}, [...state.values]
          .filter(([id, value]) => isRef(value))
          .map(([id, value]) => isRef(value) && h('li', {}, [
          h(CommitAttributeTag, { name: 'ID', value: id.toString() }),
          ' ',
          hs('pre', { style: { display: 'inline' } }, getValueName(value.current)),
        ])))
      ],
      state.effects.size > 0 && [
        hs('h4', {}, 'Effects'),
        hs('ul', {}, [...state.effects]
          .map(([id, value]) => h('li', {}, [
          h(CommitAttributeTag, { name: 'ID', value: id.toString() }),
          h(CommitAttributeTag, { name: 'EffectID', value: value.toString() }),
          hs('h5', {}, 'Dependencies'),
          hs('ol', {}, (state.deps.get(id) as unknown[]).map(dep => {
            return h('li', {}, [
              h(CommitAttributeTag, { name: 'Value', value: getValueName(dep) }),
            ])
          }))
        ])))
      ]
    ]
  ])
}

export const getValueName = (value: unknown) => {
  switch (typeof value) {
    case 'object':
      if (!value)
        return 'null';
      if (Array.isArray(value))
        return `Array[${value.length}]`;
      if (value.constructor === ({}).constructor)
        return JSON.stringify(value, null, 2);

      return value.constructor.name;
    case undefined:
      return 'undefined';
    case 'string':
    case 'number':
    case 'boolean':
    case 'symbol':
      return (value as string | number | boolean | symbol).toString();
    case 'function':
      return `${(value as Function).name || 'Function'}()`;
    default:
      console.log(value);
      return typeof value
  }
}