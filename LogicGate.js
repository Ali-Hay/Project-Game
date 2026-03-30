class LogicGate extends GameObject {
  constructor() {
    super(0, 0, 0, 0);
    this.name = 'LogicGate';

    // Player character state (5e-inspired)
    this.player = {
      name: 'Kael Ashborne',
      class: 'Paladin',
      level: 3,
      hp: 28, maxHp: 28,
      ac: 18,
      stats: { STR: 16, DEX: 10, CON: 14, INT: 10, WIS: 13, CHA: 16 },
      proficiency: 2,
      inventory: [
        { name: 'Longsword', type: 'weapon', damage: '1d8', modifier: 'STR', properties: ['versatile'] },
        { name: 'Shield', type: 'armor', acBonus: 2 },
        { name: 'Chain Mail', type: 'armor', baseAc: 16 },
        { name: 'Holy Symbol', type: 'focus' },
        { name: 'Torch', type: 'light', quantity: 3 },
        { name: 'Potion of Healing', type: 'consumable', effect: '2d4+2', quantity: 2 }
      ],
      spellSlots: { 1: 3, max1: 3 },
      conditions: [],
      xp: 750
    };

    // World state database
    this.world = {
      currentLocation: 'chapel_entrance',
      time: 'dusk',
      day: 1,
      locations: {
        chapel_entrance: {
          name: 'The Shattered Chapel',
          description: 'ruined_chapel_exterior',
          mood: 'dread',
          connections: ['chapel_nave', 'forest_path'],
          objects: [
            { id: 'chapel_door', type: 'door', state: 'closed', locked: false, dc: null },
            { id: 'iron_gate', type: 'door', state: 'locked', locked: true, dc: 15 }
          ],
          flags: { visited: false, torchesLit: false }
        },
        chapel_nave: {
          name: 'The Nave',
          mood: 'sacred',
          connections: ['chapel_entrance', 'chapel_crypt'],
          objects: [
            { id: 'altar', type: 'interactable', state: 'defiled', investigated: false },
            { id: 'crypt_stairs', type: 'passage', state: 'hidden', dc: 14 }
          ],
          npcs: ['ghost_priest'],
          flags: { visited: false, altarCleansed: false }
        },
        chapel_crypt: {
          name: 'The Crypt Below',
          mood: 'dread',
          connections: ['chapel_nave'],
          objects: [
            { id: 'sarcophagus', type: 'interactable', state: 'sealed', dc: 16 }
          ],
          enemies: ['skeleton_warrior', 'skeleton_warrior'],
          flags: { visited: false, bossDefeated: false }
        },
        forest_path: {
          name: 'The Ashen Path',
          mood: 'mystery',
          connections: ['chapel_entrance', 'village_ruins'],
          flags: { visited: false }
        },
        village_ruins: {
          name: 'Ruins of Ember Hollow',
          mood: 'sorrow',
          connections: ['forest_path'],
          npcs: ['survivor_mira'],
          flags: { visited: false }
        }
      },
      npcs: {
        ghost_priest: {
          name: 'Father Aldric',
          status: 'spectral',
          relation: 'neutral',
          disposition: 50,
          leitmotif: 'sacred',
          flags: { spoken: false, questGiven: false, appeased: false },
          ac: 12, hp: 22, maxHp: 22
        },
        skeleton_warrior: {
          name: 'Risen Guardian',
          status: 'hostile',
          ac: 13, hp: 13, maxHp: 13,
          attack: { name: 'Rusted Blade', bonus: 4, damage: '1d6+2' },
          leitmotif: 'combat'
        },
        survivor_mira: {
          name: 'Mira',
          status: 'alive',
          relation: 'wary',
          disposition: 30,
          leitmotif: 'sorrow',
          flags: { spoken: false, trusted: false }
        }
      },
      factions: {
        undead_horde: { power: 60, goal: 'expand', territory: ['chapel_crypt'] },
        survivors: { power: 20, goal: 'survive', territory: ['village_ruins'] }
      },
      globalFlags: {
        chapelPurified: false,
        hordeAlerted: false
      }
    };
  }

  initializeWithWorld(worldData) {
    if (worldData.player) this.player = JSON.parse(JSON.stringify(worldData.player));
    if (worldData.world) this.world = JSON.parse(JSON.stringify(worldData.world));
  }

  getMod(stat) {
    return Math.floor((this.player.stats[stat] - 10) / 2);
  }

  roll(sides, count = 1) {
    let total = 0;
    let rolls = [];
    for (let i = 0; i < count; i++) {
      const r = Math.floor(Math.random() * sides) + 1;
      rolls.push(r);
      total += r;
    }
    return { total, rolls, sides };
  }

  rollCheck(stat, dc, proficient = false) {
    const mod = this.getMod(stat);
    const d20 = this.roll(20);
    const profBonus = proficient ? this.player.proficiency : 0;
    const total = d20.total + mod + profBonus;
    const nat20 = d20.total === 20;
    const nat1 = d20.total === 1;
    return {
      success: nat20 || (!nat1 && total >= dc),
      total, roll: d20.total, mod, dc, nat20, nat1,
      stat, proficiency: profBonus
    };
  }

  rollAttack(targetAc) {
    const weapon = this.player.inventory.find(i => i.type === 'weapon');
    const mod = this.getMod(weapon.modifier);
    const d20 = this.roll(20);
    const attackTotal = d20.total + mod + this.player.proficiency;
    const hit = d20.total === 20 || (d20.total !== 1 && attackTotal >= targetAc);
    const crit = d20.total === 20;
    let damage = 0;
    if (hit) {
      const dmgParts = weapon.damage.split('d');
      const dmgRoll = this.roll(parseInt(dmgParts[1]), parseInt(dmgParts[0]) * (crit ? 2 : 1));
      damage = dmgRoll.total + mod;
    }
    return { hit, crit, attackRoll: d20.total, attackTotal, targetAc, damage, nat1: d20.total === 1 };
  }

  rollEnemyAttack(npcId) {
    const npc = this.world.npcs[npcId];
    if (!npc || !npc.attack) return null;
    const d20 = this.roll(20);
    const attackTotal = d20.total + npc.attack.bonus;
    const hit = d20.total === 20 || (d20.total !== 1 && attackTotal >= this.player.ac);
    const crit = d20.total === 20;
    let damage = 0;
    if (hit) {
      const parts = npc.attack.damage.split('+');
      const diceParts = parts[0].split('d');
      const dmgRoll = this.roll(parseInt(diceParts[1]), parseInt(diceParts[0]) * (crit ? 2 : 1));
      damage = dmgRoll.total + parseInt(parts[1] || 0);
    }
    return { hit, crit, attackRoll: d20.total, attackTotal, damage, npcName: npc.name };
  }

  applyDamage(target, amount) {
    if (target === 'player') {
      this.player.hp = Math.max(0, this.player.hp - amount);
      return this.player.hp;
    } else {
      const npc = this.world.npcs[target];
      if (npc) {
        npc.hp = Math.max(0, npc.hp - amount);
        return npc.hp;
      }
    }
    return 0;
  }

  healPlayer(amount) {
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + amount);
    return this.player.hp;
  }

  useConsumable(itemName) {
    const item = this.player.inventory.find(i => i.name === itemName && i.quantity > 0);
    if (!item) return null;
    item.quantity--;
    if (item.quantity <= 0) {
      this.player.inventory = this.player.inventory.filter(i => i !== item);
    }
    if (item.effect) {
      const parts = item.effect.split('+');
      const diceParts = parts[0].split('d');
      const healRoll = this.roll(parseInt(diceParts[1]), parseInt(diceParts[0]));
      const total = healRoll.total + parseInt(parts[1] || 0);
      return { type: 'heal', amount: total, newHp: this.healPlayer(total) };
    }
    return { type: 'used' };
  }

  getLocation() {
    return this.world.locations[this.world.currentLocation];
  }

  moveToLocation(locId) {
    const current = this.getLocation();
    if (current.connections && current.connections.includes(locId)) {
      this.world.currentLocation = locId;
      const newLoc = this.world.locations[locId];
      newLoc.flags.visited = true;
      return { success: true, location: newLoc, id: locId };
    }
    return { success: false };
  }

  interactObject(objId) {
    const loc = this.getLocation();
    if (!loc.objects) return null;
    const obj = loc.objects.find(o => o.id === objId);
    return obj;
  }
}