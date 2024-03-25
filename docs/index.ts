import { spider, act } from "../mod.ts";
import { FinaleCanvas } from "./finale.ts";
import { Particle, Sim, Spring, Vector2, distance, runSim } from "./mods/sim.ts";
import { useDraggableSurface2 } from "./mods/useDraggableSurface2.ts";

const { h, useState, useEffect, useRef, useMemo } = act;

const Greeting = () => {
  const [greetingIndex, setGreetingIndex] = useState(0)
  const greetings = [
    "Hello",
    "Welcome",
    "Hiya",
    "Hey-ho"
  ]
  useEffect(() => {
    const id = setInterval(() => {
      setGreetingIndex(i => i + 1);
    }, 1000)
    return () => {
      clearInterval(id);
    };
  }, []);
  return h('h1', {},
    greetings[greetingIndex % greetings.length]);
}

const TestApp = () => {
  const [todos, setTodos] = useState<string[]>([]);
  const [wip, setWip] = useState('')

  return h('div', {}, [
    useMemo(() => h(Greeting), []),
    useMemo(() => h('p', {}, 'This text never changes'), []),
    useMemo(() => {
      return [
        h('ol', {}, todos.map(todo => h('li', {}, todo)))
      ];
    }, [todos]),
    h('input', { type: 'text', onInput: (e: Event) => {
      setWip((e.target as HTMLInputElement).value)
    }, value: wip }),
    h('button', { onClick() {
      setWip('');
      setTodos([...todos, wip])
    } }, 'Add Todo'),
    h('pre', {}, wip),
    h(FinaleCanvas),
  ]);
};


const ParticleSimElement: act.Component<{ particle: Particle, camera: Vector2 }> = ({ particle, camera }) => {
  const ref = useRef<SVGCircleElement | null>(null);
  const titleRef = useRef<SVGTextElement | null>(null);
  const velocityRef = useRef<SVGLineElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    const titleEl = titleRef.current;
    const velocityEl = velocityRef.current;
    if (!el || !velocityEl || !titleEl)
      return;

    const callback = () => {
      el.setAttribute('cx', `${Math.round(particle.pos.x)}px`);
      el.setAttribute('cy', `${Math.round(particle.pos.y)}px`);
      titleEl.setAttribute('x', `${Math.round(particle.pos.x - (particle.mass * 2.5))}px`);
      titleEl.setAttribute('y', `${Math.round(particle.pos.y + 4)}px`);
      velocityEl.setAttribute('x1', `${Math.round(particle.pos.x)}px`);
      velocityEl.setAttribute('y1', `${Math.round(particle.pos.y)}px`);
      velocityEl.setAttribute('x2', `${Math.round(particle.pos.x + (particle.vel.x * 10))}px`);
      velocityEl.setAttribute('y2', `${Math.round(particle.pos.y + (particle.vel.y * 10))}px`);

      id = requestAnimationFrame(callback);
    };
    let id = requestAnimationFrame(callback);
    return () => {
      cancelAnimationFrame(id);
    }
  }, [particle]);

  const s = useDraggableSurface2(ref);
  useEffect(() => {
    s.onDragStart.subscribe((drag) => {
      const ce = drag.changes.subscribe(move => {
        if (move.type === 'end') {
          ce.unsubscribe();
          particle.enabled = true;
          return;
        }
        particle.enabled = false;
        particle.pos.x = drag.current.x - camera.x
        particle.pos.y = drag.current.y - camera.y
      })
    })
  }, [particle])

  return [
    h(spider.el.circle, {
      ref,
      r: `${particle.mass * 5}px`,
      stroke: 'black',
      fill: particle.color,
    }),
    h(spider.el.line, {
      ref: velocityRef,
      stroke: 'black',
    }),
    h(spider.el.text, {
      ref: titleRef,
      style: { pointerEvents: 'none' },
    }, particle.title || ''),
  ];
}
const SpringSimElement: act.Component<{ left: Particle, right: Particle, spring: Spring }> = ({
  left,
  right,
  spring,
}) => {
  const ref = useRef<SVGCircleElement | null>(null);
  const textRef = useRef<SVGTextElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    const textEl = textRef.current;
    if (!el)
      return;

    const callback = () => {
      el.setAttribute('x1', `${Math.round(left.pos.x)}px`);
      el.setAttribute('y1', `${Math.round(left.pos.y)}px`);
      el.setAttribute('x2', `${Math.round(right.pos.x)}px`);
      el.setAttribute('y2', `${Math.round(right.pos.y)}px`);
      if (textEl) {
        textEl.textContent = Math.round(distance(left.pos, right.pos)) + "px";
        textEl.setAttribute('x', Math.round((right.pos.x + left.pos.x)/2) + "px");
        textEl.setAttribute('y', Math.round((right.pos.y + left.pos.y)/2) + "px");
      }

      id = requestAnimationFrame(callback);
    };
    let id = requestAnimationFrame(callback);
    return () => {
      cancelAnimationFrame(id);
    }
  }, [left, right, spring]);

  return [
    h(spider.el.line, {
      ref,
      stroke: 'black',
    }),
    h(spider.el.text, {
      ref: textRef,
    }),
  ];
}

