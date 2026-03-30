class Weaver extends GameObject {
  constructor() {
    super(0, 0, 0, 0);
    this.name = 'Weaver';
    this.typeSpeed = 20;
    this.narrativeTemplates = {
      chapel_entrance_first: [
        `The chapel rises from the hillside like a broken tooth against the bruised sky. Its spire, once proud, now lists at an angle that speaks of violence — not weather, but something deliberate. Something <span class="highlight">angry</span>.`,
        `Dusk has painted everything the color of old blood. The oak doors hang ajar, and from within comes a smell you know too well — cold stone, old incense, and beneath it all, the sweet-rot perfume of the <span class="highlight">restless dead</span>.`,
        `Your hand finds the hilt of your sword. Not drawing — not yet. Just touching. A paladin's prayer spoken in steel and leather.`
      ],
      chapel_entrance_return: [
        `The chapel waits, unchanged. Patient as a predator.`
      ],
      chapel_nave_first: [
        `The nave opens before you like a wound. Pews lie scattered — overturned, splintered — as though a congregation fled in terror and the furniture tried to follow. Moonlight slices through gaps in the vaulted ceiling, casting silver bars across the flagstones.`,
        `At the far end, the <span class="highlight">altar</span> draws your eye. It has been defiled. Dark stains trace sigils you do not recognize across its marble surface, and the holy symbols that once adorned the wall behind it have been inverted. Each one. Deliberately.`,
        `The air is colder here. Your breath ghosts before you. And somewhere in the shadows to your left, you hear — or imagine you hear — the whisper of prayer.`
      ],
      chapel_crypt_first: [
        `The stairs descend into a darkness that your torch assaults but cannot conquer. Each step is slick with moisture, and the air grows thick with the mineral tang of deep earth.`,
        `The crypt reveals itself in grudging increments. Stone sarcophagi line the walls, their lids adorned with the carved likenesses of the faithful departed. All serene. All at peace.`,
        `Except for the two that stand <span class="highlight">open</span>. And the two figures that stand <span class="highlight">between you and the sealed sarcophagus at the far wall</span>. Rusted blades. Empty eye sockets that somehow still <span class="damage">see</span>.`
      ],
      forest_path_first: [
        `The path winds through ash-grey trees, their branches bare despite the season. The ground crunches beneath your boots — not with leaves, but with something finer. Ash. You're walking through the memory of a fire.`,
        `Through the skeletal canopy, you can see smoke rising from somewhere ahead. Not the lazy drift of a campfire, but the thin, persistent thread of something that burned days ago and hasn't quite finished dying.`
      ],
      village_ruins_first: [
        `Ember Hollow. The name seems cruelly literal now. What remains of the village is a geometry of charred timbers and collapsed stone. Foundation lines trace the ghosts of homes, a marketplace, what might have been a school.`,
        `Movement catches your eye. Near what was once a well, a figure crouches. Small. Wrapped in a scorched blanket. Human. <span class="highlight">Alive</span>.`
      ],
      attack_hit: [
        `Your blade finds the gap between corroded plates. The impact jars up your arm — there's resistance, but not the resistance of flesh. More like striking dense wood that screams. <span class="damage">{damage} damage</span>.`,
        `Steel meets bone with a sound like a mallet striking porcelain. Something splinters. The creature staggers. <span class="damage">{damage} damage</span>.`,
        `A clean strike, driven by righteous certainty. The longsword bites deep, and for an instant, you see dim light flicker in those hollow sockets — surprise, perhaps, that the dead can still be hurt. <span class="damage">{damage} damage</span>.`
      ],
      attack_miss: [
        `Your blade cuts air. The creature moves with a jerking, marionette swiftness that defies its rotting frame. Too fast. Wrong-fast.`,
        `The strike glances off ancient armor with a shower of rust. Your arms ring with the deflection. The creature doesn't flinch. It doesn't know how to anymore.`
      ],
      attack_crit: [
        `<span class="highlight">CRITICAL.</span> Your sword blazes with conviction as it descends. The blow is devastating — bone shatters, armor crumples, and for one brilliant instant your blade burns with pale gold light. <span class="damage">{damage} damage</span>.`
      ],
      enemy_hit: [
        `The rusted blade catches you across the forearm. It burns — not just the cut, but something in the corroded metal itself, like touching a fever. <span class="damage">{damage} damage</span>.`,
        `You don't see it coming. The creature's blade scrapes across your chain mail and finds the gap at your hip. Cold. Then hot. <span class="damage">{damage} damage</span>.`
      ],
      enemy_miss: [
        `The creature lunges. Your shield meets dead steel with a sound like a chapel bell, and the blow slides away into nothing.`,
        `You pivot. The rusted blade hisses past your ear close enough to feel the displaced air. Close. Too close.`
      ],
      ghost_priest_first: [
        `The whisper resolves into shape. A figure stands near the broken altar, translucent as morning frost. An old man — a priest, judging by the vestments that ripple in a wind you cannot feel. His face carries the weight of a grief beyond death.`,
        `<span class="highlight">"You should not be here, child of the living."</span> His voice arrives not through your ears but somewhere behind your eyes. <span class="highlight">"But since you are... perhaps the Maker has not abandoned this place after all."</span>`
      ],
      mira_first: [
        `She looks up with eyes that have seen too much fire. Young — barely twenty, if that — but her gaze belongs to someone much older. The blanket slips, revealing burns along her forearm and a makeshift bandage dark with old blood.`,
        `<span class="highlight">"Don't."</span> The word is flat. Not a plea. A warning. Her hand moves beneath the blanket, and you hear the scrape of metal. <span class="highlight">"I've already lost everything worth losing. Don't test what that makes me willing to do."</span>`
      ],
      enemy_defeated: [
        `The creature collapses. Not like a person falls — all at once, like a puppet whose strings are cut simultaneously. Bones clatter against stone. The dim light in its sockets gutters and dies, and what remains is just... remains.`,
      ],
      player_heals: [
        `The potion tastes of honey and iron. Warmth floods through you, and the pain recedes like a tide going out. <span class="heal">{amount} HP restored</span>. You feel the paladin's fire in your blood — dimmer than it was, but still burning.`
      ],
      perception_success: [
        `Your eyes adjust. Your training holds. There — beneath the dust and shadow, something the darkness tried to hide.`
      ],
      perception_fail: [
        `You search, but the shadows keep their counsel. Whatever secrets this place holds, they remain hidden. For now.`
      ]
    };
  }

  getNarrative(key, data = {}) {
    const templates = this.narrativeTemplates[key];
    if (!templates) return null;
    let texts = [...templates];
    return texts.map(t => {
      let result = t;
      for (const [k, v] of Object.entries(data)) {
        result = result.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
      }
      return result;
    });
  }

  getRandomNarrative(key, data = {}) {
    const templates = this.narrativeTemplates[key];
    if (!templates || templates.length === 0) return '';
    let t = templates[Math.floor(Math.random() * templates.length)];
    for (const [k, v] of Object.entries(data)) {
      t = t.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
    }
    return t;
  }

  async displayProse(container, texts, type = '', delay = 400) {
    const indicator = document.getElementById('typing-indicator');
    for (const text of texts) {
      if (indicator) indicator.classList.add('active');
      await this.wait(delay);
      if (indicator) indicator.classList.remove('active');
      const block = document.createElement('div');
      block.className = `prose-block ${type}`;
      block.innerHTML = text;
      container.appendChild(block);
      container.scrollTop = container.scrollHeight;
      await this.wait(200);
    }
  }

  async displaySingle(container, text, type = '', delay = 300) {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) indicator.classList.add('active');
    await this.wait(delay);
    if (indicator) indicator.classList.remove('active');
    const block = document.createElement('div');
    block.className = `prose-block ${type}`;
    block.innerHTML = text;
    container.appendChild(block);
    container.scrollTop = container.scrollHeight;
  }

  addSeparator(container) {
    const sep = document.createElement('div');
    sep.className = 'separator';
    container.appendChild(sep);
    container.scrollTop = container.scrollHeight;
  }

  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}