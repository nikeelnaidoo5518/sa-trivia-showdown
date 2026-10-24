import {
  DEFAULT_SETTINGS,
  ROUNDS,
  QUICK_ROUNDS,
  CARDS,
  EVENTS,
  MAP_CITIES,
  PROVINCES,
} from "./catalog.js";
import { uuid } from "./ids.js";
export const normalise = (s) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
const shuffle = (a, rng = Math.random) => {
  const result = [...a];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};
const id = uuid;
export function scoreAnswer(q, value) {
  return [q.answer, ...(q.acceptedAnswers || [])].some(
    (a) => normalise(a) === normalise(value),
  );
}
export function standings(state) {
  const players = state.players
    .filter((p) => !p.audience)
    .sort((a, b) => b.cash - a.cash || a.name.localeCompare(b.name));
  if (state.settings.mode !== "teams")
    return players.map((p) => ({ ...p, members: 1 }));
  return ["Ubuntu", "Eish!"]
    .map((team) => {
      const ps = players.filter((p) => p.team === team);
      return {
        id: team,
        name: team,
        avatar: team === "Ubuntu" ? "Sun" : "Flame",
        colour: team === "Ubuntu" ? "#50d5c0" : "#ff8b80",
        cash: ps.length
          ? Math.round(ps.reduce((n, p) => n + p.cash, 0) / ps.length)
          : 0,
        members: ps.length,
      };
    })
    .filter((t) => t.members)
    .sort((a, b) => b.cash - a.cash);
}
export function validateBank(bank) {
  const ids = new Set(),
    prompts = new Set(),
    counts = {};
  for (const q of bank) {
    if (ids.has(q.id)) throw Error("Duplicate id " + q.id);
    ids.add(q.id);
    if (prompts.has(normalise(q.prompt)))
      throw Error("Duplicate prompt " + q.prompt);
    prompts.add(normalise(q.prompt));
    for (const k of [
      "id",
      "category",
      "difficulty",
      "region",
      "age",
      "format",
      "prompt",
      "answer",
      "fact",
      "source",
    ])
      if (!q[k]) throw Error(`Missing ${k}: ${q.id}`);
    if (q.options && new Set(q.options).size !== q.options.length)
      throw Error("Repeated option " + q.id);
    if (q.options && q.format !== "ordering" && !q.options.includes(q.answer))
      throw Error("Answer not in options " + q.id);
    counts[q.category] = (counts[q.category] || 0) + 1;
  }
  return counts;
}
export class GameEngine {
  constructor(bank, settings = {}, recent = [], rng = Math.random) {
    this.bank = bank;
    this.rng = rng;
    this.recent = recent;
    this.inputs = {};
    this.wagers = {};
    this.predictions = {};
    this.used = [];
    this.eventUsed = [];
    this.question = null;
    this.state = {
      version: 1,
      id: id(),
      settings: { ...DEFAULT_SETTINGS, ...settings },
      phase: "lobby",
      players: [],
      roundIndex: 0,
      questionIndex: 0,
      rounds: ROUNDS.filter(
        (r) => settings.length !== 5 || QUICK_ROUNDS.includes(r.id),
      ),
      activityId: id(),
      receipts: {},
      wagerReceipts: {},
      predictions: {},
      hints: {},
      repairReceipts: {},
      paused: false,
      deadline: 0,
      remaining: 0,
      results: [],
      history: [],
      notice: "",
      createdAt: Date.now(),
    };
  }
  static restore(bank, saved) {
    const e = new GameEngine(bank);
    Object.assign(e, saved);
    e.bank = bank;
    e.rng = Math.random;
    return e;
  }
  serialise() {
    return {
      state: this.state,
      inputs: this.inputs,
      wagers: this.wagers,
      predictions: this.predictions,
      used: this.used,
      recent: this.recent,
      eventUsed: this.eventUsed,
      question: this.question,
      processed: this.processed || [],
    };
  }
  get round() {
    return this.state.rounds[this.state.roundIndex];
  }
  snapshot() {
    return structuredClone(this.state);
  }
  addPlayer(pid, profile) {
    let p = this.state.players.find((p) => p.id === pid);
    if (p) {
      p.connected = true;
      p.lastSeen = Date.now();
      return p;
    }
    if (this.state.phase !== "lobby" && !profile.audience)
      throw Error(
        "This match has started. Join as audience, or wait for the next match.",
      );
    const name = String(profile.name || "Player")
      .trim()
      .slice(0, 18);
    if (!name) throw Error("Choose a nickname.");
    if (
      this.state.players.some(
        (x) => x.name.toLowerCase() === name.toLowerCase(),
      )
    )
      throw Error("That nickname is taken. Try another.");
    if (this.state.players.length >= 40) throw Error("This room is full.");
    p = {
      id: pid,
      name,
      avatar: profile.avatar || "Sun",
      colour: profile.colour || "#50d5c0",
      team: profile.team === "Eish!" ? "Eish!" : "Ubuntu",
      audience:
        !!profile.audience ||
        this.state.players.filter((p) => !p.audience).length >= 12,
      cash: 500,
      ready: false,
      connected: true,
      lastSeen: Date.now(),
      cards: CARDS.map((c) => c.id),
      shield: false,
      correct: 0,
      duel: 0,
      comeback: 0,
      worstRank: 1,
    };
    this.state.players.push(p);
    return p;
  }
  pickQuestion() {
    const s = this.state,
      r = this.round;
    let pool = this.bank.filter(
      (q) =>
        !this.used.includes(q.id) &&
        q.format !== "map" &&
        s.settings.categories.includes(q.category) &&
        (s.settings.age !== "all" || q.age === "all"),
    );
    if (!pool.length)
      throw Error(
        "No unused questions match these categories. Start a new match with more categories.",
      );
    let preferred = pool;
    const narrow = (fn) => {
      const next = preferred.filter(fn);
      if (next.length) preferred = next;
    };
    if (s.settings.difficulty !== "mixed")
      narrow((q) => q.difficulty === s.settings.difficulty);
    if (r.id === "warmup")
      narrow(
        (q) =>
          q.difficulty === "easy" &&
          ["multiple-choice", "true-false"].includes(q.format),
      );
    if (r.id === "province") narrow((q) => q.region === s.province);
    if (r.id === "picture") narrow((q) => q.format === "image");
    if (r.id === "sound") narrow((q) => q.format === "audio");
    if (r.id === "huddle" && s.questionIndex === 1 && s.linkedCategory)
      narrow((q) => q.category === s.linkedCategory);
    if (r.id === "mix") narrow((q) => !s.mixCategories?.includes(q.category));
    if (r.id === "mix") {
      const wanted = [
        ["short-answer", "scramble"],
        ["ordering", "matching"],
        ["true-false", "multiple-choice"],
      ][s.questionIndex];
      narrow((q) => wanted.includes(q.format));
    }
    if (r.id === "final") narrow((q) => q.difficulty !== "easy");
    if (s.settings.difficulty !== "mixed")
      narrow((q) => q.difficulty === s.settings.difficulty);
    else if (r.id !== "warmup")
      narrow(
        (q) => q.difficulty === ["medium", "easy", "hard"][s.roundIndex % 3],
      );
    narrow((q) => !this.recent.includes(q.id));
    const seenCategories = {};
    for (const used of this.used) {
      const category = this.bank.find((q) => q.id === used)?.category;
      if (category)
        seenCategories[category] = (seenCategories[category] || 0) + 1;
    }
    const least = Math.min(
      ...preferred.map((q) => seenCategories[q.category] || 0),
    );
    narrow((q) => (seenCategories[q.category] || 0) === least);
    const q = structuredClone(
      preferred[Math.floor(this.rng() * preferred.length)],
    );
    if (q.options && q.format !== "ordering")
      q.options = shuffle(q.options, this.rng);
    this.used.push(q.id);
    this.recent = [...this.recent, q.id].slice(-200);
    this.question = q;
    if (r.id === "huddle") s.linkedCategory = q.category;
    if (r.id === "mix")
      s.mixCategories = [...(s.mixCategories || []), q.category];
    const { answer, acceptedAnswers, source, fact, mapTarget, ...safe } = q;
    s.question = safe;
  }
  start() {
    if (!this.state.players.some((p) => !p.audience))
      throw Error("Add at least one player or try the demo.");
    this.state.phase = "tutorial";
    this.state.questionIndex = 0;
    this.newActivity();
  }
  newActivity() {
    const s = this.state;
    s.activityId = id();
    s.receipts = {};
    s.hints = {};
    s.repairReceipts = {};
    s.predictions = {};
    s.wagerReceipts = {};
    s.notice = "";
    s.question = null;
    s.mini = null;
    s.answer = null;
    s.fact = null;
    s.source = null;
    s.mapAnswer = null;
    this.inputs = {};
    this.wagers = {};
    this.predictions = {};
    this.question = null;
    for (const p of s.players) {
      p.jam = 0;
      p.trickUsed = false;
      p.double = false;
      p.backup = false;
      p.repairActive = false;
    }
  }
  timed(phase, seconds) {
    if (phase === "playing")
      for (const p of this.state.players) p.jamUntil = Date.now() + 5000;
    this.state.phase = phase;
    this.state.deadline = Date.now() + seconds * 1000;
    this.state.remaining = seconds * 1000;
    this.state.paused = false;
  }
  begin() {
    const s = this.state,
      r = this.round;
    if (r.id === "province" && !s.province) {
      this.timed("select", 15);
      return;
    }
    if (["risk", "final"].includes(r.id) && s.phase === "tutorial") {
      this.timed("wager", 15);
      return;
    }
    if (r.kind === "map") {
      const maps = this.bank.filter(
        (q) => q.format === "map" && !this.used.includes(q.id),
      );
      const fresh = maps.filter((q) => !this.recent.includes(q.id));
      const pool = fresh.length ? fresh : maps;
      this.question = structuredClone(
        pool[Math.floor(this.rng() * pool.length)],
      );
      this.used.push(this.question.id);
      this.recent = [...this.recent, this.question.id].slice(-200);
      s.mini = { kind: "map", target: this.question.answer };
      this.timed("playing", 20);
    } else if (r.kind === "braai") {
      s.mini = {
        kind: "braai",
        sequence: Array.from({ length: 6 }, () => Math.floor(this.rng() * 4)),
        revealUntil: Date.now() + 4500,
      };
      this.timed("playing", 25);
    } else {
      this.pickQuestion();
      this.timed("playing", r.id === "mix" ? 15 : s.settings.seconds);
    }
  }
  next() {
    const s = this.state;
    if (s.phase === "lobby") return this.start();
    if (s.phase === "tutorial") return this.begin();
    if (["select", "wager"].includes(s.phase)) {
      if (s.phase === "select") {
        const counts = {};
        Object.values(this.inputs).forEach(
          (v) => (counts[v.value] = (counts[v.value] || 0) + 1),
        );
        s.province =
          Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0] ||
          "Western Cape";
        this.inputs = {};
        s.receipts = {};
      }
      return this.begin();
    }
    if (s.phase === "playing" || s.phase === "event") return this.resolve();
    if (s.phase === "results") {
      const count =
        this.round.id === "huddle" && s.settings.mode === "teams"
          ? 1
          : this.round.count;
      if (s.questionIndex < count - 1) {
        s.questionIndex++;
        this.newActivity();
        return this.begin();
      }
      if (
        s.settings.events &&
        s.roundIndex < s.rounds.length - 1 &&
        s.roundIndex >= 0
      ) {
        return this.startEvent();
      }
      return this.advanceRound();
    }
    if (s.phase === "event-results") return this.advanceRound();
    if (s.phase === "final") {
      s.phase = "credits";
      return;
    }
  }
  advanceRound() {
    const s = this.state;
    if (s.roundIndex >= s.rounds.length - 1) {
      s.phase = "final";
      s.deadline = 0;
      return;
    }
    s.roundIndex++;
    s.questionIndex = 0;
    s.province = null;
    this.newActivity();
    s.phase = "tutorial";
  }
  pause() {
    const s = this.state;
    if (!["playing", "event", "wager", "select"].includes(s.phase)) return;
    s.paused = !s.paused;
    if (s.paused) {
      s.remaining = Math.max(0, s.deadline - Date.now());
      s.pausedAt = Date.now();
    } else {
      const elapsed = Date.now() - s.pausedAt;
      s.deadline = Date.now() + s.remaining;
      for (const p of s.players) if (p.jamUntil) p.jamUntil += elapsed;
      if (s.mini?.revealUntil) s.mini.revealUntil += elapsed;
      if (s.event?.revealUntil) s.event.revealUntil += elapsed;
    }
  }
  tick(now = Date.now()) {
    const s = this.state;
    let changed = false;
    for (const p of s.players) {
      const connected =
        p.bot || p.id === "demo-you" || now - p.lastSeen < 18000;
      if (p.connected !== connected) {
        p.connected = connected;
        changed = true;
      }
    }
    const competitors = s.players.filter((p) => !p.audience);
    if (
      !s.paused &&
      ["playing", "event"].includes(s.phase) &&
      competitors.length &&
      competitors.every((p) => s.receipts[p.id]) &&
      now >=
        Math.max(...competitors.map((p) => this.inputs[p.id]?.at || now)) + 1500
    ) {
      this.resolve();
      return true;
    }
    if (
      !s.paused &&
      ["playing", "event", "wager", "select"].includes(s.phase) &&
      now >= s.deadline
    ) {
      this.next();
      changed = true;
    }
    return changed;
  }
  skip() {
    const s = this.state;
    if (["playing", "event"].includes(s.phase)) {
      s.results = s.players.map((p) => ({
        id: p.id,
        name: p.name,
        delta: 0,
        correct: false,
        reason: "Host skipped this activity. No cash changed.",
      }));
      s.answer = this.question?.answer || "Activity skipped";
      s.fact = "The host skipped this activity.";
      s.phase = s.phase === "event" ? "event-results" : "results";
      s.deadline = 0;
    } else this.next();
  }
  end() {
    this.state.phase = "final";
    this.state.paused = false;
    this.state.deadline = 0;
  }
  startEvent() {
    this.newActivity();
    const available = EVENTS.filter((e) => !this.eventUsed.includes(e.id));
    const event = structuredClone(
      (available.length ? available : EVENTS)[
        Math.floor(this.rng() * (available.length || EVENTS.length))
      ],
    );
    this.eventUsed.push(event.id);
    event.sequence = Array.from({ length: 4 }, () =>
      Math.floor(this.rng() * 4),
    );
    event.a = 3 + Math.floor(this.rng() * 7);
    event.b = 2 + Math.floor(this.rng() * 7);
    event.revealUntil = Date.now() + 4000;
    event.missing = Math.floor(this.rng() * 4);
    this.state.event = event;
    this.timed("event", 22);
  }
  input(pid, action) {
    const s = this.state,
      p = s.players.find((p) => p.id === pid);
    if (!p) throw Error("Join this room first.");
    p.lastSeen = Date.now();
    p.connected = true;
    if (action.type === "heartbeat") return;
    if (action.type === "ready" && s.phase === "lobby") {
      p.ready = !p.ready;
      return;
    }
    if (action.activityId !== s.activityId)
      throw Error("That activity has ended. Your controller is updating.");
    if (s.paused) throw Error("The host has paused the game.");
    if (
      ["playing", "event", "wager", "select"].includes(s.phase) &&
      Date.now() > s.deadline
    )
      throw Error("Time is up.");
    if (action.type === "trick" && s.phase === "tutorial") {
      if (p.audience || p.trickUsed || (p.tricks ?? 2) <= 0)
        throw Error("No trick available this round.");
      const target = s.players.find(
        (x) =>
          x.id === action.target &&
          x.id !== pid &&
          !x.audience &&
          (s.settings.mode !== "teams" || x.team !== p.team),
      );
      if (!target || target.jam) throw Error("Choose another rival.");
      p.tricks = (p.tricks ?? 2) - 1;
      p.trickUsed = true;
      if (target.shield) {
        target.shield = false;
        s.notice = `${target.name} blocked ${p.name}’s Confetti Jam!`;
      } else {
        target.jam = 3;
        s.notice = `${p.name} sent Confetti Jam to ${target.name}!`;
      }
      return;
    }
    if (action.type === "unjam" && s.phase === "playing") {
      p.jam = Math.max(0, (p.jam || 0) - 1);
      return;
    }
    if (action.type === "card") return this.useCard(p, action.card);
    if (action.type === "repair" && p.repairActive) {
      p.repairActive = false;
      const correct =
        JSON.stringify(action.value) === JSON.stringify([0, 2, 1, 3]);
      if (correct) p.cash += 100;
      s.repairReceipts[pid] = { correct, delta: correct ? 100 : 0 };
      return;
    }
    if (
      action.type === "predict" &&
      ["tutorial", "playing"].includes(s.phase) &&
      ["map", "braai"].includes(this.round.id)
    ) {
      if (s.phase === "playing" && Object.keys(s.receipts).length)
        throw Error("Predictions are locked once play begins.");
      if (action.value === pid) throw Error("Predict another player.");
      if (!s.players.some((x) => x.id === action.value && !x.audience))
        throw Error("Choose a player.");
      if (this.predictions[pid]) throw Error("Prediction already locked.");
      this.predictions[pid] = action.value;
      s.predictions[pid] = true;
      return;
    }
    if (action.type === "wager" && s.phase === "wager") {
      if (this.wagers[pid] !== undefined) throw Error("Wager already locked.");
      this.wagers[pid] = Math.max(
        0,
        Math.min(
          Math.floor(Number(action.value) || 0),
          p.cash,
          this.round.id === "final" ? 500 : 300,
        ),
      );
      s.wagerReceipts[pid] = true;
      return;
    }
    if (action.type === "vote" && s.phase === "select") {
      if (s.receipts[pid]) throw Error("Vote already locked.");
      if (!PROVINCES.includes(action.value))
        throw Error("Choose a province from the list.");
      this.inputs[pid] = { value: String(action.value) };
      s.receipts[pid] = true;
      return;
    }
    if (action.type === "answer" && ["playing", "event"].includes(s.phase)) {
      if (p.jam > 0 && Date.now() < p.jamUntil)
        throw Error("Clear the confetti first.");
      if (s.receipts[pid]) throw Error("Answer already locked.");
      if (JSON.stringify(action.value).length > 3000)
        throw Error("Answer is too long.");
      this.inputs[pid] = {
        value: action.value,
        at: Date.now(),
        remaining: Math.max(0, s.deadline - Date.now()),
      };
      s.receipts[pid] = true;
      return;
    }
    throw Error("This control is not available right now.");
  }
  useCard(p, card) {
    const s = this.state;
    if (p.audience)
      throw Error("Audience players use predictions instead of cards.");
    if (!p.cards.includes(card))
      throw Error("That card has already been used.");
    if (card === "steal") {
      const result = s.results.find((x) => x.id === p.id);
      if (s.phase !== "results" || !result || result.correct || !s.question)
        throw Error("Use Steal after an incorrect trivia answer.");
      const victim = [...s.players]
        .filter(
          (x) =>
            x.id !== p.id &&
            !x.audience &&
            (s.settings.mode !== "teams" || x.team !== p.team),
        )
        .sort((a, b) => b.cash - a.cash)[0];
      if (!victim) throw Error("No opponent to steal from.");
      if (victim.shield) {
        victim.shield = false;
        s.notice = `${victim.name}’s Cash Shield blocked ${p.name}’s steal.`;
      } else {
        const amount = Math.min(100, victim.cash);
        victim.cash -= amount;
        p.cash += amount;
        s.notice = `${p.name} stole R${amount} from ${victim.name}.`;
        s.results.push(
          {
            id: p.id,
            name: p.name,
            delta: amount,
            reason: "Steal card",
            correct: false,
          },
          {
            id: victim.id,
            name: victim.name,
            delta: -amount,
            reason: "Cash stolen",
            correct: false,
          },
        );
      }
    } else if (card === "shield") {
      p.shield = true;
    } else if (card === "hint") {
      if (
        s.phase !== "playing" ||
        s.receipts[p.id] ||
        !this.question?.options ||
        this.question.format === "ordering"
      )
        throw Error("Use this card before a multiple-choice answer.");
      s.hints[p.id] = this.question.options.find(
        (o) => o !== this.question.answer,
      );
    } else if (card === "double") {
      if (s.phase !== "playing" || s.receipts[p.id] || !s.question)
        throw Error("Use this card before answering trivia.");
      p.double = true;
    } else if (card === "repair") {
      if (s.phase !== "playing" || s.receipts[p.id])
        throw Error("Use Robot Repair during an activity before answering.");
      p.repairActive = true;
    } else if (card === "backup") {
      if (s.phase !== "event" || s.event.id !== "power" || s.receipts[p.id])
        throw Error("Use Power Backup during Load-shedding.");
      p.backup = true;
    } else throw Error("Unknown card.");
    p.cards = p.cards.filter((c) => c !== card);
  }
  resolve() {
    const s = this.state,
      isEvent = s.phase === "event",
      r = this.round;
    let results = [];
    const shared = {};
    if (r.id === "huddle" && s.settings.mode === "teams" && !isEvent) {
      for (const team of ["Ubuntu", "Eish!"]) {
        const votes = s.players
          .filter((p) => p.team === team && !p.audience)
          .map((p) => this.inputs[p.id])
          .filter(Boolean)
          .sort((a, b) => a.at - b.at)
          .map((v) => v.value);
        const count = new Map();
        votes.forEach((v) => count.set(v, (count.get(v) || 0) + 1));
        shared[team] = [...count.keys()].sort(
          (a, b) => count.get(b) - count.get(a),
        )[0];
      }
    }
    for (const p of s.players) {
      const submission = this.inputs[p.id],
        value =
          r.id === "huddle" &&
          s.settings.mode === "teams" &&
          !isEvent &&
          !p.audience
            ? shared[p.team]
            : submission?.value;
      let correct = false,
        delta = 0,
        reason = "No answer submitted";
      if (isEvent) {
        const e = s.event;
        if (value !== undefined) {
          if (e.kind === "repair")
            correct =
              JSON.stringify(value) ===
              JSON.stringify(p.backup ? e.sequence.slice(0, 3) : e.sequence);
          if (e.kind === "puzzle") correct = Number(value) === e.a + e.b;
          if (e.kind === "route") {
            if (value === "safe") {
              correct = true;
              delta = 50;
              reason = "Safe route: R50";
            } else {
              correct = Number(value) === e.a * e.b;
              delta = correct ? 150 : -50;
              reason = correct
                ? "Shortcut puzzle solved"
                : "Shortcut puzzle missed";
            }
          }
          if (e.kind === "memory") correct = Number(value) === e.missing;
          if (e.kind === "catch")
            correct =
              value?.caught === true && Number(value.answer) === e.a + e.b;
          if (!delta && !reason.startsWith("Shortcut")) {
            delta = correct ? e.reward : 0;
            reason = correct
              ? "Event challenge complete"
              : "Good try — no cash lost";
          }
        }
      } else if (r.kind === "map") {
        const target = MAP_CITIES.find((c) => c.name === s.mini.target);
        const distance =
          value && Number.isFinite(value.x) && Number.isFinite(value.y)
            ? Math.hypot(value.x - target.x, value.y - target.y)
            : Infinity;
        correct = distance <= 16;
        delta = distance <= 8 ? 300 : correct ? 200 : distance <= 25 ? 75 : 0;
        reason =
          distance < Infinity
            ? `${Math.round(distance)} map units away · ${delta === 300 ? "spot on" : correct ? "close enough" : "keep exploring"}`
            : "No map pin placed";
        p.duel += delta;
      } else if (r.kind === "braai") {
        const seq = Array.isArray(value) ? value : [];
        let hits = 0;
        for (let i = 0; i < s.mini.sequence.length; i++)
          if (seq[i] === s.mini.sequence[i]) hits++;
        correct = hits === s.mini.sequence.length;
        delta = hits * 40 + (correct ? 60 : 0);
        reason = `${hits}/${s.mini.sequence.length} ingredients in the right place`;
        p.duel += delta;
      } else {
        correct = value !== undefined && scoreAnswer(this.question, value);
        const wager = this.wagers[p.id] || 0;
        delta = correct
          ? (r.id === "final" ? 500 : 300) + wager + (p.double ? 200 : 0)
          : -(wager + (p.double ? 100 : 0));
        reason = correct
          ? `${r.id === "huddle" && s.settings.mode === "teams" ? "Shared team answer" : "Correct answer"}${wager ? ` + R${wager} wager` : ""}${p.double ? " + Double Down" : ""}`
          : submission || shared[p.team] !== undefined
            ? `Incorrect answer${wager ? ` · R${wager} wager lost` : ""}${p.double ? " · Double Down −R100" : ""}`
            : "No answer submitted";
        if (correct) {
          p.correct++;
          const speed =
            !p.audience &&
            submission &&
            !(r.id === "huddle" && s.settings.mode === "teams")
              ? Math.max(
                  0,
                  Math.min(
                    30,
                    Math.floor(
                      (submission.remaining ?? s.deadline - submission.at) /
                        1000,
                    ),
                  ),
                )
              : 0;
          delta += speed;
          if (speed) reason += ` · quick answer +R${speed}`;
        }
      }
      if (p.audience) {
        delta = correct ? 50 : 0;
        reason = correct ? "Audience answer bonus" : "Audience participation";
      }
      if (isEvent && delta < 0 && p.shield) {
        p.shield = false;
        delta = 0;
        reason = "Cash Shield protected your cash";
      }
      delta = Math.max(-p.cash, delta);
      p.cash += delta;
      if (s.repairReceipts[p.id]?.delta) {
        delta += s.repairReceipts[p.id].delta;
        reason += " · Robot Repair +R100";
      }
      results.push({ id: p.id, name: p.name, correct, delta, reason });
    }
    if (!isEvent && ["map", "braai"].includes(r.id)) {
      const candidates = results.filter(
        (x) => !s.players.find((p) => p.id === x.id)?.audience,
      );
      const best = Math.max(...candidates.map((x) => x.delta));
      const winners = candidates
        .filter((x) => x.delta === best && best > 0)
        .map((x) => x.id);
      for (const p of s.players) {
        if (winners.includes(this.predictions[p.id])) {
          p.cash += 50;
          const result = results.find((x) => x.id === p.id);
          result.delta += 50;
          result.reason += " · prediction +R50";
        }
      }
    }
    const ranked = [...s.players]
      .filter((p) => !p.audience)
      .sort((a, b) => b.cash - a.cash);
    ranked.forEach((p, i) => {
      p.comeback = Math.max(p.comeback, p.worstRank - (i + 1));
      p.worstRank = Math.max(p.worstRank, i + 1);
    });
    s.results = results;
    s.answer = isEvent
      ? s.event.kind === "repair"
        ? s.event.sequence
            .map((x) => ["SUN", "WAVE", "SPARK", "LEAF"][x])
            .join(" → ")
        : s.event.kind === "memory"
          ? ["Maize", "Apple", "Bread", "Milk"][s.event.missing]
          : s.event.kind === "route"
            ? `Safe: R50 · Shortcut: ${s.event.a * s.event.b}`
            : String(s.event.a + s.event.b)
      : this.question?.answer ||
        (r.kind === "map"
          ? s.mini.target
          : s.mini.sequence
              .map((x) => ["Mielie", "Pepper", "Mushroom", "Sosatie"][x])
              .join(" → "));
    s.fact = isEvent
      ? "A little teamwork keeps the party going. All rewards are fictional game cash."
      : this.question?.fact ||
        (r.kind === "map"
          ? "Our map is a simplified game map. Accuracy matters more than speed."
          : "A perfect recipe earns R300. Every correct position earns R40.");
    s.source = this.question?.source || null;
    s.mapAnswer =
      !isEvent && r.kind === "map"
        ? MAP_CITIES.find((c) => c.name === s.mini.target)
        : null;
    s.history.push({
      round: r.id,
      question: this.question?.id || null,
      event: isEvent ? s.event.id : null,
      results,
    });
    s.phase = isEvent ? "event-results" : "results";
    s.deadline = 0;
    s.paused = false;
  }
}
