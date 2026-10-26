import test from "node:test";
import assert from "node:assert/strict";
import {
  chooseEnglishVoice,
  englishVoices,
  hostQuestionText,
} from "../src/speech.js";

const voices = [
  { name: "English (South Africa)", lang: "en-ZA", voiceURI: "za-basic" },
  {
    name: "English (United Kingdom) Natural",
    lang: "en-GB",
    voiceURI: "gb-natural",
  },
  { name: "Français", lang: "fr-FR", voiceURI: "fr" },
];

test("voice list offers English voices and favours a natural installed voice", () => {
  assert.deepEqual(
    englishVoices(voices).map((voice) => voice.voiceURI),
    ["gb-natural", "za-basic"],
  );
  assert.equal(chooseEnglishVoice(voices).voiceURI, "gb-natural");
});

test("a player can select a particular English voice", () => {
  assert.equal(chooseEnglishVoice(voices, "za-basic").voiceURI, "za-basic");
  assert.equal(chooseEnglishVoice(voices, "missing").voiceURI, "gb-natural");
});

test("question intros sound conversational and vary consistently by question", () => {
  const first = hostQuestionText(
    "How many provinces make up South Africa?",
    "places-001",
  );
  const second = hostQuestionText(
    "How many provinces make up South Africa?",
    "places-002",
  );
  assert.match(
    first,
    /^(Alright, here we go\.|Let's see what you've got\.|Listen closely, everyone\.|Time to put your Mzansi knowledge to the test\.|Here's the next one\.) /,
  );
  assert.notEqual(first, "Question. How many provinces make up South Africa?");
  assert.equal(
    first,
    hostQuestionText("How many provinces make up South Africa?", "places-001"),
  );
  assert.notEqual(first, second);
});
