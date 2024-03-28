import { createSplitRenderSpace } from "@lukekaalim/act-backstage/mod.ts";
import { createReconciler } from "@lukekaalim/act-recon/mod.ts";
import { Component, createContext, h, primitiveNodeTypes, useContext, useEffect, useMemo, useRef, useState } from "@lukekaalim/act/mod.ts";

import './index.module.css';

import { createWebSpace, hs } from "../renderers/web/mod.ts";
import { act, recon, three } from "../mod.ts";
import { createFinaleSpace } from "../renderers/three/space.ts";
import { Subject } from 'rxjs';

const generateGreeting = () => {
  const entries = [
    'hi',
    'hello',
    'whattsup',
    'yo',
    'my man!',
    'heyyyy',
    'greetings',
    'welcome',
    'hola',
    'friend!',
    'how are you',
    'ugh'
  ]
  return entries[Math.floor(Math.random() * entries.length)];
}

const Entry: act.Component = () => {
  const [text, setGreeting] = useState(generateGreeting())
  return hs('button', { onClick(ev) {
    setGreeting(generateGreeting())
  }, }, text);
}

const getCommitType = (c: recon.Commit) => {
  if (typeof c.element.type === 'function')
    return `<${c.element.type.name}/>`;
  return `<${c.element.type.toString()}/>`;
}


const MyComponent: Component = () => {
  const [num, setNum] = useState(5)
  
  const onClick = useMemo(() => () => {
    setNum(n => n + 1)
  }, []);

  const [speed, setSpeed] = useState(0.7);

  const [showSecret, setShowSecret] = useState(true);
  const secret = useRef<HTMLElement | null>(null);
  useEffect(() => {
    console.log(secret.current);
  }, [showSecret])

  return [
    h('div', {}, [
      useMemo(() => [
        hs('button', {
          onClick,
          style: { backgroundColor: 'blue', color: 'white', padding: '12px', borderRadius: '8px' }
        }, 'Add element'),
        hs('button', {
          onClick(ev) {
            setNum(n => n - 1);
          },
          style: { backgroundColor: 'red', color: 'white', padding: '12px', borderRadius: '8px' }
        }, 'Remove element'),
      ], []),
      h('button', { onClick: () => setShowSecret(!showSecret) }, 'Toggle secret'),
      !!showSecret && h(primitiveNodeTypes.null, {}, [
        hs('h1', { ref: secret }, 'Secret Heading! Not attached to the DOM tree')
      ]),
      h('ol', {}, [Array.from({ length: num }).map(() =>
        h('li', {}, h(Entry))), hs('li', {}, "Goodbye!")]),
      hs('div', { style: { display: 'flex', flexDirection: 'column', maxWidth: '400px' } }, [
        hs('input', { type: 'range', min: 0, max: 20, step: 0.1, value: speed + 10, onInput(ev) {
          setSpeed(Math.round(((ev.target as HTMLInputElement).valueAsNumber - 10) * 10) / 10)
        }, }),
        useMemo(() => h(Canvas, { speed }), [speed])
      ])
    ]),
  ];
}

const renderContext = createContext<three.WebGLRenderer | null>(null);

const Canvas: act.Component<{ speed: number }> = ({ speed }) => {
  const canvasRef = useRef<null | HTMLCanvasElement>(null);
  const sceneRef = useRef<null | three.Scene>(null);
  const cameraRef = useRef<null | three.PerspectiveCamera>(null);

  const [renderer, setRenderer] = useState<three.WebGLRenderer | null>(null)

  useEffect(() => {
    const { current: canvas } = canvasRef;
    const { current: camera } = cameraRef;
    const { current: scene } = sceneRef;

    if (!canvas || !scene || !camera)
      return;

    const render = () => {
      renderer.render(scene, camera);
      id = requestAnimationFrame(render);
    };
    const renderer = new three.WebGLRenderer({ canvas })
    setRenderer(renderer);
    let id = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(id);
      setRenderer(null);
      renderer.dispose();
    }
  }, [])

  return h(renderContext.Provider, { value: renderer },
    useMemo(() => hs('canvas', { ref: canvasRef, height: 400, width: 400, style: { background: "black" } }, [
      h('scene', { ref: sceneRef }, [
        h('perspectivecamera', {
          ref: cameraRef,
          position: new three.Vector3(0, 0, 5),
        }),
        h(MiddleManagement, {}, h(SpinMesh, { speed })),
      ])
  ]), [speed]))
}

