let context;
let musicBus;
let musicTimer;
let musicWanted = false;
let musicStarting = false;
let musicBar = 0;

const musicBars = [
  {
    bass: 110,
    fifth: 164.81,
    chord: [220, 261.63, 329.63],
    melody: [659.25, null, 523.25, 587.33, 783.99, null, 880, 783.99],
  },
  {
    bass: 87.31,
    fifth: 130.81,
    chord: [174.61, 220, 261.63],
    melody: [698.46, null, 659.25, 523.25, 698.46, null, 783.99, 659.25],
  },
  {
    bass: 130.81,
    fifth: 196,
    chord: [196, 261.63, 329.63],
    melody: [783.99, null, 659.25, 523.25, 587.33, null, 659.25, 880],
  },
  {
    bass: 98,
    fifth: 146.83,
    chord: [196, 246.94, 293.66],
    melody: [587.33, null, 659.25, 783.99, 880, null, 783.99, 659.25],
  },
];
const musicTempo = 116;
const musicBeat = 60 / musicTempo;
const musicBarDuration = musicBeat * 4;

function ensureMusicBus() {
  if (musicBus || !context) return;
  musicBus = context.createGain();
  musicBus.gain.value = 0;
  musicBus.connect(context.destination);
}

function musicTone(frequency, at, duration, volume, wave, endFrequency) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = wave;
  oscillator.frequency.setValueAtTime(frequency, at);
  if (endFrequency)
    oscillator.frequency.exponentialRampToValueAtTime(
      endFrequency,
      at + duration,
    );
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(volume, at + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  oscillator.connect(gain).connect(musicBus);
  oscillator.start(at);
  oscillator.stop(at + duration + 0.03);
}

function scheduleMusicBar() {
  if (!musicWanted || context?.state !== "running") return;
  const bar = musicBars[musicBar];
  const start = context.currentTime + 0.06;
  const eighth = musicBeat / 2;

  // A four-bar arcade-pop loop: soft chords under a bright, simple hook.
  bar.chord.forEach((frequency) =>
    musicTone(frequency, start, musicBarDuration * 0.78, 0.009, "triangle"),
  );
  for (let step = 0; step < 8; step++) {
    const at = start + step * eighth;
    if (step === 0 || step === 4)
      musicTone(bar.bass, at, 0.22, 0.043, "sine", bar.bass * 0.72);
    if (step === 2 || step === 6)
      musicTone(bar.fifth, at, 0.16, 0.022, "triangle");
    const note = bar.melody[step];
    if (note) musicTone(note, at, 0.17, 0.018, "triangle");
    if (step % 2 === 1) musicTone(1567.98, at, 0.055, 0.0022, "sine");
  }
  musicBar = (musicBar + 1) % musicBars.length;
}

function beginMusicAfterUnlock() {
  if (!musicWanted || !context || musicTimer || musicStarting) return;
  musicStarting = true;
  context
    .resume()
    .then(() => {
      musicStarting = false;
      if (!musicWanted || musicTimer) return;
      ensureMusicBus();
      musicBus.gain.cancelScheduledValues(context.currentTime);
      musicBus.gain.setTargetAtTime(0.68, context.currentTime, 0.12);
      scheduleMusicBar();
      musicTimer = window.setInterval(scheduleMusicBar, musicBarDuration * 1000);
    })
    .catch(() => {
      musicStarting = false;
    });
}

export function unlockSound() {
  const Audio = window.AudioContext || window.webkitAudioContext;
  if (!Audio) return;
  context ||= new Audio();
  context
    .resume()
    .then(beginMusicAfterUnlock)
    .catch(() => {});
}

export function startGameMusic() {
  musicWanted = true;
  if (!context) return;
  ensureMusicBus();
  beginMusicAfterUnlock();
}

