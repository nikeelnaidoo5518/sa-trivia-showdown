import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { GameEngine, standings, scoreAnswer } from "../src/engine.js";
import { EVENTS, MAP_CITIES } from "../src/catalog.js";
const bank = ["a", "b", "c"].flatMap((x) =>
  JSON.parse(
    fs.readFileSync(
      new URL(`../src/data/questions-${x}.json`, import.meta.url),
    ),
  ),
);
function game(settings = {}) {
  const e = new GameEngine(bank, { events: false, ...settings }, [], () => 0.3);
  e.addPlayer("a", { name: "Nikeel", team: "Ubuntu" });
  e.addPlayer("b", { name: "Thandi", team: "Eish!" });
  return e;
}
const input = (e, p, type, value, extra = {}) =>
  e.input(p, { type, value, activityId: e.state.activityId, ...extra });
function completeActivity(e) {
  const s = e.state;
  if (s.phase === "select") {
    input(e, "a", "vote", "Western Cape");
    e.next();
  }
  if (s.phase === "wager") {
    input(e, "a", "wager", 100);
    input(e, "b", "wager", 100);
    e.next();
  }
  if (s.phase === "playing") {
    let value = e.question?.answer;
    if (s.mini?.kind === "map")
      value = MAP_CITIES.find((c) => c.name === s.mini.target);
    if (s.mini?.kind === "braai") value = s.mini.sequence;
    input(e, "a", "answer", value);
    input(e, "b", "answer", value);
    e.next();
  }
}
test("all 10 rounds, 3-question mix, linked solo huddle, unique questions, final then credits", () => {
  const e = game();
  e.start();
  let steps = 0;
  const visited = new Set();
  while (e.state.phase !== "credits" && steps++ < 80) {
    visited.add(e.round.id);
    if (e.state.phase === "tutorial") e.next();
    else if (["playing", "wager", "select"].includes(e.state.phase))
      completeActivity(e);
    else e.next();
  }
  assert.equal(steps < 80, true);
  assert.equal(visited.size, 10);
  assert.equal(e.state.history.length, 13);
  assert.equal(new Set(e.used).size, e.used.length);
  assert.equal(e.state.history.filter((h) => h.round === "huddle").length, 2);
  assert.equal(e.state.history.filter((h) => h.round === "mix").length, 3);
  assert.equal(e.state.phase, "credits");
  assert.ok(e.state.players[0].cash > 3000);
});
test("quick match contains exactly five specified rounds", () => {
  const e = game({ length: 5 });
  assert.deepEqual(
    e.state.rounds.map((r) => r.id),
    ["warmup", "picture", "map", "braai", "final"],
  );
});
test("pause freezes timeout, rejects input; skip preserves balances; end reaches final", () => {
  const e = game();
  e.start();
  e.next();
  e.pause();
  assert.equal(e.state.paused, true);
  assert.throws(() => input(e, "a", "answer", e.question.answer), /paused/);
  e.tick(Date.now() + 100000);
  assert.equal(e.state.phase, "playing");
  e.pause();
  assert.equal(e.state.paused, false);
  const before = e.state.players[0].cash;
  e.skip();
  assert.equal(e.state.phase, "results");
  assert.equal(e.state.players[0].cash, before);
  e.end();
  assert.equal(e.state.phase, "final");
  e.next();
  assert.equal(e.state.phase, "credits");
});
test("private answers, late and duplicate submissions", () => {
  const e = game();
  e.start();
  e.next();
  assert.equal(e.snapshot().question.answer, undefined);
  assert.equal(e.snapshot().question.fact, undefined);
  input(e, "a", "answer", "a private wrong answer");
  assert.equal(
    JSON.stringify(e.snapshot()).includes("a private wrong answer"),
    false,
  );
  assert.throws(() => input(e, "a", "answer", e.question.answer), /locked/);
  assert.throws(
    () => e.input("b", { type: "answer", value: 1, activityId: "old" }),
    /ended/,
  );
  e.state.deadline = Date.now() - 1;
  assert.throws(() => input(e, "b", "answer", 1), /Time is up/);
});
test("wagers are clamped to balance and round cap; no negative cash", () => {
  const e = game();
  e.state.roundIndex = 5;
  e.state.phase = "tutorial";
  e.begin();
  input(e, "a", "wager", 99999);
  assert.equal(e.wagers.a, 300);
  e.next();
  input(e, "a", "answer", "wrong");
  e.next();
  assert.equal(e.state.players[0].cash, 200);
  assert.equal(e.state.results[0].delta, -300);
});
test("cards: hints, double down, repairs, shield and capped steal", () => {
  const e = game();
  e.start();
  e.next();
  input(e, "a", "card", null, { card: "hint" });
  assert.notEqual(e.state.hints.a, e.question.answer);
  input(e, "a", "card", null, { card: "double" });
  input(e, "a", "card", null, { card: "repair" });
  input(e, "a", "repair", [0, 2, 1, 3]);
  assert.equal(e.state.players[0].cash, 600);
  input(e, "b", "card", null, { card: "shield" });
  input(e, "a", "answer", "wrong");
  input(e, "b", "answer", e.question.answer);
  e.resolve();
  assert.equal(e.state.results[0].delta, 0);
  assert.match(e.state.results[0].reason, /Robot Repair/);
  input(e, "a", "card", null, { card: "steal" });
  assert.match(e.state.notice, /blocked/);
  assert.equal(e.state.players[1].shield, false);
  assert.throws(
    () => input(e, "a", "card", null, { card: "steal" }),
    /already/,
  );
});
test("team majority is shared, ties use earliest submission; team score uses average", () => {
  const e = game({ mode: "teams" });
  e.addPlayer("c", { name: "Sipho", team: "Ubuntu" });
  e.state.roundIndex = 6;
  e.state.phase = "tutorial";
  e.begin();
  input(e, "c", "answer", e.question.answer);
  e.inputs.c.at = 100;
  input(e, "a", "answer", "wrong");
  e.inputs.a.at = 200;
  input(e, "b", "answer", "wrong");
  e.resolve();
  assert.equal(e.state.results[0].correct, true);
  assert.equal(e.state.results[2].correct, true);
  assert.equal(e.state.results[1].correct, false);
  assert.equal(standings(e.state)[0].cash, 800);
  e.next();
  assert.equal(e.round.id, "braai");
});
test("all six events resolve, losses bounded, backup reduces required sequence", () => {
  for (const event of EVENTS) {
    const e = game();
    e.state.roundIndex = 1;
    e.startEvent();
    e.state.event = {
      ...event,
      sequence: [0, 1, 2, 3],
      a: 4,
      b: 3,
      missing: 2,
    };
    const ev = e.state.event;
    if (ev.id === "power") input(e, "a", "card", null, { card: "backup" });
    const value =
      ev.kind === "repair"
        ? ev.id === "power"
          ? [0, 1, 2]
          : ev.sequence
        : ev.kind === "memory"
          ? 2
          : ev.kind === "route"
            ? 12
            : ev.kind === "catch"
              ? { caught: true, answer: 7 }
              : 7;
    input(e, "a", "answer", value);
    e.resolve();
    assert.equal(e.state.phase, "event-results");
    assert.ok(e.state.results[0].delta > 0, event.id);
    assert.ok(e.state.results.every((r) => r.delta >= -100));
  }
});
test("duel predictions and audience bonuses do not enter competitive standings", () => {
  const e = game();
  e.addPlayer("spectator", { name: "Watcher", audience: true });
  e.state.roundIndex = 3;
  e.state.phase = "tutorial";
  input(e, "spectator", "predict", "a");
  e.begin();
  input(
    e,
    "a",
    "answer",
    MAP_CITIES.find((c) => c.name === e.state.mini.target),
  );
  input(e, "b", "answer", { x: 0, y: 0 });
  e.resolve();
  assert.equal(e.state.players[2].cash, 550);
  assert.equal(standings(e.state).length, 2);
});
test("reconnection preserves nickname, score and cards; restore preserves private engine state", () => {
  const e = game();
  e.start();
  e.next();
  input(e, "a", "card", null, { card: "shield" });
  input(e, "a", "answer", e.question.answer);
  const restored = GameEngine.restore(
    bank,
    JSON.parse(JSON.stringify(e.serialise())),
  );
  const p = restored.addPlayer("a", { name: "Different" });
  assert.equal(p.name, "Nikeel");
  assert.equal(p.shield, true);
  assert.equal(p.cards.includes("shield"), false);
  restored.resolve();
  assert.equal(p.cash, 800);
});
test("recent history avoidance and settings filters hold across matches", () => {
  const a = game({ categories: ["food"], difficulty: "easy" });
  a.start();
  a.next();
  const b = new GameEngine(
    bank,
    { categories: ["food"], difficulty: "easy" },
    a.used,
    () => 0.3,
  );
  b.addPlayer("a", { name: "A" });
  b.start();
  b.next();
  assert.notEqual(a.question.id, b.question.id);
  assert.equal(b.question.category, "food");
  assert.equal(b.question.age, "all");
  assert.equal(b.question.difficulty, "easy");
});
test("short answers accept punctuation, case, diacritics and explicit alternatives", () => {
  assert.equal(
    scoreAnswer(
      { answer: "Gqeberha", acceptedAnswers: ["Port Elizabeth"] },
      " port ELIZABETH! ",
    ),
    true,
  );
  assert.equal(scoreAnswer({ answer: "Crème" }, "creme"), true);
});
