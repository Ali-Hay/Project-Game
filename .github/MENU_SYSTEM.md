# Main Menu System Architecture

## File Structure

```
Project Game/
├── index.html                 (main entry point - shows menu OR game)
├── menu.js                    (Menu class, handles all menu logic)
├── worlds/
│   ├── preset_chapel_horrors.json
│   ├── preset_ruins_ascendant.json
│   └── preset_mystic_sanctum.json
└── .github/
    ├── WORLD_CONFIG.md
    ├── WORLD_BUILDER.md
    └── MENU_SYSTEM.md (this file)
```

## Menu.js Structure

```javascript
class Menu {
  constructor(game) {
    this.game = game;
    this.currentScreen = 'main';  // 'main', 'presets', 'builder', 'load'
    this.builderState = {
      step: 0,                     // Step 1-6 of world builder
      worldData: {}               // Accumulates as user progresses
    };
  }
  
  async show() {
    // Clear game UI
    // Display menu UI
    this.renderMainMenu();
  }
  
  renderMainMenu() {
    // [1] New World (Presets)
    // [2] Build Your Own World
    // [3] Load Saved Game
  }
  
  async showPresets() {
    // Load all preset worlds from .github/worlds/
    // Display list with previews
    // On select → onWorldSelected()
  }
  
  async showBuilder() {
    // Initialize builderState
    // Show step 1 (metadata)
    // On next → advance step
  }
  
  async showLoads() {
    // Scan localStorage for saved worlds
    // Display with timestamps
    // On select → onWorldSelected()
  }
  
  async onWorldSelected(worldJson) {
    // Validate worldJson against WORLD_CONFIG schema
    // Store in localStorage
    // Hide menu, start game
    this.game.logic.initializeWithWorld(worldJson);
    this.game.runIntro();
  }
  
  validateWorld(world) {
    // Strict validation against WORLD_CONFIG.md
    const required = ['meta', 'player', 'locations', 'npcs', 'factions', 'globalFlags'];
    for (const field of required) {
      if (!world[field]) return false;
    }
    // Deeper validation...
    return true;
  }
}
```

## index.html Changes

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="style.css">
  <link href="https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,300;0,400;0,600;1,300;1,400&family=JetBrains+Mono:wght@300;400&display=swap" rel="stylesheet">
</head>
<body>
  <div id="gameContainer">
    <canvas id="gameCanvas" width="2560" height="1440"></canvas>
    
    <!-- MENU LAYER (initially visible) -->
    <div id="menu-layer" class="visible">
      <div id="menu-screen-main" class="menu-screen active">
        <!-- Main menu content -->
      </div>
      <div id="menu-screen-presets" class="menu-screen">
        <!-- Preset list -->
      </div>
      <div id="menu-screen-builder" class="menu-screen">
        <!-- World builder steps -->
      </div>
      <div id="menu-screen-load" class="menu-screen">
        <!-- Saved games list -->
      </div>
    </div>
    
    <!-- GAME UI LAYER (initially hidden) -->
    <div id="ui-layer" class="hidden">
      <!-- Existing game UI -->
    </div>
  </div>
  
  <script src="GameObject.js"></script>
  <script src="LogicGate.js"></script>
  <script src="Weaver.js"></script>
  <script src="CombatManager.js"></script>
  <script src="MapRenderer.js"></script>
  <script src="AudioEngine.js"></script>
  <script src="ShadowSim.js"></script>
  <script src="ParticleSystem.js"></script>
  <script src="Game.js"></script>
  <script src="Menu.js"></script>
  <script>
    const canvas = document.getElementById('gameCanvas');
    const game = new Game(canvas);
    const menu = new Menu(game);
    
    // Load presets
    menu.loadPresets().then(() => {
      menu.show();
    });
  </script>
</body>
</html>
```

## CSS Integration (style.css additions)

```css
/* Menu layer overlay */
#menu-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle at 40% 40%, rgba(20, 10, 10, 0.95), rgba(5, 5, 5, 0.99));
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Crimson Pro', serif;
}

#menu-layer.hidden {
  display: none;
}

.menu-screen {
  display: none;
  width: 100%;
  max-width: 800px;
  padding: 60px;
  text-align: center;
  color: #ddd;
}

.menu-screen.active {
  display: block;
  animation: fadeIn 0.5s ease-in;
}

.menu-button {
  display: block;
  width: 100%;
  padding: 16px;
  margin: 12px 0;
  background: rgba(100, 50, 50, 0.3);
  border: 1px solid rgba(150, 80, 80, 0.5);
  color: #ddd;
  font-family: 'Crimson Pro', serif;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.menu-button:hover {
  background: rgba(150, 80, 80, 0.5);
  border-color: rgba(200, 100, 100, 0.8);
  transform: translateX(8px);
}

.menu-button.primary {
  background: rgba(150, 80, 80, 0.6);
  border-color: rgba(200, 100, 100, 0.8);
}

.builder-input {
  width: 100%;
  padding: 12px;
  margin: 8px 0;
  background: rgba(20, 20, 20, 0.8);
  border: 1px solid rgba(100, 100, 100, 0.5);
  color: #ddd;
  font-family: 'JetBrains Mono', monospace;
}

.builder-input:focus {
  outline: none;
  border-color: rgba(150, 150, 150, 0.8);
  background: rgba(30, 30, 30, 0.9);
}
```

## World Loading Flow

```
User launches game.html
↓
Menu.js loads preset worlds from .github/worlds/ (via fetch)
↓
Menu.show() renders main menu UI
↓
User selects:
  ├─ Preset → Menu.showPresets() → onWorldSelected(preset_json)
  ├─ Builder → Menu.showBuilder() → builderStep1() → ... → builderStep6() → onWorldSelected(generated_json)
  └─ Load → Menu.showLoads() → List saved worlds from localStorage → onWorldSelected(saved_json)
↓
Menu.onWorldSelected(worldJson)
  ├─ validateWorld(worldJson)
  ├─ localStorage.setItem('currentWorld', worldJson)
  ├─ game.logic.initializeWithWorld(worldJson)
  ├─ Menu.hide()
  ├─ ui-layer show, menu-layer hide
  └─ Game.runIntro()
```

## Data Validation

Every world that enters onWorldSelected() must:
1. Conform to WORLD_CONFIG.md schema
2. Have all required fields
3. Have valid location connections (no dead ends)
4. Have valid NPC/enemy references
5. Have valid prose template keys

Validation happens in `Menu.validateWorld()`, throws helpful errors.

## Scope for MVP

✅ Main menu screen (3 options)
✅ Load presets from .github/worlds/preset_*.json
✅ Display preset list with name + description
✅ On preset select → load game
✅ Basic localStorage save/load
⚠️ Full world builder (Steps 1-6) → Phase 2 depending on vibe coding progress
