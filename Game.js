class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.entities = [];
    this.scrollX = 0;
    this.scrollY = 0;
    this.lastTime = 0;
    this.state = 'intro'; // intro, exploration, combat, dialogue, gameover
    this.inputLocked = false;

    // Core systems
    this.audio = new AudioEngine();
    this.logic = new LogicGate();
    this.weaver = new Weaver();
    this.shadow = new ShadowSim(this.logic);
    this.combat = new CombatManager(this.logic);
    this.map = new MapRenderer();
    this.particles = new ParticleSystem();
    this.menu = new Menu(this);

    this.entities.push(this.audio, this.logic, this.weaver, this.shadow, this.combat, this.map, this.particles, this.menu);

    this.proseEl = document.getElementById('prose-scroll');
    this.choicesEl = document.getElementById('choices-panel');

    this.setupInput();
    this.setupResize();
  }

  setupInput() {
    document.addEventListener('click', () => {
      this.audio.init();
    }, { once: true });

    document.addEventListener('click', (e) => {
      if (this.state === 'combat' && this.combat.active && !this.inputLocked) {
        const turn = this.combat.getCurrentTurn();
        if (turn && turn.type === 'player' && this.combat.awaitingMove) {
          const rect = this.canvas.getBoundingClientRect();
          const scaleX = this.canvas.width / rect.width;
          const scaleY = this.canvas.height / rect.height;
          const x = (e.clientX - rect.left) * scaleX;
          const y = (e.clientY - rect.top) * scaleY;
          
          const cell = this.map.getGridCellAt(x, y);
          if (cell) {
            this.playerCombatMove(cell);
          }
        }
      }
    });

    document.addEventListener('keydown', (e) => {
      if (this.inputLocked) return;
      const num = parseInt(e.key);
      if (num >= 1 && num <= 9) {
        if (this.state === 'combat') {
          const btns = document.getElementById('combat-actions').querySelectorAll('.combat-action-btn');
          if (btns[num - 1]) btns[num - 1].click();
        } else {
          const btns = this.choicesEl.querySelectorAll('.choice-btn');
          if (btns[num - 1]) btns[num - 1].click();
        }
      }
    });
  }

  setupResize() {
    const resize = () => {
      const container = document.getElementById('gameContainer');
      this.canvas.style.width = container.clientWidth + 'px';
      this.canvas.style.height = container.clientHeight + 'px';
    };
    window.addEventListener('resize', resize);
    resize();
  }

  screenToWorld(cx, cy) { return { x: cx + this.scrollX, y: cy + this.scrollY }; }
  worldToScreen(wx, wy) { return { x: wx - this.scrollX, y: wy - this.scrollY }; }
  getObjectAt(cx, cy) {
    const w = this.screenToWorld(cx, cy);
    for (const e of this.entities) {
      const b = e.getBounds();
      if (w.x >= b.x && w.x <= b.x + b.width && w.y >= b.y && w.y <= b.y + b.height) return e;
    }
    return null;
  }

  toggleCharSheet() {
    const cs = document.getElementById('character-sheet');
    cs.classList.toggle('expanded');
    cs.classList.toggle('collapsed');
  }

  updateCharSheet() {
    const p = this.logic.player;
    const statsEl = document.getElementById('cs-stats');
    statsEl.innerHTML = '';
    for (const [stat, val] of Object.entries(p.stats)) {
      const mod = this.logic.getMod(stat);
      statsEl.innerHTML += `<div class="stat-block"><div class="stat-label">${stat}</div><div class="stat-value">${val}</div><div class="stat-mod">${mod >= 0 ? '+' : ''}${mod}</div></div>`;
    }
    const hpPct = (p.hp / p.maxHp) * 100;
    document.getElementById('cs-hp-fill').style.width = hpPct + '%';
    document.getElementById('cs-hp-text').textContent = `${p.hp} / ${p.maxHp}`;

    const invEl = document.getElementById('cs-inventory');
    invEl.innerHTML = '<div class="stat-label" style="margin-bottom:4px">INVENTORY</div>';
    for (const item of p.inventory) {
      invEl.innerHTML += `<div class="inv-item">${item.name}${item.quantity ? ' ×' + item.quantity : ''}</div>`;
    }

    const condEl = document.getElementById('cs-conditions');
    condEl.innerHTML = '';
    for (const c of p.conditions) {
      condEl.innerHTML += `<span class="condition-tag">${c}</span>`;
    }
  }

  clearChoices() {
    this.choicesEl.innerHTML = '';
  }

  refreshChoices() {
    this.showExplorationChoices();
  }

  addChoice(text, type, callback) {
    const idx = this.choicesEl.children.length + 1;
    const btn = document.createElement('button');
    btn.className = `choice-btn ${type}`;
    btn.innerHTML = `<span class="choice-key">[${idx}]</span>${text}`;
    btn.addEventListener('click', () => {
      if (this.inputLocked) return;
      this.audio.init();
      callback();
    });
    this.choicesEl.appendChild(btn);
  }

  async showDiceResult(value, detail) {
    const el = document.getElementById('dice-result');
    document.getElementById('dice-value').textContent = value;
    document.getElementById('dice-detail').textContent = detail;
    el.classList.remove('hidden');
    this.audio.playSfx('dice');
    await this.weaver.wait(1200);
    el.classList.add('hidden');
  }

  showWorldTicker(msg) {
    const el = document.getElementById('world-ticker');
    document.getElementById('ticker-text').textContent = msg;
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 4500);
  }

  async runIntro() {
    this.inputLocked = true;
    this.audio.setMood('dread');
    this.map.setMood('dread');

    await this.weaver.displaySingle(this.proseEl, '<span class="roll">CHRONICLE: ZERO</span>', 'system', 800);
    await this.weaver.wait(600);

    const texts = this.weaver.getNarrative('chapel_entrance_first');
    await this.weaver.displayProse(this.proseEl, texts, '', 600);

    this.logic.world.locations.chapel_entrance.flags.visited = true;
    this.weaver.addSeparator(this.proseEl);
    await this.weaver.wait(300);

    this.updateCharSheet();
    this.state = 'exploration';
    this.inputLocked = false;
    this.showExplorationChoices();
  }

  showExplorationChoices() {
    this.clearChoices();
    const loc = this.logic.getLocation();
    const locId = this.logic.world.currentLocation;

    if (locId === 'chapel_entrance') {
      this.addChoice('Push open the chapel doors and enter the nave', 'action', () => this.moveToLocation('chapel_nave'));
      this.addChoice('Examine the iron gate to the side', 'investigate', () => this.investigateObject('iron_gate'));
      this.addChoice('Turn back toward the forest path', 'action', () => this.moveToLocation('forest_path'));
    } else if (locId === 'chapel_nave') {
      const altarObj = loc.objects.find(o => o.id === 'altar');
      if (!altarObj.investigated) {
        this.addChoice('Approach the defiled altar', 'investigate', () => this.investigateAltar());
      }
      const ghostNpc = this.logic.world.npcs.ghost_priest;
      if (!ghostNpc.flags.spoken) {
        this.addChoice('Address the spectral figure', 'dialogue-choice', () => this.talkToGhost());
      } else if (ghostNpc.flags.questGiven) {
        const stairsObj = loc.objects.find(o => o.id === 'crypt_stairs');
        if (stairsObj.state === 'revealed') {
          this.addChoice('Descend the revealed stairs to the crypt', 'action', () => this.moveToLocation('chapel_crypt'));
        }
      }
      if (this.logic.player.hp < this.logic.player.maxHp) {
        const potion = this.logic.player.inventory.find(i => i.name === 'Potion of Healing' && i.quantity > 0);
        if (potion) {
          this.addChoice(`Drink a Potion of Healing (${potion.quantity} remaining)`, 'action', () => this.usePotion());
        }
      }
      this.addChoice('Return to the chapel entrance', 'action', () => this.moveToLocation('chapel_entrance'));
    } else if (locId === 'chapel_crypt') {
      const loc2 = this.logic.world.locations.chapel_crypt;
      if (loc2.enemies && loc2.enemies.length > 0 && !loc2.flags.bossDefeated) {
        // Combat triggers automatically
      } else {
        this.addChoice('Examine the sealed sarcophagus', 'investigate', () => this.investigateSarcophagus());
        this.addChoice('Return up the stairs', 'action', () => this.moveToLocation('chapel_nave'));
      }
    } else if (locId === 'forest_path') {
      this.addChoice('Follow the smoke toward the village ruins', 'action', () => this.moveToLocation('village_ruins'));
      this.addChoice('Return to the chapel', 'action', () => this.moveToLocation('chapel_entrance'));
    } else if (locId === 'village_ruins') {
      const mira = this.logic.world.npcs.survivor_mira;
      if (!mira.flags.spoken) {
        this.addChoice('Approach the figure by the well carefully', 'dialogue-choice', () => this.talkToMira());
      } else {
        this.addChoice('Speak with Mira again', 'dialogue-choice', () => this.talkToMiraAgain());
      }
      this.addChoice('Head back along the ashen path', 'action', () => this.moveToLocation('forest_path'));
    }
    
    // Add Save Game option in all non-combat locations
    this.addChoice('Save Game (Slot 1)', 'system', () => this.menu.saveGame(1));
  }

  async moveToLocation(locId) {
    this.inputLocked = true;
    this.clearChoices();
    const result = this.logic.moveToLocation(locId);
    if (!result.success) { this.inputLocked = false; this.showExplorationChoices(); return; }

    const loc = result.location;
    const mood = loc.mood || 'silence';
    this.audio.setMood(mood);
    this.map.setMood(mood);

    document.getElementById('location-name').textContent = loc.name;
    this.weaver.addSeparator(this.proseEl);

    // Shadow sim tick
    const tickMsg = this.shadow.tick();
    if (tickMsg) this.showWorldTicker(tickMsg);
    const event = this.shadow.getEvent();
    if (event) {
      await this.weaver.displaySingle(this.proseEl, event.message, 'system', 300);
    }

    // Location narrative
    const key = `${locId}_${loc.flags.visited ? 'return' : 'first'}`;
    let texts = this.weaver.getNarrative(key);
    if (!texts) texts = this.weaver.getNarrative(`${locId}_first`);
    if (texts) await this.weaver.displayProse(this.proseEl, texts, '', 500);

    // Check for auto-combat
    if (locId === 'chapel_crypt' && !this.logic.world.locations.chapel_crypt.flags.bossDefeated) {
      await this.weaver.wait(500);
      await this.startCombat(['skeleton_warrior', 'skeleton_warrior']);
      return;
    }

    // NPC introductions
    if (locId === 'chapel_nave' && !this.logic.world.npcs.ghost_priest.flags.spoken) {
      const ghostTexts = this.weaver.getNarrative('ghost_priest_first');
      if (ghostTexts) await this.weaver.displayProse(this.proseEl, ghostTexts, '', 500);
    }
    if (locId === 'village_ruins' && !this.logic.world.npcs.survivor_mira.flags.spoken) {
      const miraTexts = this.weaver.getNarrative('mira_first');
      if (miraTexts) await this.weaver.displayProse(this.proseEl, miraTexts, '', 500);
    }

    this.updateCharSheet();
    this.inputLocked = false;
    this.showExplorationChoices();
  }

  async investigateObject(objId) {
    this.inputLocked = true;
    this.clearChoices();
    const obj = this.logic.interactObject(objId);
    if (!obj) { this.inputLocked = false; this.showExplorationChoices(); return; }

    if (obj.locked) {
      await this.weaver.displaySingle(this.proseEl, `The iron gate is sealed with a heavy lock, rust-welded into permanence. You test it — solid. This will require either a key or considerable <span class="highlight">strength</span>.`, '', 400);

      this.inputLocked = false;
      this.clearChoices();
      this.addChoice('Force the gate (Strength check, DC 15)', 'action', async () => {
        this.inputLocked = true;
        this.clearChoices();
        const check = this.logic.rollCheck('STR', obj.dc);
        await this.showDiceResult(check.roll, `STR check: ${check.roll} + ${check.mod} + ${check.proficiency} = ${check.total} vs DC ${check.dc}`);
        if (check.success) {
          obj.locked = false; obj.state = 'open';
          this.audio.playSfx('door');
          await this.weaver.displaySingle(this.proseEl, `Metal screams. The lock surrenders. The gate swings open with a groan that echoes across the hillside.`, '', 400);
          await this.weaver.displaySingle(this.proseEl, `Beyond it, a forgotten garden — overgrown, wild, but with herbs that any healer would recognize. You pocket what you can.`, '', 400);
          this.logic.player.inventory.push({ name: 'Healing Herbs', type: 'consumable', effect: '1d4+1', quantity: 3 });
          await this.weaver.displaySingle(this.proseEl, '<span class="heal">Gained: Healing Herbs ×3</span>', 'system', 200);
        } else {
          await this.weaver.displaySingle(this.proseEl, this.weaver.getRandomNarrative('perception_fail'), 'narration', 400);
          await this.weaver.displaySingle(this.proseEl, `The gate holds. Your hands ache from the effort. Perhaps you'll find another way.`, '', 400);
        }
        this.updateCharSheet();
        this.inputLocked = false;
        this.showExplorationChoices();
      });
      this.addChoice('Leave it for now', 'action', () => { this.clearChoices(); this.showExplorationChoices(); });
    } else {
      this.inputLocked = false;
      this.showExplorationChoices();
    }
  }

  async investigateAltar() {
    this.inputLocked = true;
    this.clearChoices();
    const altar = this.logic.interactObject('altar');
    altar.investigated = true;

    const check = this.logic.rollCheck('WIS', 12);
    await this.showDiceResult(check.roll, `WIS (Perception): ${check.roll} + ${check.mod} + ${check.proficiency} = ${check.total} vs DC 12`);

    if (check.success) {
      await this.weaver.displaySingle(this.proseEl, this.weaver.getRandomNarrative('perception_success'), 'narration', 400);
      await this.weaver.displaySingle(this.proseEl, `The sigils on the altar pulse with a faint, sickly luminescence — necromantic binding marks. This altar isn't just defiled. It's an <span class="highlight">anchor</span>. Something is tethered here, drawing power from the desecration. The undead below aren't just animated — they're <span class="damage">sustained</span>.`, '', 500);
      await this.weaver.displaySingle(this.proseEl, `Cleansing this altar might sever the connection. But it would require divine energy — a <span class="highlight">spell slot</span> and conviction.`, '', 400);

      // Reveal crypt stairs
      const stairs = this.logic.getLocation().objects.find(o => o.id === 'crypt_stairs');
      stairs.state = 'revealed';
      await this.weaver.displaySingle(this.proseEl, `Your investigation also reveals a seam in the floor behind the altar. Stairs, descending into darkness.`, '', 400);
    } else {
      await this.weaver.displaySingle(this.proseEl, this.weaver.getRandomNarrative('perception_fail'), 'narration', 400);
      await this.weaver.displaySingle(this.proseEl, `The altar is defiled — that much is obvious. But the specifics of the dark ritual elude you. The symbols swim before your eyes, resisting comprehension.`, '', 400);
      // Still reveal stairs but with less info
      const stairs = this.logic.getLocation().objects.find(o => o.id === 'crypt_stairs');
      stairs.state = 'revealed';
      await this.weaver.displaySingle(this.proseEl, `Still, your hands find a hidden seam. Stairs, leading down.`, '', 400);
    }

    this.inputLocked = false;
    this.showExplorationChoices();
  }

  async talkToGhost() {
    this.inputLocked = true;
    this.clearChoices();
    this.audio.setMood('sacred');
    const ghost = this.logic.world.npcs.ghost_priest;
    ghost.flags.spoken = true;

    await this.weaver.displaySingle(this.proseEl, `<span class="highlight">"I am — was — Father Aldric. Keeper of this chapel for forty years. Now I am... kept by it."</span>`, 'dialogue', 500);
    await this.weaver.displaySingle(this.proseEl, `The spectre's form flickers, grief rippling through him like wind through smoke.`, 'narration', 400);
    await this.weaver.displaySingle(this.proseEl, `<span class="highlight">"They came three nights ago. Robed figures. They killed my flock, defiled my altar, and opened the crypts below. The dead rose. I... I tried to stop them. You can see how well that went."</span>`, 'dialogue', 600);
    await this.weaver.displaySingle(this.proseEl, `He turns to face you fully, and his eyes — translucent, ancient, burning with purpose — lock onto yours.`, 'narration', 400);
    await this.weaver.displaySingle(this.proseEl, `<span class="highlight">"Paladin. Cleanse my altar. Descend to the crypt. Destroy whatever anchor they've placed there. Free my flock. Free <em>me</em>."</span>`, 'dialogue', 500);

    ghost.flags.questGiven = true;
    ghost.relation = 'friendly';
    ghost.disposition = 75;
    await this.weaver.displaySingle(this.proseEl, '<span class="roll">QUEST: Purify the Shattered Chapel</span>', 'system', 200);

    this.inputLocked = false;
    this.clearChoices();

    if (this.logic.player.spellSlots[1] > 0) {
      this.addChoice('Cleanse the altar now (expend 1st-level spell slot)', 'action', () => this.cleanseAltar());
    }
    this.addChoice('Ask about the crypt below', 'dialogue-choice', async () => {
      this.inputLocked = true;
      this.clearChoices();
      await this.weaver.displaySingle(this.proseEl, `<span class="highlight">"Below lie two of my former guardians — parishioners who volunteered to watch over the dead. Now they are the dead they watched. And beyond them, a sealed sarcophagus. Whatever the cultists anchored their ritual to... it's in there."</span>`, 'dialogue', 500);
      this.inputLocked = false;
      this.showExplorationChoices();
    });
    this.addChoice('Continue exploring', 'action', () => { this.clearChoices(); this.showExplorationChoices(); });
  }

  async cleanseAltar() {
    this.inputLocked = true;
    this.clearChoices();
    this.logic.player.spellSlots[1]--;

    await this.weaver.displaySingle(this.proseEl, `You place your holy symbol upon the altar and speak the words of purification. Light — not the cold silver of the moon but the warm gold of conviction — pours from your hands.`, '', 500);
    this.audio.playSfx('magic');
    this.particles.emit(1280, 720, 30, '#d4a56a', 100, 2);
    await this.weaver.displaySingle(this.proseEl, `The dark sigils <span class="highlight">scream</span>. You feel them resist — a pressure behind your eyes, a whisper that says <em>stop, this is not yours to heal</em> — but you push through. The light intensifies.`, '', 600);
    await this.weaver.displaySingle(this.proseEl, `Then silence. The sigils are gone. The marble is clean — cracked, aged, but <span class="heal">clean</span>. Father Aldric's form brightens visibly. He says nothing. He doesn't need to.`, '', 500);

    this.logic.world.locations.chapel_nave.flags.altarCleansed = true;
    this.logic.world.npcs.ghost_priest.flags.appeased = true;
    await this.weaver.displaySingle(this.proseEl, `<span class="heal">The undead below have been weakened. Their AC and HP are reduced.</span>`, 'system', 200);

    // Weaken the undead
    this.logic.world.npcs.skeleton_warrior.ac = 11;
    this.logic.world.npcs.skeleton_warrior.hp = 9;
    this.logic.world.npcs.skeleton_warrior.maxHp = 9;

    this.updateCharSheet();
    this.inputLocked = false;
    this.showExplorationChoices();
  }

  async usePotion() {
    this.inputLocked = true;
    this.clearChoices();
    const result = this.logic.useConsumable('Potion of Healing');
    if (result) {
      const text = this.weaver.getRandomNarrative('player_heals', { amount: result.amount });
      await this.weaver.displaySingle(this.proseEl, text, '', 400);
    }
    this.updateCharSheet();
    this.inputLocked = false;
    this.showExplorationChoices();
  }

  async talkToMira() {
    this.inputLocked = true;
    this.clearChoices();
    this.audio.setMood('sorrow');
    const mira = this.logic.world.npcs.survivor_mira;
    mira.flags.spoken = true;

    await this.weaver.displaySingle(this.proseEl, `You raise your hands, palms open. Universal language: <em>I am not the thing you fear.</em>`, 'narration', 400);

    const check = this.logic.rollCheck('CHA', 13);
    await this.showDiceResult(check.roll, `CHA (Persuasion): ${check.roll} + ${check.mod} + ${check.proficiency} = ${check.total} vs DC 13`);

    if (check.success) {
      mira.relation = 'cautious';
      mira.disposition = 50;
      await this.weaver.displaySingle(this.proseEl, `Something in your bearing — the holy symbol, perhaps, or the way you hold yourself — lets the steel leave her eyes. Not entirely. But enough.`, 'narration', 400);
      await this.weaver.displaySingle(this.proseEl, `<span class="highlight">"Mira."</span> She says it like a concession. <span class="highlight">"I was a baker's apprentice. Before. Now I'm... still here. Which is more than I can say for anyone else."</span>`, 'dialogue', 500);
      await this.weaver.displaySingle(this.proseEl, `<span class="highlight">"They came from the chapel. The dead. Three nights ago, they just... walked out. Into the village. And they didn't stop."</span>`, 'dialogue', 500);
      await this.weaver.displaySingle(this.proseEl, `She pulls the blanket tighter. <span class="highlight">"If you're going up there — to the chapel — you should know. The fire didn't stop them. Nothing stopped them. They just... kept coming back."</span>`, 'dialogue', 500);
    } else {
      mira.relation = 'hostile';
      await this.weaver.displaySingle(this.proseEl, `<span class="highlight">"I said DON'T."</span> The knife appears — small, bread knife maybe, but held with desperate competence. <span class="highlight">"You look like the ones who brought the dead. Robes and symbols and promises. Get away from me."</span>`, 'dialogue', 500);
      await this.weaver.displaySingle(this.proseEl, `You retreat. Slowly. Some walls cannot be breached with words alone.`, 'narration', 400);
    }

    this.inputLocked = false;
    this.showExplorationChoices();
  }

  async talkToMiraAgain() {
    this.inputLocked = true;
    this.clearChoices();
    const mira = this.logic.world.npcs.survivor_mira;
    if (mira.relation === 'hostile') {
      await this.weaver.displaySingle(this.proseEl, `Mira watches you approach with the knife visible. Trust will take more than words now.`, 'narration', 400);
    } else {
      await this.weaver.displaySingle(this.proseEl, `<span class="highlight">"Still alive? Good. That's becoming rare around here."</span> A ghost of dark humor crosses her face.`, 'dialogue', 400);
      if (this.logic.world.globalFlags.chapelPurified) {
        await this.weaver.displaySingle(this.proseEl, `<span class="highlight">"I can feel it, you know. Something changed. The air feels... lighter. Did you do that?"</span> Her eyes search yours. For the first time, there's something other than fear in them. Something like <span class="highlight">hope</span>.`, 'dialogue', 500);
      }
    }
    this.inputLocked = false;
    this.showExplorationChoices();
  }

  async startCombat(enemyIds) {
    this.state = 'combat';
    this.inputLocked = true;
    this.clearChoices();
    this.audio.setMood('combat');
    this.map.setMood('combat');
    
    document.getElementById('prose-panel').style.maxWidth = '60%';
    document.getElementById('prose-panel').style.margin = '0';
    document.getElementById('choices-panel').style.maxWidth = '60%';
    document.getElementById('choices-panel').style.margin = '0';
    document.getElementById('combat-sidebar').classList.remove('hidden');

    const initData = this.combat.startCombat(enemyIds);
    this.map.initCombatGrid(null, initData.enemies);

    await this.weaver.displaySingle(this.proseEl, '<span class="roll">⚔ COMBAT INITIATED ⚔</span>', 'system', 300);

    let initText = 'Initiative: ';
    for (const t of initData.turnOrder) {
      initText += `${t.name} (${t.initiative}) → `;
    }
    await this.weaver.displaySingle(this.proseEl, initText.slice(0, -3), 'system', 200);

    this.inputLocked = false;
    this.processCombatTurn();
  }

  async processCombatTurn() {
    const turn = this.combat.getCurrentTurn();
    if (!turn) return;

    document.getElementById('turn-tracker').textContent = `ROUND ${this.combat.round} — ${turn.name}'s Turn`;

    if (turn.type === 'player') {
      this.showCombatChoices();
    } else {
      this.inputLocked = true;
      this.clearChoices();
      await this.weaver.wait(600);

      const result = this.combat.enemyTurn(turn);
      if (result) {
        const logEl = document.getElementById('combat-log');
        if (result.hit) {
          this.audio.playSfx('hit');
          const text = this.weaver.getRandomNarrative('enemy_hit', { damage: result.damage });
          await this.weaver.displaySingle(logEl, text, 'combat-text', 400);
          this.particles.emit(1280, 720, 15, '#c45a4a', 80, 1);
        } else {
          this.audio.playSfx('miss');
          const text = this.weaver.getRandomNarrative('enemy_miss');
          await this.weaver.displaySingle(logEl, text, 'combat-text', 400);
        }
        await this.weaver.displaySingle(logEl, `<span class="roll">${result.enemyName}: d20(${result.attackRoll}) + ${this.combat.enemies[0]?.attack?.bonus || '?'} = ${result.attackTotal} vs AC ${this.logic.player.ac}${result.hit ? ` — HIT for ${result.damage}` : ' — MISS'}</span>`, 'system', 200);
      }

      this.updateCharSheet();
      const next = this.combat.nextTurn();
      if (next.combatOver) {
        await this.endCombat(next.victory);
      } else {
        this.inputLocked = false;
        this.processCombatTurn();
      }
    }
  }

  showCombatChoices() {
    const combatActionsEl = document.getElementById('combat-actions');
    combatActionsEl.innerHTML = '';
    
    const addCombatChoice = (text, callback) => {
      const idx = combatActionsEl.children.length + 1;
      const btn = document.createElement('button');
      btn.className = `combat-action-btn`;
      btn.innerHTML = `<span class="choice-key">[${idx}]</span>${text}`;
      btn.addEventListener('click', () => {
        if (this.inputLocked) return;
        this.audio.init();
        callback();
      });
      combatActionsEl.appendChild(btn);
    };

    this.combat.awaitingMove = true;
    addCombatChoice('Move (click grid)', () => {
      // Handled by click listener
    });

    const playerPos = this.map.combatPositions.find(p => p.type === 'player');
    const enemyPos = this.map.combatPositions.find(p => p.type === 'enemy');
    
    // Simple adjacency check (within 1.5 cell size)
    const isAdjacent = playerPos && enemyPos && 
      Math.hypot(playerPos.x - enemyPos.x, playerPos.y - enemyPos.y) < 90;

    if (isAdjacent) {
      addCombatChoice('Attack with Longsword', () => this.playerCombatAttack());
      if (this.logic.player.spellSlots[1] > 0) {
        addCombatChoice('Divine Smite (bonus 2d8 radiant)', () => this.playerCombatSmite());
      }
    }

    const potion = this.logic.player.inventory.find(i => i.name === 'Potion of Healing' && i.quantity > 0);
    if (potion && this.logic.player.hp < this.logic.player.maxHp) {
      addCombatChoice(`Drink Potion of Healing (${potion.quantity})`, () => this.playerCombatHeal());
    }
  }

  async playerCombatMove(cell) {
    this.combat.awaitingMove = false;
    const playerPos = this.map.combatPositions.find(p => p.type === 'player');
    if (playerPos) {
      playerPos.x = cell.x + cell.w / 2;
      playerPos.y = cell.y + cell.h / 2;
    }
    
    const logEl = document.getElementById('combat-log');
    await this.weaver.displaySingle(logEl, `You reposition yourself on the battlefield.`, 'combat-text', 200);
    
    this.showCombatChoices();
  }

  async playerCombatAttack() {
    this.inputLocked = true;
    this.clearChoices();
    
    // Check adjacency again just in case
    const playerPos = this.map.combatPositions.find(p => p.type === 'player');
    const enemyPos = this.map.combatPositions.find(p => p.type === 'enemy');
    const isAdjacent = playerPos && enemyPos && 
      Math.hypot(playerPos.x - enemyPos.x, playerPos.y - enemyPos.y) < 90;
      
    if (!isAdjacent) {
      const logEl = document.getElementById('combat-log');
      await this.weaver.displaySingle(logEl, `Too far away—move closer first.`, 'combat-text', 200);
      this.inputLocked = false;
      this.showCombatChoices();
      return;
    }

    const result = this.combat.playerAttack(0);
    if (!result) { this.inputLocked = false; return; }

    const logEl = document.getElementById('combat-log');
    await this.showDiceResult(result.attackRoll, `Attack: d20(${result.attackRoll}) + ${this.logic.getMod('STR')} + ${this.logic.player.proficiency} = ${result.attackTotal} vs AC ${result.targetAc}`);

    if (result.crit) {
      this.audio.playSfx('crit');
      const text = this.weaver.getRandomNarrative('attack_crit', { damage: result.damage });
      await this.weaver.displaySingle(logEl, text, 'combat-text', 400);
      this.particles.emit(1280, 600, 25, '#d4a56a', 120, 1.5);
    } else if (result.hit) {
      this.audio.playSfx('hit');
      const text = this.weaver.getRandomNarrative('attack_hit', { damage: result.damage });
      await this.weaver.displaySingle(logEl, text, 'combat-text', 400);
      this.particles.emit(1280, 600, 12, '#c49a6c', 60, 1);
    } else {
      this.audio.playSfx('miss');
      const text = this.weaver.getRandomNarrative('attack_miss');
      await this.weaver.displaySingle(logEl, text, 'combat-text', 400);
    }

    const rollDetail = `d20(${result.attackRoll}) = ${result.attackTotal} vs AC ${result.targetAc}${result.hit ? ` — ${result.damage} dmg` : ' — MISS'}`;
    await this.weaver.displaySingle(logEl, `<span class="roll">${rollDetail}</span>`, 'system', 100);

    if (result.defeated) {
      const text = this.weaver.getRandomNarrative('enemy_defeated');
      await this.weaver.displaySingle(logEl, text, '', 400);
    }

    this.map.updateCombatPositions(this.combat.enemies);
    this.updateCharSheet();

    const next = this.combat.nextTurn();
    if (next.combatOver) {
      await this.endCombat(next.victory);
    } else {
      this.inputLocked = false;
      this.processCombatTurn();
    }
  }

  async playerCombatSmite() {
    this.inputLocked = true;
    this.clearChoices();
    
    const playerPos = this.map.combatPositions.find(p => p.type === 'player');
    const enemyPos = this.map.combatPositions.find(p => p.type === 'enemy');
    const isAdjacent = playerPos && enemyPos && 
      Math.hypot(playerPos.x - enemyPos.x, playerPos.y - enemyPos.y) < 90;
      
    if (!isAdjacent) {
      const logEl = document.getElementById('combat-log');
      await this.weaver.displaySingle(logEl, `Too far away—move closer first.`, 'combat-text', 200);
      this.inputLocked = false;
      this.showCombatChoices();
      return;
    }
    
    this.logic.player.spellSlots[1]--;

    const result = this.combat.playerAttack(0);
    if (!result) { this.inputLocked = false; return; }

    const logEl = document.getElementById('combat-log');
    await this.showDiceResult(result.attackRoll, `Smite Attack: d20(${result.attackRoll}) = ${result.attackTotal} vs AC ${result.targetAc}`);

    if (result.hit) {
      // Add smite damage
      const smiteDmg = this.logic.roll(8, 2);
      const totalSmite = smiteDmg.total;
      const target = this.combat.enemies[0];
      if (target) target.hp = Math.max(0, target.hp - totalSmite);
      result.damage += totalSmite;
      result.defeated = target && target.hp <= 0;

      this.audio.playSfx('crit');
      this.audio.playSfx('magic');
      this.particles.emit(1280, 600, 40, '#ffd700', 150, 2);
      await this.weaver.displaySingle(logEl, `Your blade erupts with <span class="highlight">golden radiance</span>. Divine wrath made manifest — the smite tears through dead flesh and dark magic alike. The creature <em>burns</em>. <span class="damage">${result.damage} total damage</span> (${smiteDmg.total} radiant).`, 'combat-text', 500);
    } else {
      this.audio.playSfx('miss');
      await this.weaver.displaySingle(logEl, `The divine energy crackles along your blade — but the strike goes wide. The radiance fades, wasted. The spell slot is spent regardless.`, 'combat-text', 400);
    }

    if (result.defeated) {
      const text = this.weaver.getRandomNarrative('enemy_defeated');
      await this.weaver.displaySingle(logEl, text, '', 400);
    }

    this.map.updateCombatPositions(this.combat.enemies);
    this.updateCharSheet();

    const next = this.combat.nextTurn();
    if (next.combatOver) {
      await this.endCombat(next.victory);
    } else {
      this.inputLocked = false;
      this.processCombatTurn();
    }
  }

  async playerCombatHeal() {
    this.inputLocked = true;
    this.clearChoices();
    const logEl = document.getElementById('combat-log');
    const result = this.logic.useConsumable('Potion of Healing');
    if (result) {
      const text = this.weaver.getRandomNarrative('player_heals', { amount: result.amount });
      await this.weaver.displaySingle(logEl, text, 'combat-text', 400);
    }
    this.updateCharSheet();

    const next = this.combat.nextTurn();
    if (next.combatOver) {
      await this.endCombat(next.victory);
    } else {
      this.inputLocked = false;
      this.processCombatTurn();
    }
  }

  async endCombat(victory) {
    this.combat.active = false;
    this.map.hideCombatGrid();
    this.state = 'exploration';
    
    document.getElementById('prose-panel').style.maxWidth = '900px';
    document.getElementById('prose-panel').style.margin = '0 auto';
    document.getElementById('choices-panel').style.maxWidth = '900px';
    document.getElementById('choices-panel').style.margin = '0 auto';
    document.getElementById('combat-sidebar').classList.add('hidden');

    if (victory) {
      this.audio.setMood('tension');
      this.map.setMood('dread');
      await this.weaver.displaySingle(this.proseEl, '<span class="roll">⚔ COMBAT RESOLVED — VICTORY ⚔</span>', 'system', 300);
      await this.weaver.displaySingle(this.proseEl, `Silence returns. The kind of silence that follows violence — not peaceful, but exhausted. Bones settle. Dust drifts. Your breathing is the loudest sound in the crypt.`, '', 500);

      this.logic.world.locations.chapel_crypt.flags.bossDefeated = true;
      this.logic.world.locations.chapel_crypt.enemies = [];

      // XP
      this.logic.player.xp += 100;
      await this.weaver.displaySingle(this.proseEl, '<span class="roll">+100 XP</span>', 'system', 200);

      this.shadow.tick();
    } else {
      this.state = 'gameover';
      this.audio.setMood('sorrow');
      this.map.setMood('sorrow');
      await this.weaver.displaySingle(this.proseEl, '<span class="damage">You fall.</span>', 'system', 500);
      await this.weaver.displaySingle(this.proseEl, `The cold stone meets your back. Above you, the vaulted ceiling of the crypt spins and darkens. The last thing you see is the dim glow of those empty eye sockets, watching without comprehension as the paladin's light goes out.`, '', 600);
      await this.weaver.displaySingle(this.proseEl, `<em>But death, in this place, is not always the end...</em>`, 'narration', 800);
      this.clearChoices();
      this.addChoice('Rise again (restart)', 'action', () => location.reload());
      return;
    }

    this.updateCharSheet();
    this.inputLocked = false;
    this.showExplorationChoices();
  }

  async investigateSarcophagus() {
    this.inputLocked = true;
    this.clearChoices();

    const check = this.logic.rollCheck('STR', 16);
    await this.showDiceResult(check.roll, `STR check: ${check.roll} + ${check.mod} + ${check.proficiency} = ${check.total} vs DC 16`);

    if (check.success) {
      this.audio.playSfx('door');
      await this.weaver.displaySingle(this.proseEl, `The sarcophagus lid grinds open. Inside, no body — instead, a <span class="highlight">dark crystal orb</span> pulses with necrotic energy. This is the anchor. The source.`, '', 500);

      this.clearChoices();
      this.inputLocked = false;
      this.addChoice('Destroy the orb with your sword', 'combat-choice', async () => {
        this.inputLocked = true;
        this.clearChoices();
        this.audio.playSfx('crit');
        this.particles.emit(1280, 720, 50, '#8040c0', 200, 3);
        await this.weaver.displaySingle(this.proseEl, `Your blade descends. The crystal shatters with a sound like a thousand voices screaming in unison — then silence. True silence. The oppressive weight that hung over this place lifts like a curtain.`, '', 600);
        this.logic.world.globalFlags.chapelPurified = true;
        this.logic.world.factions.undead_horde.power = 0;
        this.audio.setMood('sacred');
        this.map.setMood('sacred');
        await this.weaver.displaySingle(this.proseEl, `Light — real light, not your torch — begins to filter through cracks in the stone above. Dawn. As if the sun itself was waiting for permission.`, '', 500);
        await this.weaver.displaySingle(this.proseEl, '<span class="heal">QUEST COMPLETE: Purify the Shattered Chapel</span>', 'system', 300);
        await this.weaver.displaySingle(this.proseEl, '<span class="roll">+250 XP</span>', 'system', 200);
        this.logic.player.xp += 250;
        this.weaver.addSeparator(this.proseEl);
        await this.weaver.displaySingle(this.proseEl, `The chapel is cleansed. The dead may rest. But the robed figures who began this — they're still out there. And Ember Hollow still smolders.`, '', 500);
        await this.weaver.displaySingle(this.proseEl, `<em>This is not an ending. It is a beginning.</em>`, 'narration', 600);
        await this.weaver.displaySingle(this.proseEl, '<span class="roll">END OF CHAPTER ZERO</span>', 'system', 400);
        await this.weaver.displaySingle(this.proseEl, '<span class="roll">Thank you for playing the Chronicle: Zero prototype.</span>', 'system', 400);
        this.updateCharSheet();
        this.inputLocked = false;
        this.clearChoices();
        this.addChoice('Explore the world further', 'action', () => {
          this.clearChoices();
          this.showExplorationChoices();
        });
        this.addChoice('Begin again', 'action', () => location.reload());
      });
      this.addChoice('Take the orb (risky)', 'investigate', async () => {
        this.inputLocked = true;
        this.clearChoices();
        const wis = this.logic.rollCheck('WIS', 18);
        await this.showDiceResult(wis.roll, `WIS save: ${wis.total} vs DC 18`);
        if (!wis.success) {
          this.logic.applyDamage('player', 8);
          this.audio.playSfx('hit');
          await this.weaver.displaySingle(this.proseEl, `The moment your fingers touch the orb, <span class="damage">necrotic energy</span> lances up your arm. Pain — pure, white, annihilating pain. <span class="damage">8 necrotic damage</span>. You wrench your hand back.`, '', 500);
          await this.weaver.displaySingle(this.proseEl, `The orb pulses, mocking. It cannot be taken. Only destroyed.`, '', 400);
        } else {
          await this.weaver.displaySingle(this.proseEl, `You grip the orb. It burns — but you hold. Your paladin's oath blazes against the darkness, and for a moment you contain the necrotic energy. But you can feel it eroding your will. This thing must be destroyed. Soon.`, '', 500);
          this.logic.player.inventory.push({ name: 'Necrotic Orb', type: 'quest' });
          this.logic.player.conditions.push('Corrupted');
        }
        this.updateCharSheet();
        this.inputLocked = false;
        this.showExplorationChoices();
      });
    } else {
      await this.weaver.displaySingle(this.proseEl, `The lid doesn't budge. Sealed with more than stone — magic reinforces it. You'll need to find another way, or return stronger.`, '', 400);
      this.inputLocked = false;
      this.showExplorationChoices();
    }
  }

  update(dt) {
    this.map.update(dt);
    this.particles.update(dt);
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.map.draw(this.ctx);
    this.particles.draw(this.ctx);
  }

  start() {
    const gameLoop = (timestamp) => {
      const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
      this.lastTime = timestamp;
      this.update(dt);
      this.draw();
      requestAnimationFrame(gameLoop);
    };
    requestAnimationFrame((ts) => {
      this.lastTime = ts;
      requestAnimationFrame(gameLoop);
    });
  }

  startAdventure(isLoad = false) {
    if (isLoad) {
      this.updateCharSheet();
      this.state = 'exploration';
      this.inputLocked = false;
      this.showExplorationChoices();
      this.audio.setMood(this.logic.getLocation().mood || 'silence');
    } else {
      this.runIntro();
    }
  }
}