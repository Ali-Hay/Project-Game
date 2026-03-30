class Menu extends GameObject {
  constructor(game) {
    super(0, 0, 0, 0);
    this.name = 'Menu';
    this.game = game;
    this.initUI();
  }

  initUI() {
    this.menuEl = document.createElement('div');
    this.menuEl.id = 'main-menu';
    this.menuEl.innerHTML = `
      <div class="menu-title">CHRONICLE: ZERO</div>
      <div class="menu-buttons" id="menu-main">
        <button class="choice-btn action" onclick="game.menu.showPresets()">New Game</button>
        <button class="choice-btn action" onclick="game.menu.showLoad()">Load Game</button>
        <button class="choice-btn action" onclick="alert('Builder coming soon!')">Build World</button>
      </div>
      <div class="menu-buttons hidden" id="menu-presets">
        <button class="choice-btn action" onclick="game.menu.startPreset('chapel_horrors')">Preset: Chapel Horrors</button>
        <button class="choice-btn" onclick="game.menu.showMain()">Back</button>
      </div>
      <div class="menu-buttons hidden" id="menu-load">
        <div id="save-slots"></div>
        <button class="choice-btn" onclick="game.menu.showMain()">Back</button>
      </div>
    `;
    document.getElementById('ui-layer').appendChild(this.menuEl);
  }

  showMain() {
    document.getElementById('menu-main').classList.remove('hidden');
    document.getElementById('menu-presets').classList.add('hidden');
    document.getElementById('menu-load').classList.add('hidden');
  }

  showPresets() {
    document.getElementById('menu-main').classList.add('hidden');
    document.getElementById('menu-presets').classList.remove('hidden');
    document.getElementById('menu-load').classList.add('hidden');
  }

  async showLoad() {
    document.getElementById('menu-main').classList.add('hidden');
    document.getElementById('menu-presets').classList.add('hidden');
    document.getElementById('menu-load').classList.remove('hidden');
    
    const slotsEl = document.getElementById('save-slots');
    slotsEl.innerHTML = '<div style="color:#9a9590; margin-bottom:10px;">Loading saves...</div>';
    
    if (await SaveData.isAvailable()) {
      const saves = await SaveData.getAll();
      slotsEl.innerHTML = '';
      const keys = Object.keys(saves).filter(k => k.startsWith('save_slot_'));
      if (keys.length === 0) {
        slotsEl.innerHTML = '<div style="color:#9a9590; margin-bottom:10px;">No saved games found.</div>';
      } else {
        for (const key of keys) {
          const btn = document.createElement('button');
          btn.className = 'choice-btn action';
          btn.textContent = `Load ${key.replace('save_slot_', 'Slot ')}`;
          btn.onclick = () => this.loadGame(key);
          slotsEl.appendChild(btn);
        }
      }
    } else {
      slotsEl.innerHTML = '<div style="color:#c45a4a; margin-bottom:10px;">Save storage unavailable.</div>';
    }
  }

  startPreset(presetId) {
    // Basic validation schema check mock
    const isValid = true; 
    if (isValid) {
      this.menuEl.style.display = 'none';
      this.game.startAdventure();
    }
  }

  async loadGame(slotKey) {
    if (await SaveData.isAvailable()) {
      const data = await SaveData.get(slotKey);
      if (data) {
        this.game.logic.initializeWithWorld(data);
        this.menuEl.style.display = 'none';
        this.game.startAdventure(true);
      }
    }
  }

  async saveGame(slotNum) {
    if (await SaveData.isAvailable()) {
      const data = {
        player: this.game.logic.player,
        world: this.game.logic.world
      };
      await SaveData.set(`save_slot_${slotNum}`, data);
      this.game.showWorldTicker(`Game saved to Slot ${slotNum}`);
    }
  }
}