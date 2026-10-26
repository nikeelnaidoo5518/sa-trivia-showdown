let context;
let musicBus;
let musicTimer;
let musicWanted = false;
let musicStarting = false;
let musicBar = 0;
let musicThemeId = "warmup";
const musicSources = new Set();

const majorScale = [0, 2, 4, 5, 7, 9, 11, 12];
const minorScale = [0, 2, 3, 5, 7, 8, 10, 12];
const pentatonicScale = [0, 2, 4, 7, 9, 12, 14, 16];
const makeTheme = (
  tempo,
  tonic,
  progression,
  melody,
  mode = "major",
  lead = "triangle",
) => ({
  tempo,
  tonic,
  progression,
  melody,
  scale:
    mode === "minor"
      ? minorScale
      : mode === "pentatonic"
        ? pentatonicScale
        : majorScale,
  chord: mode === "minor" ? [0, 3, 7] : [0, 4, 7],
  lead,
});

// Original short game-show themes: each round gets its own key, groove, and hook.
const musicThemes = {
  warmup: makeTheme(116, 60, [0, 5, 3, 4], [4, null, 2, 3, 4, null, 5, 4]),
  province: makeTheme(
    122,
    62,
    [0, 7, 5, 7],
    [2, 4, 5, null, 4, 2, 1, 2],
    "major",
    "square",
  ),
  picture: makeTheme(
    94,
    55,
    [0, 3, 5, 7],
    [0, null, 4, 3, 1, null, 3, 4],
    "minor",
    "sine",
  ),
  map: makeTheme(
    132,
    64,
    [0, 5, 4, 0],
    [4, 4, 6, null, 5, 4, 2, 0],
    "major",
    "square",
  ),
  sound: makeTheme(
    110,
    57,
    [0, 5, 3, 7],
    [0, 2, 4, null, 3, 1, 2, null],
    "minor",
  ),
  risk: makeTheme(
    94,
    54,
    [0, 3, 6, 5],
    [0, null, 0, 4, null, 3, 2, null],
    "minor",
    "sawtooth",
  ),
  huddle: makeTheme(110, 65, [0, 3, 5, 4], [4, 2, 4, 6, 5, null, 4, 2]),
  braai: makeTheme(
    126,
    70,
    [0, 5, 0, 7],
    [0, 2, 4, null, 4, 2, 0, 5],
    "pentatonic",
    "square",
  ),
  mix: makeTheme(132, 63, [0, 4, 5, 7], [4, null, 2, 5, 4, 2, 6, 4]),
  final: makeTheme(103, 57, [0, 5, 3, 4], [0, null, 3, 4, 5, 4, 3, 1], "minor"),
  soundEncore: makeTheme(
    118,
    59,
    [0, 7, 5, 3],
    [0, 3, null, 4, 6, 4, null, 3],
    "minor",
    "sine",
  ),
  quickfire: makeTheme(
    140,
    67,
    [0, 5, 3, 4],
    [4, 2, 4, 6, 5, 4, 2, 0],
    "major",
    "square",
  ),
  picturePuzzle: makeTheme(
    98,
    53,
    [0, 5, 3, 6],
    [0, 2, null, 3, 1, null, 4, 3],
    "minor",
    "sine",
  ),
  homeground: makeTheme(
    124,
    64,
    [0, 4, 5, 3],
    [2, 4, 5, 4, 2, 0, null, 2],
    "pentatonic",
  ),
  drum: makeTheme(
    128,
    59,
    [0, 7, 5, 0],
    [0, 2, 4, 2, 5, 4, 2, null],
    "pentatonic",
    "square",
  ),
  mixEncore: makeTheme(134, 65, [0, 5, 4, 3], [5, 4, 2, null, 4, 6, 5, 2]),
  riskEncore: makeTheme(
    96,
    52,
    [0, 3, 5, 6],
    [0, null, 3, 1, null, 4, 3, null],
    "minor",
    "sawtooth",
  ),
  mapEncore: makeTheme(
    136,
    62,
    [0, 5, 3, 7],
    [4, 6, 4, 2, 5, 4, 2, 0],
    "major",
    "square",
  ),
  braaiEncore: makeTheme(
    128,
    72,
    [0, 3, 5, 0],
    [0, 2, 4, 5, 4, 2, 0, null],
    "pentatonic",
    "square",
  ),
  soundFinale: makeTheme(
    112,
    55,
    [0, 5, 3, 7],
    [0, 2, 3, null, 5, 4, 2, 0],
    "minor",
  ),
};
export const ROUND_MUSIC_IDS = Object.keys(musicThemes);