export function stopGameMusic() {
  musicWanted = false;
  musicStarting = false;
  if (musicTimer) window.clearInterval(musicTimer);
  musicTimer = undefined;
  if (musicBus && context?.state === "running") {
    musicBus.gain.cancelScheduledValues(context.currentTime);
    musicBus.gain.setTargetAtTime(0, context.currentTime, 0.035);
  }
}

function tone(frequency, delay, duration, options = {}) {
  const at = context.currentTime + delay;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const volume = options.volume ?? 0.055;
  oscillator.type = options.wave ?? "triangle";
  oscillator.frequency.setValueAtTime(frequency, at);
  if (options.endFrequency)
    oscillator.frequency.exponentialRampToValueAtTime(options.endFrequency, at + duration);
  gain.gain.setValueAtTime(0.001, at);
  gain.gain.exponentialRampToValueAtTime(volume, at + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.001, at + duration);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(at);
  oscillator.stop(at + duration + 0.02);
}

function sparkle(delay = 0) {
  const at = context.currentTime + delay;
  const size = Math.floor(context.sampleRate * 0.19);
  const buffer = context.createBuffer(1, size, context.sampleRate);
  const samples = buffer.getChannelData(0);
  for (let i = 0; i < size; i++) samples[i] = Math.random() * 2 - 1;
  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();
  filter.type = "highpass";
  filter.frequency.value = 3600;
  gain.gain.setValueAtTime(0.001, at);
  gain.gain.exponentialRampToValueAtTime(0.035, at + 0.009);
  gain.gain.exponentialRampToValueAtTime(0.001, at + 0.18);
  source.buffer = buffer;
  source.connect(filter).connect(gain).connect(context.destination);
  source.start(at);
}

const patterns = {
  lobby: [[294, 0], [392, 0.14]],
  start: [[392, 0], [494, 0.1], [587, 0.2], [784, 0.33], [988, 0.46]],
  tutorial: [[330, 0], [440, 0.08], [554, 0.16]],
  select: [[392, 0], [494, 0.12], [587, 0.24]],
  wager: [[147, 0, "sawtooth"], [196, 0.16, "triangle"], [165, 0.32, "sawtooth"]],
  playing: [[392, 0], [523, 0.12], [659, 0.24]],
  question: [[349, 0], [440, 0.08], [587, 0.18]],
  map: [[294, 0], [440, 0.12], [587, 0.25]],
  braai: [[330, 0], [392, 0.11], [494, 0.22]],
  drum: [[220, 0, "sine"], [330, 0.12, "triangle"], [440, 0.24, "triangle"]],
  event: [[330, 0, "sawtooth"], [277, 0.14, "triangle"], [370, 0.3, "sawtooth"]],
  tick: [[1050, 0, "square"]],
  lock: [[659, 0], [988, 0.075]],
  correct: [[659, 0], [880, 0.1], [1318, 0.2]],
  miss: [[330, 0, "triangle"], [247, 0.14, "sawtooth"]],
  results: [[523, 0], [659, 0.13], [784, 0.26]],
  win: [[523, 0], [659, 0.1], [784, 0.2], [1047, 0.34], [1318, 0.48]],
  final: [[392, 0], [523, 0.12], [659, 0.24], [784, 0.36], [1047, 0.5], [1318, 0.64]],
  trick: [[196, 0, "sawtooth"], [147, 0.1, "sawtooth"], [392, 0.24], [659, 0.34]],
};

export function cue(kind) {
  if (!context) return;
  if (context.state !== "running") {
    context.resume().then(() => cue(kind)).catch(() => {});
    return;
  }
  const notes = patterns[kind] || patterns.question;
  notes.forEach(([frequency, delay, wave]) =>
    tone(frequency, delay, kind === "tick" ? 0.055 : 0.16, {
      wave,
      volume: kind === "tick" ? 0.026 : 0.055,
      endFrequency: kind === "trick" ? frequency * 1.7 : undefined,
    }),
  );
  if (["start", "win", "final", "trick"].includes(kind)) sparkle(0.08);
}
