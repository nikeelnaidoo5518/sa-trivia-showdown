import assert from "node:assert/strict";
import test from "node:test";
import { roundsForLength } from "../src/catalog.js";
import { ROUND_MUSIC_IDS } from "../src/sound.js";

test("every round in each match length has its own music theme", () => {
  const themes = new Set(ROUND_MUSIC_IDS);
  assert.equal(themes.size, 20);
  for (const length of [5, 10, 15, 20]) {
    const rounds = roundsForLength(length);
    assert.equal(rounds.length, length);
    for (const round of rounds)
      assert.ok(themes.has(round.id), `Missing music theme for ${round.id}`);
  }
});