const noteFrequency = (note) => 440 * 2 ** ((note - 69) / 12);

function ensureMusicBus() {
  if (musicBus || !context) return;
  musicBus = context.createGain();
  musicBus.gain.value = 0;
  musicBus.connect(context.destination);
}

function musicTone(frequency, at, duration, volume, wave, endFrequency) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  musicSources.add(oscillator);
  oscillator.onended = () => musicSources.delete(oscillator);
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

function clearMusicSources() {
  for (const oscillator of musicSources) {
    try {
      oscillator.stop();
    } catch {}
  }
  musicSources.clear();
}

function scheduleMusicBar() {
  if (!musicWanted || context?.state !== "running") return;
  const theme = musicThemes[musicThemeId] || musicThemes.warmup;
  const chordProgression = theme.progression[musicBar];
  const root = theme.tonic + chordProgression;
  const beat = 60 / theme.tempo;
  const barDuration = beat * 4;
  const start = context.currentTime + 0.06;
  const eighth = beat / 2;

  theme.chord.forEach((interval) =>
    musicTone(
      noteFrequency(root + 12 + interval),
      start,
      barDuration * 0.76,
      0.013,
      "triangle",
    ),
  );
  for (let step = 0; step < 8; step++) {
    const at = start + step * eighth;
    if (step === 0 || step === 4)
      musicTone(
        noteFrequency(root - 24),
        at,
        beat * 0.58,
        0.052,
        "sine",
        noteFrequency(root - 26),
      );
    if (step === 2 || step === 6)
      musicTone(noteFrequency(root + 7), at, beat * 0.32, 0.022, "triangle");
    const degree = theme.melody[step];
    if (degree !== null)
      musicTone(
        noteFrequency(root + 12 + theme.scale[degree]),
        at,
        beat * 0.36,
        0.03,
        theme.lead,
      );
    if (step % 2 === 1) musicTone(1567.98, at, 0.045, 0.0025, "sine");
  }
  musicBar = (musicBar + 1) % theme.progression.length;
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
      musicBus.gain.setTargetAtTime(0.78, context.currentTime, 0.12);
      scheduleMusicBar();
      const theme = musicThemes[musicThemeId] || musicThemes.warmup;
      musicTimer = window.setInterval(
        scheduleMusicBar,
        (60 / theme.tempo) * 4000,
      );
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

export function startGameMusic(roundId = "warmup") {
  musicWanted = true;
  const nextTheme = musicThemes[roundId] ? roundId : "warmup";
  if (nextTheme !== musicThemeId) {
    musicThemeId = nextTheme;
    musicBar = 0;
    if (musicTimer) window.clearInterval(musicTimer);
    musicTimer = undefined;
    clearMusicSources();
    if (musicBus && context?.state === "running") {
      musicBus.gain.cancelScheduledValues(context.currentTime);
      musicBus.gain.setTargetAtTime(0, context.currentTime, 0.06);
    }
  }
  if (!context) return;
  ensureMusicBus();
  beginMusicAfterUnlock();
}

export function stopGameMusic() {
  musicWanted = false;
  musicStarting = false;
  if (musicTimer) window.clearInterval(musicTimer);
  musicTimer = undefined;
  clearMusicSources();
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
