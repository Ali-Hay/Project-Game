class MapRenderer extends GameObject {
  constructor() {
    super(0, 0, 2560, 1440);
    this.name = 'MapRenderer';
    this.particles = [];
    this.time = 0;
    this.gridCells = [];
    this.combatPositions = [];
    this.showGrid = false;
    this.ambientColor = { r: 10, g: 10, b: 14 };
    this.targetColor = { r: 10, g: 10, b: 14 };
    this.moodColors = {
      dread: { r: 15, g: 8, b: 8 },
      wonder: { r: 8, g: 12, b: 18 },
      tension: { r: 18, g: 12, b: 6 },
      sacred: { r: 12, g: 12, b: 18 },
      sorrow: { r: 10, g: 10, b: 12 },
      combat: { r: 20, g: 8, b: 6 },
      calm: { r: 8, g: 12, b: 10 },
      mystery: { r: 12, g: 8, b: 16 },
      silence: { r: 10, g: 10, b: 14 }
    };
  }

  setMood(mood) {
    this.targetColor = this.moodColors[mood] || this.moodColors.silence;
  }

  initCombatGrid(playerPos, enemies) {
    this.showGrid = true;
    this.gridCells = [];
    this.combatPositions = [];
    const gridW = 10, gridH = 8;
    const cellSize = 60;
    // Shift grid to the left to account for the right sidebar
    const offsetX = (2560 - 320) / 2 - (gridW * cellSize) / 2;
    const offsetY = 720 - (gridH * cellSize) / 2;
    for (let y = 0; y < gridH; y++) {
      for (let x = 0; x < gridW; x++) {
        this.gridCells.push({ x: offsetX + x * cellSize, y: offsetY + y * cellSize, w: cellSize, h: cellSize });
      }
    }
    this.combatPositions = [
      { type: 'player', x: offsetX + 2 * cellSize + cellSize/2, y: offsetY + 4 * cellSize + cellSize/2, label: 'K' }
    ];
    enemies.forEach((e, i) => {
      this.combatPositions.push({
        type: 'enemy', x: offsetX + (6 + i) * cellSize + cellSize/2, y: offsetY + (3 + i) * cellSize + cellSize/2, label: (i+1).toString(), name: e.name, hp: e.hp, maxHp: e.maxHp
      });
    });
  }

  hideCombatGrid() {
    this.showGrid = false;
  }

  updateCombatPositions(enemies) {
    this.combatPositions = this.combatPositions.filter(p => p.type === 'player');
    const gridW = 10, cellSize = 60;
    const offsetX = (2560 - 320) / 2 - (gridW * cellSize) / 2;
    const offsetY = 720 - (8 * cellSize) / 2;
    enemies.forEach((e, i) => {
      if (e.hp > 0) {
        this.combatPositions.push({
          type: 'enemy', x: offsetX + (6 + i) * cellSize + cellSize/2, y: offsetY + (3 + i) * cellSize + cellSize/2, label: (i+1).toString(), name: e.name, hp: e.hp, maxHp: e.maxHp
        });
      }
    });
  }

  getGridCellAt(x, y) {
    if (!this.showGrid) return null;
    return this.gridCells.find(c => x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h);
  }

  update(dt) {
    this.time += dt;
    // Lerp ambient color
    this.ambientColor.r += (this.targetColor.r - this.ambientColor.r) * dt * 0.5;
    this.ambientColor.g += (this.targetColor.g - this.ambientColor.g) * dt * 0.5;
    this.ambientColor.b += (this.targetColor.b - this.ambientColor.b) * dt * 0.5;
    // Ambient particles
    if (Math.random() < dt * 2) {
      this.particles.push({
        x: Math.random() * 2560, y: 1440 + 10,
        vx: (Math.random() - 0.5) * 20, vy: -Math.random() * 30 - 10,
        life: 8 + Math.random() * 8, maxLife: 8 + Math.random() * 8,
        size: Math.random() * 2 + 0.5
      });
    }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  draw(ctx) {
    const r = Math.round(this.ambientColor.r);
    const g = Math.round(this.ambientColor.g);
    const b = Math.round(this.ambientColor.b);
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(0, 0, 2560, 1440);

    // Subtle vignette
    const grad = ctx.createRadialGradient(1280, 720, 200, 1280, 720, 1400);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.6)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 2560, 1440);

    // Particles
    for (const p of this.particles) {
      const alpha = (p.life / p.maxLife) * 0.15;
      ctx.fillStyle = `rgba(180,160,130,${alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Combat grid
    if (this.showGrid) {
      ctx.globalAlpha = 0.15;
      ctx.strokeStyle = '#3a3a3e';
      ctx.lineWidth = 1;
      for (const cell of this.gridCells) {
        ctx.strokeRect(cell.x, cell.y, cell.w, cell.h);
      }
      ctx.globalAlpha = 1;

      for (const pos of this.combatPositions) {
        if (pos.type === 'player') {
          ctx.fillStyle = 'rgba(100,140,180,0.3)';
          ctx.beginPath(); ctx.arc(pos.x, pos.y, 24, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#6a8ab0'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(pos.x, pos.y, 24, 0, Math.PI * 2); ctx.stroke();
          ctx.fillStyle = '#c8d0dc';
          ctx.font = '20px Crimson Pro'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(pos.label, pos.x, pos.y);
        } else {
          const hpPct = pos.hp / pos.maxHp;
          ctx.fillStyle = `rgba(${Math.round(180 * (1-hpPct) + 80)},40,40,0.3)`;
          ctx.beginPath(); ctx.arc(pos.x, pos.y, 24, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#8a4a4a'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(pos.x, pos.y, 24, 0, Math.PI * 2); ctx.stroke();
          ctx.fillStyle = '#c8a0a0';
          ctx.font = '20px Crimson Pro'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(pos.label, pos.x, pos.y);
          // HP bar under
          const barW = 40, barH = 4;
          ctx.fillStyle = '#1a1a1e';
          ctx.fillRect(pos.x - barW/2, pos.y + 30, barW, barH);
          ctx.fillStyle = '#6a2a2a';
          ctx.fillRect(pos.x - barW/2, pos.y + 30, barW * hpPct, barH);
        }
      }
    }

    // Breathing center light
    const breathe = Math.sin(this.time * 0.5) * 0.03 + 0.08;
    const cGrad = ctx.createRadialGradient(1280, 720, 0, 1280, 720, 600);
    cGrad.addColorStop(0, `rgba(180,160,130,${breathe})`);
    cGrad.addColorStop(1, 'rgba(180,160,130,0)');
    ctx.fillStyle = cGrad;
    ctx.fillRect(0, 0, 2560, 1440);
  }
}