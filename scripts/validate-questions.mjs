import fs from "node:fs";
import assert from "node:assert/strict";
import { validateBank } from "../src/engine.js";
import { CATEGORIES } from "../src/catalog.js";
const bank = ["a", "b", "c"].flatMap((x) =>
  JSON.parse(
    fs.readFileSync(
      new URL(`../src/data/questions-${x}.json`, import.meta.url),
    ),
  ),
);
const counts = validateBank(bank);
assert.ok(bank.length >= 600, "At least 600 questions required");
for (const [category] of CATEGORIES)
  assert.ok(counts[category] >= 60, `${category}: expected 60+ questions`);
const formats = new Set([
  "multiple-choice",
  "true-false",
  "image",
  "audio",
  "map",
  "short-answer",
  "scramble",
  "ordering",
  "matching",
]);
for (const q of bank) {
  assert.ok(
    CATEGORIES.some((c) => c[0] === q.category),
    q.id + " category",
  );
  assert.ok(formats.has(q.format), q.id + " format");
  assert.ok(
    ["easy", "medium", "hard"].includes(q.difficulty),
    q.id + " difficulty",
  );
  assert.ok(["all", "teen"].includes(q.age), q.id + " age");
  assert.ok(q.source.title && q.source.note, q.id + " source notes");
  assert.ok(/^https:\/\//.test(q.source.url), q.id + " source URL");
  if (q.format === "ordering")
    assert.deepEqual(
      q.answer.split(" → ").sort(),
      [...q.options].sort(),
      q.id + " ordering",
    );
  if (q.format === "image")
    assert.ok(q.imageKey && q.clue, q.id + " image fallback");
  if (q.format === "audio")
    assert.ok(q.audioText && q.clue, q.id + " audio fallback");
  if (q.format === "map")
    assert.ok(
      q.mapTarget &&
        q.mapTarget.x >= 0 &&
        q.mapTarget.x <= 100 &&
        q.mapTarget.y >= 0 &&
        q.mapTarget.y <= 100,
      q.id + " map target",
    );
}
console.log(
  `Validated ${bank.length} questions, ${Object.keys(counts).length} categories, ${new Set(bank.map((q) => q.format)).size} formats.`,
);
console.log(
  Object.entries(counts)
    .map(([k, v]) => `${k}: ${v}`)
    .join(" · "),
);
