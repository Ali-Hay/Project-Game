class ShadowSim extends GameObject {
  constructor(logicGate) {
    super(0, 0, 0, 0);
    this.name = 'ShadowSim';
    this.logic = logicGate;
    this.tickCounter = 0;
    this.events = [];
    this.tickMessages = [
      'The undead stir beneath the chapel. Their numbers grow.',
      'Smoke rises from the east. Ember Hollow smolders still.',
      'A crow circles the chapel spire three times, then flies north.',
      'The wind carries whispers from the crypt below.',
      'Somewhere distant, steel rings against steel.',
      'The survivors of Ember Hollow huddle closer to their dying fire.',
      'The moon climbs higher. Shadows deepen.',
      'An unnatural cold settles over the hillside.',
    ];
  }

  tick() {
    this.tickCounter++;
    const world = this.logic.world;

    // Faction simulation
    if (this.tickCounter % 3 === 0) {
      // Undead horde grows if not checked
      if (!world.globalFlags.chapelPurified) {
        world.factions.undead_horde.power = Math.min(100, world.factions.undead_horde.power + 2);
      }
      // Survivors weaken over time
      world.factions.survivors.power = Math.max(0, world.factions.survivors.power - 1);
    }

    // Alert system
    if (this.tickCounter > 8 && !world.globalFlags.hordeAlerted && !world.globalFlags.chapelPurified) {
      world.globalFlags.hordeAlerted = true;
      this.events.push({ type: 'alert', message: 'The horde senses your presence. Time grows short.' });
    }

    // Random world ticker
    if (this.tickCounter % 2 === 0 && Math.random() < 0.6) {
      const msg = this.tickMessages[Math.floor(Math.random() * this.tickMessages.length)];
      return msg;
    }
    return null;
  }

  getEvent() {
    return this.events.shift() || null;
  }
}