class CombatManager extends GameObject {
  constructor(logicGate) {
    super(0, 0, 0, 0);
    this.name = 'CombatManager';
    this.logic = logicGate;
    this.active = false;
    this.enemies = [];
    this.turnOrder = [];
    this.currentTurn = 0;
    this.round = 1;
  }

  startCombat(enemyIds) {
    this.active = true;
    this.enemies = enemyIds.map(id => ({
      id: id + '_' + Math.floor(Math.random() * 1000),
      templateId: id,
      ...JSON.parse(JSON.stringify(this.logic.world.npcs[id]))
    }));
    // Roll initiative
    const playerInit = this.logic.roll(20).total + this.logic.getMod('DEX');
    this.turnOrder = [{ type: 'player', initiative: playerInit, name: this.logic.player.name }];
    for (const e of this.enemies) {
      const init = this.logic.roll(20).total + 1;
      this.turnOrder.push({ type: 'enemy', id: e.id, initiative: init, name: e.name, ref: e });
    }
    this.turnOrder.sort((a, b) => b.initiative - a.initiative);
    this.currentTurn = 0;
    this.round = 1;
    return { turnOrder: this.turnOrder, enemies: this.enemies };
  }

  getCurrentTurn() {
    return this.turnOrder[this.currentTurn];
  }

  playerAttack(targetIdx = 0) {
    const target = this.enemies[targetIdx];
    if (!target || target.hp <= 0) return null;
    const result = this.logic.rollAttack(target.ac);
    if (result.hit) {
      target.hp = Math.max(0, target.hp - result.damage);
      result.targetHp = target.hp;
      result.targetName = target.name;
      result.defeated = target.hp <= 0;
    }
    return result;
  }

  enemyTurn(turnEntry) {
    const enemy = turnEntry.ref;
    if (!enemy || enemy.hp <= 0) return null;
    
    // Simulate basic movement toward player if needed
    // The visual grid update will be handled in Game.js later if fully implemented
    
    const d20 = this.logic.roll(20);
    const attackTotal = d20.total + enemy.attack.bonus;
    const hit = d20.total === 20 || (d20.total !== 1 && attackTotal >= this.logic.player.ac);
    const crit = d20.total === 20;
    let damage = 0;
    if (hit) {
      const parts = enemy.attack.damage.split('+');
      const dp = parts[0].split('d');
      const dmg = this.logic.roll(parseInt(dp[1]), parseInt(dp[0]) * (crit ? 2 : 1));
      damage = dmg.total + parseInt(parts[1] || 0);
      this.logic.applyDamage('player', damage);
    }
    return { hit, crit, attackRoll: d20.total, attackTotal, damage, enemyName: enemy.name };
  }

  nextTurn() {
    // Remove dead enemies from turn order
    this.turnOrder = this.turnOrder.filter(t => {
      if (t.type === 'enemy') return t.ref.hp > 0;
      return true;
    });
    this.enemies = this.enemies.filter(e => e.hp > 0);
    if (this.enemies.length === 0) {
      this.active = false;
      return { combatOver: true, victory: true };
    }
    if (this.logic.player.hp <= 0) {
      this.active = false;
      return { combatOver: true, victory: false };
    }
    this.currentTurn = (this.currentTurn + 1) % this.turnOrder.length;
    if (this.currentTurn === 0) this.round++;
    return { combatOver: false, turn: this.turnOrder[this.currentTurn] };
  }
}