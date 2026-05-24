(function (global) {
  "use strict";

  let ctx = null;
  let muted = false;

  function ensure() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (ctx.state === "suspended") {
      ctx.resume();
    }
    return ctx;
  }

  function tone(freq, dur, type, vol, decay) {
    if (muted) return;
    const c = ensure();
    const t0 = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type || "square";
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(vol || 0.08, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + (decay || dur));
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function noiseBurst(dur, vol, filterFreq) {
    if (muted) return;
    const c = ensure();
    const t0 = c.currentTime;
    const bufferSize = Math.floor(c.sampleRate * dur);
    const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const src = c.createBufferSource();
    src.buffer = buffer;
    const filter = c.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = filterFreq || 1200;
    const gain = c.createGain();
    gain.gain.setValueAtTime(vol || 0.15, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(c.destination);
    src.start(t0);
  }

  const SFX = {
    rifle() {
      noiseBurst(0.08, 0.18, 1800);
      tone(120, 0.06, "sawtooth", 0.06, 0.06);
    },
    pistol() {
      noiseBurst(0.1, 0.22, 1400);
      tone(80, 0.08, "square", 0.07, 0.08);
    },
    knife() {
      tone(600, 0.04, "triangle", 0.1, 0.04);
      noiseBurst(0.03, 0.08, 3000);
    },
    reload() {
      tone(400, 0.05, "triangle", 0.06, 0.05);
      setTimeout(() => tone(520, 0.04, "triangle", 0.05, 0.04), 120);
    },
    hit() {
      tone(300, 0.05, "square", 0.05, 0.05);
    },
    headshot() {
      tone(880, 0.08, "sine", 0.1, 0.08);
      setTimeout(() => tone(1200, 0.1, "sine", 0.08, 0.1), 60);
    },
    kill() {
      tone(200, 0.1, "sawtooth", 0.07, 0.1);
      tone(150, 0.15, "square", 0.05, 0.15);
    },
    pickup() {
      tone(660, 0.06, "sine", 0.07, 0.06);
      setTimeout(() => tone(880, 0.08, "sine", 0.06, 0.08), 80);
    },
    damage() {
      tone(90, 0.15, "sawtooth", 0.1, 0.15);
    },
    wave() {
      tone(523, 0.1, "sine", 0.08, 0.1);
      setTimeout(() => tone(659, 0.1, "sine", 0.08, 0.1), 100);
      setTimeout(() => tone(784, 0.15, "sine", 0.08, 0.15), 200);
    },
    switchWep() {
      tone(440, 0.04, "triangle", 0.05, 0.04);
    },
    empty() {
      tone(180, 0.04, "square", 0.06, 0.04);
    },
    pause() {
      tone(350, 0.08, "sine", 0.06, 0.08);
    },
    enemyShot() {
      noiseBurst(0.04, 0.07, 900);
      tone(140, 0.04, "square", 0.04, 0.04);
    },
    jump() {
      tone(280, 0.06, "sine", 0.05, 0.06);
    },
    land() {
      noiseBurst(0.04, 0.06, 500);
      tone(90, 0.05, "triangle", 0.04, 0.05);
    },
    footstep() {
      noiseBurst(0.025, 0.035, 350);
    },
  };

  global.CFAudio = {
    init: ensure,
    play(name) {
      if (SFX[name]) SFX[name]();
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    isMuted() {
      return muted;
    },
    setMuted(v) {
      muted = !!v;
    },
  };
})(window);
