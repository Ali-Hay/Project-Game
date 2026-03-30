class ParticleSystem extends GameObject {
  constructor() {
    super(0, 0, 0, 0);
    this.name = 'ParticleSystem';
    this.bursts = [];
  }

  emit(x, y, count, color, speed, life) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = Math.random() * speed;
      this.bursts.push({
        x, y, vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd,
        life, maxLife: life, color, size: Math.random() * 3 + 1
      });
    }
  }

  update(dt) {
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const p = this.bursts[i];
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) this.bursts.splice(i, 1);
    }
  }

  draw(ctx) {
    for (const p of this.bursts) {
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha * 0.6;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}