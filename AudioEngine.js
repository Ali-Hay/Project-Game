class AudioEngine extends GameObject {
  constructor() {
    super(0, 0, 0, 0);
    this.name = 'AudioEngine';
    this.ctx = null;
    this.muted = false;
    this.currentMood = 'silence';
    this.targetMood = 'silence';
    this.nodes = {};
    this.initialized = false;
    this.moods = {
      silence: { baseFreq: 0, volume: 0 },
      dread: { baseFreq: 55, volume: 0.08, detune: -10, filterFreq: 200 },
      wonder: { baseFreq: 220, volume: 0.05, detune: 5, filterFreq: 800 },
      tension: { baseFreq: 110, volume: 0.07, detune: -5, filterFreq: 400 },
      sacred: { baseFreq: 330, volume: 0.04, detune: 0, filterFreq: 1200 },
      sorrow: { baseFreq: 165, volume: 0.05, detune: -8, filterFreq: 350 },
      combat: { baseFreq: 80, volume: 0.1, detune: -15, filterFreq: 300 },
      calm: { baseFreq: 180, volume: 0.03, detune: 3, filterFreq: 600 },
      mystery: { baseFreq: 147, volume: 0.04, detune: 7, filterFreq: 500 }
    };
  }

  init() {
    if (this.initialized) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0;
      this.masterGain.connect(this.ctx.destination);

      // Drone oscillators
      this.osc1 = this.ctx.createOscillator();
      this.osc1.type = 'sine';
      this.osc1.frequency.value = 55;
      this.gain1 = this.ctx.createGain();
      this.gain1.gain.value = 0;
      this.filter1 = this.ctx.createBiquadFilter();
      this.filter1.type = 'lowpass';
      this.filter1.frequency.value = 200;
      this.filter1.Q.value = 2;
      this.osc1.connect(this.gain1).connect(this.filter1).connect(this.masterGain);
      this.osc1.start();

      this.osc2 = this.ctx.createOscillator();
      this.osc2.type = 'triangle';
      this.osc2.frequency.value = 55.5;
      this.gain2 = this.ctx.createGain();
      this.gain2.gain.value = 0;
      this.osc2.connect(this.gain2).connect(this.filter1);
      this.osc2.start();

      // Sub bass
      this.subOsc = this.ctx.createOscillator();
      this.subOsc.type = 'sine';
      this.subOsc.frequency.value = 30;
      this.subGain = this.ctx.createGain();
      this.subGain.gain.value = 0;
      this.subOsc.connect(this.subGain).connect(this.masterGain);
      this.subOsc.start();

      this.initialized = true;
      this.masterGain.gain.setTargetAtTime(1, this.ctx.currentTime, 0.5);
    } catch(e) { console.log('Audio unavailable'); }
  }

  setMood(mood) {
    if (!this.initialized || !this.moods[mood]) return;
    this.currentMood = mood;
    const m = this.moods[mood];
    const t = this.ctx.currentTime;
    const ramp = 3;
    if (m.volume === 0) {
      this.gain1.gain.setTargetAtTime(0, t, ramp);
      this.gain2.gain.setTargetAtTime(0, t, ramp);
      this.subGain.gain.setTargetAtTime(0, t, ramp);
    } else {
      this.osc1.frequency.setTargetAtTime(m.baseFreq, t, ramp);
      this.osc2.frequency.setTargetAtTime(m.baseFreq * 1.003, t, ramp);
      this.osc2.detune.setTargetAtTime(m.detune || 0, t, ramp);
      this.gain1.gain.setTargetAtTime(m.volume, t, ramp);
      this.gain2.gain.setTargetAtTime(m.volume * 0.6, t, ramp);
      this.filter1.frequency.setTargetAtTime(m.filterFreq || 400, t, ramp);
      this.subOsc.frequency.setTargetAtTime(m.baseFreq * 0.5, t, ramp);
      this.subGain.gain.setTargetAtTime(m.volume * 0.4, t, ramp);
    }
    const moodEl = document.getElementById('audio-mood');
    if (moodEl) moodEl.textContent = mood;
  }

  playSfx(type) {
    if (!this.initialized || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.connect(g).connect(this.masterGain);
    switch(type) {
      case 'hit':
        osc.type = 'sawtooth'; osc.frequency.value = 120;
        osc.frequency.setTargetAtTime(40, t, 0.1);
        g.gain.setValueAtTime(0.15, t);
        g.gain.setTargetAtTime(0, t + 0.1, 0.05);
        osc.start(t); osc.stop(t + 0.3); break;
      case 'miss':
        osc.type = 'sine'; osc.frequency.value = 300;
        osc.frequency.setTargetAtTime(200, t, 0.15);
        g.gain.setValueAtTime(0.05, t);
        g.gain.setTargetAtTime(0, t + 0.2, 0.1);
        osc.start(t); osc.stop(t + 0.4); break;
      case 'crit':
        osc.type = 'square'; osc.frequency.value = 200;
        osc.frequency.setTargetAtTime(400, t, 0.05);
        g.gain.setValueAtTime(0.12, t);
        g.gain.setTargetAtTime(0, t + 0.15, 0.05);
        osc.start(t); osc.stop(t + 0.4); break;
      case 'dice':
        osc.type = 'sine'; osc.frequency.value = 800;
        osc.frequency.setTargetAtTime(1200, t, 0.05);
        g.gain.setValueAtTime(0.06, t);
        g.gain.setTargetAtTime(0, t + 0.08, 0.02);
        osc.start(t); osc.stop(t + 0.15); break;
      case 'door':
        osc.type = 'triangle'; osc.frequency.value = 60;
        g.gain.setValueAtTime(0.1, t);
        g.gain.setTargetAtTime(0, t + 0.3, 0.15);
        osc.start(t); osc.stop(t + 0.6); break;
      case 'magic':
        osc.type = 'sine'; osc.frequency.value = 400;
        osc.frequency.setTargetAtTime(800, t, 0.3);
        g.gain.setValueAtTime(0.06, t);
        g.gain.setTargetAtTime(0, t + 0.5, 0.2);
        osc.start(t); osc.stop(t + 1); break;
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.initialized) {
      this.masterGain.gain.setTargetAtTime(this.muted ? 0 : 1, this.ctx.currentTime, 0.3);
    }
    const icon = document.getElementById('audio-icon');
    if (icon) icon.classList.toggle('muted', this.muted);
  }
}