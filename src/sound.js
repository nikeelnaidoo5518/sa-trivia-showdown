let context;

export function unlockSound() {
  const Audio = window.AudioContext || window.webkitAudioContext;
  if (!Audio) return;
  context ||= new Audio();
  context.resume().catch(() => {});
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
