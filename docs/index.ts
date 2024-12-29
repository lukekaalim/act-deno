import { h, primitiveNodeTypes, useEffect, useMemo, useRef, useState } from '@lukekaalim/act';
import { hs, HTML, SVG } from '@lukekaalim/act-web';
import { render, three, ThreeJS, node } from '@lukekaalim/act-three';
import { TextGeometry, FontLoader, Font } from 'three/addons';
import fontURL from 'three/examples/fonts/helvetiker_regular.typeface.json?url';

const material = new three.MeshBasicMaterial({ color: 'red' });

const loader = new FontLoader();
const font = await new Promise<Font>(r => loader.load(fontURL, font => r(font)));

const App = () => {
  const [name, setName] = useState("World");
  const ref = useRef<null | HTMLElement>(null);
  const refB = useRef<null | HTMLElement>(null);
  const refC = useRef<null | three.Mesh>(null);
  const refD = useRef<null | SVGElement>(null);
  const refE = useRef<null | HTMLCanvasElement>(null);
  const refF = useRef<null | three.PerspectiveCamera>(null);
  const refG = useRef<null | three.Scene>(null);

  useEffect(() => {
    console.log({ ref, refB, refC, refD })
  }, []);

  useEffect(() => {
    const canvas = refE.current;
    const camera = refF.current;
    const scene = refG.current;
    if (!canvas || !camera || !scene)
      return;

    const renderer = new three.WebGLRenderer({ canvas })
    const render = () => {
      renderer.render(scene, camera)
      id = requestAnimationFrame(render);

      if (refC.current) {
        refC.current.rotateY(Math.PI / 180);
      }
    }
    let id = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(id);
    }
  }, [!!name])

  const geometry = useMemo(() => {
    return new TextGeometry(`Hello, ${name}!`, { depth: 1, font, size: 5 }).center()
  }, [name])

  return [
    hs('div', {}, [
      hs('input', {
        type: 'text',
        onInput: e => setName((e.currentTarget as HTMLInputElement).value),
        value: name
      }),
      !!name && [
        hs('h3', {}, `Hello, ${name}!`),
        hs('p', {}, `Hello, ${name}!`),
        hs('div', { ref: refB }),
        h(Ticker),
        h(primitiveNodeTypes.null, {}, [
          h(HTML, {}, h('p', { ref }, 'A child')),
        ]),
        h(SVG, {}, h('svg', { ref: refD, width: 300, height: 300 }, [
          h('text', { fill: 'blue', x: '0px', y: '20px' }, `Hello, ${name}!`),
          h('rect', { x: '50px', y: '50px', stroke: 'orange', 'stroke-width': '8px', fill: 'red', width: '50px', height: '50px' })
        ])),
        h('canvas', { ref: refE, width: 300, height: 300 }),
        h(primitiveNodeTypes.null, {}, [
          h(ThreeJS, {}, [
            h(node.scene, { ref: refG }, [
              h(node.mesh, { ref: refC, geometry, material }),
              h(node.perspectiveCamera, { ref: refF, position: new three.Vector3(0, 0, 100) }),
            ])
          ])
        ])
      ]
    ])
  ]
};

const Ticker = () => {
  const [counter, setCounter] = useState(0);

  useEffect(() => {
    console.log('mount')
    return () => console.log('unmount')
  }, [counter])

  return  hs('button', { onClick: () => (setCounter(c => c + 1), setCounter(c => c + 1)) }, counter);
}

const main = () => {
  render(h(HTML, {}, h(App)), document.body);
}

main();