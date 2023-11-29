export type Vector2 = {
  x: number,
  y: number,
};
export const distance = (a: Vector2, b: Vector2) => {
  return Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2));
};
export type Particle = {
  enabled: boolean,
  id: number,
  title?: string,
  color: string,
  mass: number,
  pos: Vector2, vel: Vector2
};
export type Spring = {
  id: number,

  left: number,
  right: number,
  length: number
}

export type Sim = {
  particles: Particle[],
  springs: Spring[]
};

export const runSim = (sim: Sim) => {
  for (const spring of sim.springs) {
    const left = sim.particles.find(p => p.id == spring.left);
    const right = sim.particles.find(p => p.id == spring.right);
    if (!left || !right)
      continue;
    const d = (distance(left.pos, right.pos) - spring.length) / (100000);

    if (d > (spring.length + 50) && d < (spring.length - 50))
      continue;
    const dx = right.pos.x - left.pos.x;
    const dy = right.pos.y - left.pos.y;

    if (left.enabled) {
      left.vel.x += (d * dx);
      left.vel.y += (d * dy);
    }
    if (right.enabled) {
      right.vel.x -= (d * dx);
      right.vel.y -= (d * dy);
    }
  }
  for (const particle of sim.particles) {
    if (!particle.enabled)
      continue;
    for (const repulsedParticle of sim.particles) {
      const d = 100 - Math.min(100, distance(particle.pos, repulsedParticle.pos));
      if (d < 10000 && d !== 0) {
        const dx = particle.pos.x - repulsedParticle.pos.x;
        const dy = particle.pos.y - repulsedParticle.pos.y;
        particle.vel.x += (dx * d * 0.0005);
        particle.vel.y += (dy * d * 0.0005);
      }
    }
    particle.pos.x += particle.vel.x;
    particle.pos.y += particle.vel.y;
    // Passive Drag
    particle.vel.x *= 0.90;
    particle.vel.y *= 0.90;
  }
};