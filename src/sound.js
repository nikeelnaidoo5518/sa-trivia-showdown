let context;
export function unlockSound() {
  const Audio = window.AudioContext || window.webkitAudioContext;
  if (!Audio) return;
  context ||= new Audio();
  context.resume().catch(() => {});
}
export function cue(kind) {
  if (!context || context.state !== "running") return;
  const notes = {
    start: [262, 330, 392],
    playing: [392, 523],
    results: [523, 659, 784],
    final: [392, 523, 659, 784, 1047],
    tick: [660],
    trick: [220, 165, 330],
    event: [330, 440, 554],
  }[kind] || [440];
  notes.forEach((hz, i) => {
    const osc = context.createOscillator(),
      gain = context.createGain();
    const at = context.currentTime + i * 0.13;
    osc.type = "sine";
    osc.frequency.value = hz;
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(0.065, at + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, at + 0.18);
    osc.connect(gain);
    gain.connect(context.destination);
    osc.start(at);
    osc.stop(at + 0.2);
  });
}