const RendererVisualisation = () => {
  const [sim, setSim] = useState<Sim>({
    particles: [],
    springs: [],
  });

  useEffect(() => {
    const id = setInterval(() => {
      runSim(sim);
    }, 20);
    return () => {
      clearInterval(id);
    }
  }, [sim]);

  const ref = useRef<HTMLElement | null>(null)
  useEffect(() => {
    if (ref.current) {
      const renderer = spider.createWebRenderer(ref.current, h(TestApp), (thread) => {
        setSim(sim => {
          for (const { prev, next, ref } of thread.completedDeltas) {
            const color = `hsl(${Math.random() * 360}deg, 60%, ${(Math.random() * 50) + 50}%)`;
            if (!prev && next) {
              const title = typeof next.element.type === 'function'
                ? `<${next.element.type.name}>`
                : next.element.type === act.primitiveNodeTypes.string
                  ? next.element.props.value as string
                  : `<${next.element.type.toString()}>`
              const parentId = ref.path[ref.path.length - 2];
              const partentParticle = parentId && sim.particles.find(p => p.id === parentId);
              const pos = partentParticle ? { ...partentParticle.pos } : { x: 500, y: 500 };

              sim.particles.push({
                enabled: true,
                id: ref.id,
                pos,
                title,
                color,
                mass: 10 / ref.path.length,
                vel: { x: Math.random() - 0.5, y: Math.random() - 0.5 }
              });
              if (parentId)
                sim.springs.push({
                  id: parentId,
                  left: parentId,
                  right: ref.id,
                  length: 500 / ref.path.length
                });
            }
            if (prev && !next) {
              sim.particles = sim.particles.filter(p => p.id !== ref.id);
              sim.springs = sim.springs.filter(s => s.left !== ref.id && s.right !== ref.id)
            }
            if (prev && next) {
              const title = typeof next.element.type === 'function'
                ? `<${next.element.type.name}>`
                : next.element.type === act.primitiveNodeTypes.string
                  ? next.element.props.value as string
                  : `<${next.element.type.toString()}>`
              const p = sim.particles.find(p => p.id === ref.id)
              if (p && prev.version !== next.version) {
                p.title = title;
                p.color = color;
                if (thread.rootTargets.some(t => t.id === ref.id)) {
                  //p.vel.x += (Math.random() - 0.5) * 1
                  //p.vel.y += (Math.random() - 0.5) * 1
                }
              }
            }
          }
          return { ...sim };
        })
      });
    }
  }, [])
  const groupRef = useRef<SVGGElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const groupDrag = useDraggableSurface2(svgRef)
  const camera = useRef({ x: 0, y: 0 }).current;

  useEffect(() => {
    const el = groupRef.current;
    if (!el)
      return;
    groupDrag.onDragStart.subscribe((d) => {
      d.changes.subscribe((c) => {
        if (c.type === 'end')
          return;
          camera.x += c.change.x;
          camera.y += c.change.y;
        el.style.transform = `translate(${camera.x}px, ${camera.y}px)`;
      });
    })
  }, [])

  return [
    h(spider.el.div, { style: { display: 'flex', flexDirection: 'column', flex: 1 } }, [
      h(spider.el.div, { style: { position: 'absolute', top: 0, left: 0, height: '600px', width: '400px', overflow: 'auto', border: '1px solid black' }}, [
        h(spider.el.div, { ref }),
      ]),
      h(spider.el.svg, { style: { display: 'flex', flex: 1, userSelect: 'none' }, ref: svgRef }, [
        h(spider.el.g, { ref: groupRef }, [
          sim.springs.map(spring => {
            const left = sim.particles.find(p => p.id == spring.left);
            const right = sim.particles.find(p => p.id == spring.right);
            if (!left || !right)
              return null;
            return h(SpringSimElement, { left, right, spring, camera });
          }),
          sim.particles.map(particle => {
            return h(ParticleSimElement, { particle, camera });
          }),
        ]),
      ])
    ]),
  ];
};

spider.createWebRenderer(document.body, h(RendererVisualisation));

