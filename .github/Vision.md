The Vision: Chronicle: Zero
A browser-based AI-native TTRPG engine to bridge the gap between reading a book and playing a game. The AI functions as a Rules Arbiter (deterministic) and a Cinematic Narrator (generative), supported by a reactive, non-verbal audio layer.

1. The Core Engine: Dual-Model Architecture
   To eliminate "AI Hallucinations" and "Dream Logic," the game runs two parallel processes utilising highly specialised SLMs:
   The Logic Gate: A "headless" DM that only sees numbers and state. It manages 5e rules, inventory, and "Object-Oriented" world state. If a door is locked in the database, it stays locked regardless of what the narrative model wants.
   The Weaver: The creative layer. It translates the "Logic Gate’s" raw data (e.g., Miss, 14 vs 16 AC, Slashing) into prose, focusing on Theatre of the Mind descriptions tailored to the player’s style.
2. The Market Gap: Deterministic Persistence
   Most AI games feel like "improv with a goldfish." Chronicle: Zero introduces:
   Global State Tracking: Every NPC and location is a database object with persistent flags (e.g., Status: Burned, Relation: Hostile).
   The Shadow-Sim: While the player acts, background AI agents for world factions "take turns." The world evolves asynchronously; a war 100 miles away progresses based on logic, not just when the player looks at it.
3. Sensory Pillar: Reactive Ambient Synthesis
   We replace "uncanny" AI voices with Adaptive Audio to anchor the player's imagination:
   Contextual Drones: The narrative model tags text with "Emotional Metadata." The audio engine shifts the pitch and frequency of background drones (e.g., "high/hollow" for a cathedral vs. "low/oppressive" for a crypt).
   SFX Injection: AI scans its own generated prose for keywords (e.g., "crackling fire," "clinking armor") and triggers localized, high-fidelity sound effects in real-time.
   Character Leitmotifs: Major NPCs are assigned unique musical fragments (Leitmotifs) that weave into the ambient track when they are present, creating subconscious recognition without dialogue.
4. UI/UX: Minimalist Immersion
   The browser interface is a "Digital Character Sheet" meets "eBook."
   Dynamic Grid-Maps: A minimalist, procedurally generated tactical map (2D/Vector) appears only during combat, syncing with the Logic Gate’s coordinates.
   Prose-First: The focus remains on high-quality text, using typography and spacing to control the pacing of the "Theatre of the Mind."