const MiddleManagement: act.Component = ({ children }) => {
  return children;
}

const geometry = new three.BoxGeometry(1, 1, 1);
const material = new three.MeshBasicMaterial({ color: 'red' });

const SpinMesh: act.Component<{ speed: number }> = ({ speed }) => {
  const ref = useRef<null | three.Mesh>(null)
  useEffect(() => {
    const { current: mesh } = ref;
    
    if (!mesh)
      return;

    const render = () => {
      mesh.rotateX(0.01 * speed);
      mesh.rotateY(0.01 * speed);
      id = requestAnimationFrame(render);
    };
    let id = requestAnimationFrame(render);
    return () => cancelAnimationFrame(id);
  }, [speed])

  useContext(renderContext);

  return h('mesh', { geometry, material, ref })
}

const threadSubject = new Subject<recon.WorkThread>()

const r = createReconciler(h(MyComponent), createSplitRenderSpace([
  createWebSpace(document),
  createFinaleSpace()
]), thread => {
  threadSubject.next(thread)
});

const Monitor = () => {
  return hs('div', { style: { position: 'absolute', right: '12px', top: '12px', minWidth: '400px' } }, [
    h(NodeCount),
    hs('hl'),
  ])
}

const NodeCount: act.Component = () => {
  const [rootCommit, setRoomCommit] = useState<recon.Commit | null>(r.commits.get(r.rootRef.id) || null);

  const [selectedCommitId, setSelectedCommitId] = useState<recon.CommitID | null>(null);

  const onClick = (commit: recon.Commit) => () => {
    setSelectedCommitId(commit.id);
  }

  const buildTree = (commit: recon.Commit): act.Node => {
    const childCommits = commit.children.map(c => r.commits.get(c.id))
    return hs('div', { style: { marginLeft: `${commit.path.length * 4}px`} }, [
      hs('button', { onClick: onClick(commit), disabled: commit.id === selectedCommitId }, getCommitType(commit)),
      hs('div', {}, childCommits.map(c => {
        return !!c && buildTree(c)
      })),
    ])
  }

  useEffect(() => {
    const update = () => {
      setRoomCommit(r.commits.get(r.rootRef.id) || null);
    }
    const s = threadSubject.subscribe(thread => {
      update()
    });
    update();
    return () => s.unsubscribe();
  }, []);

  const selectedCommit = selectedCommitId && r.commits.get(selectedCommitId);

  return [
    !!selectedCommit && h(ComponentStateView, { commit: selectedCommit }),
    !!rootCommit && hs('div', {}, buildTree(rootCommit)),
  ]
}

const ComponentStateView: act.Component<{ commit: recon.Commit }> = ({ commit }) => {
  const cState = r.stateManager.states.get(commit.id);
  
  return hs('div', {}, [
    h('h4', {}, 'Commit'),
    hs('table', { classList: ['hola', true && false] }, [
      hs('tr', {}, [hs('th', {}, 'CommitID'), hs('td', {}, commit.id.toString())]),
      hs('tr', {}, [hs('th', {}, 'CommitPath'), hs('td', {}, commit.path.join('.').toString())]),
      hs('tr', {}, [hs('th', {}, 'ElementID'), hs('td', {}, commit.element.id.toString())]),
      hs('tr', {}, [hs('th', {}, 'Version'), hs('td', {}, commit.version.toString())]),
      hs('tr', {}, [hs('th', {}, 'ComponentType'), hs('td', { style: { fontWeight: 'bold', } }, getCommitType(commit))]),
    ]),
    hs('h4', {}, 'Props'),
    hs('ol', {}, [...Object.entries(commit.element.props)].map(([propName, value]) =>
      h('li', {},
        [propName, h('pre', { style: { margin: 0, display: 'inline' } },
          (typeof value === 'string' || typeof value === 'number') && [': "', value.toString(), "\""])]))),
    !!cState && [
      h('h4', {}, 'States'),
      hs('ol', {}, [...cState.values.entries()].map(([id, value]) =>
        h('li', {}, h('pre', {}, [id, JSON.stringify(value).slice(0, 30)])))),
      h('h4', {}, 'Effects'),
      hs('ol', {}, [...cState.effects.entries()].map(([id, value]) =>
        h('li', {}, h('pre', {}, [id, JSON.stringify(value)])))),
    ]
  ])
}

createReconciler(h(Monitor), createWebSpace(document));
