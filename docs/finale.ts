import { act, finale, three } from '../mod.ts'
const { h, useRef, useEffect, useState } = act;

const cubeGeometry = new three.BoxGeometry(1, 1, 1);
const blueMaterial = new three.MeshBasicMaterial( { color: 'blue' } );

export const FinaleCanvas: act.Component = () => {
  const [threeEnabled, setThreeEnabled] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<three.Scene | null>(null);
  const cameraRef = useRef<three.PerspectiveCamera | null>(null);
  const meshRef = useRef<three.Mesh | null>(null);

  useEffect(() => {
    const { current: canvas } = canvasRef;
    const { current: scene } = sceneRef;
    const { current: camera } = cameraRef;
    const { current: mesh } = meshRef;
    if (!canvas || !scene || !camera || !mesh)
      return;

    const renderer = new finale.three.WebGLRenderer({
      canvas,
    })
    const render = () => {
      renderer.render(scene, camera);
      mesh.rotateY(0.01);
      mesh.rotateX(0.01);
      id = requestAnimationFrame(render);
    };
    let id = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(id);
      renderer.dispose();
    };
  }, [threeEnabled])

  const onInput = (event: Event) => {
    const checkbox = event.target as HTMLInputElement;
    setThreeEnabled(checkbox.checked);
  }

  return [
    h('label', {}, [
      h('span', {}, 'Enable 3D'),
      h('input', { type: 'checkbox', checked: threeEnabled, onInput }),
    ]),
    h('canvas', { ref: canvasRef, width: 400, height: 400 }),
    !!threeEnabled && h('scene', { ref: sceneRef, background: new three.Color('white') }, [
      h('mesh', {
        ref: meshRef,
        geometry: cubeGeometry,
        position: new three.Vector3(0, 0, 0),
        material: blueMaterial
      }),
      h('perspectivecamera', { ref: cameraRef, position: new three.Vector3(0, 0, 5) }),
    ])
  ];
}



const ColorChangingCube = () => {
  const [material, setMaterial] = useState(blueMaterial);

  useEffect(() => {
    setInterval(() => {
      setMaterial(new three.MeshBasicMaterial())
    }, 1000);
  }, [])

  return h('mesh', {
    geometry: cubeGeometry,
    position: new three.Vector3(0, 0, 0),
    material
  })
};