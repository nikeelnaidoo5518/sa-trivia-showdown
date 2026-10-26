const HOST_INTROS = [
  "Alright, here we go.",
  "Let's see what you've got.",
  "Listen closely, everyone.",
  "Time to put your Mzansi knowledge to the test.",
  "Here's the next one.",
];

export function englishVoices(
  voices = globalThis.speechSynthesis?.getVoices?.() || [],
) {
  return voices
    .filter((voice) => /^en(?:-|_)/i.test(voice.lang || ""))
    .sort((a, b) => voiceScore(b) - voiceScore(a));
}

function voiceScore(voice) {
  const name = voice.name.toLowerCase();
  const lang = voice.lang.toLowerCase().replaceAll("_", "-");
  let score = 0;
  if (/natural|neural|premium|enhanced/.test(name)) score += 100;
  if (/online/.test(name)) score += 40;
  if (lang.startsWith("en-za")) score += 70;
  else if (lang.startsWith("en-gb")) score += 45;
  else if (lang.startsWith("en-au")) score += 40;
  else if (lang.startsWith("en-us")) score += 25;
  if (voice.default) score += 2;
  return score;
}

export function chooseEnglishVoice(voices, preferredURI = "") {
  const english = englishVoices(voices);
  return (
    english.find((voice) => voice.voiceURI === preferredURI) ||
    english[0] ||
    null
  );
}

export function hostQuestionText(prompt, questionId = "") {
  const text = String(prompt || "").trim();
  if (!text) return "";
  let hash = 0;
  for (const char of String(questionId || text))
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return `${HOST_INTROS[hash % HOST_INTROS.length]} ${text}`;
}

export function speak(text, enabled, preferredURI = "") {
  if (
    !enabled ||
    !text ||
    !("speechSynthesis" in globalThis) ||
    typeof SpeechSynthesisUtterance === "undefined"
  )
    return;
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(String(text).trim());
  const voice = chooseEnglishVoice(
    speechSynthesis.getVoices?.() || [],
    preferredURI,
  );
  utterance.voice = voice;
  utterance.lang = voice?.lang || "en-ZA";
  // The previous slower, higher-pitched setting made many device voices sound
  // more synthetic. A near-conversational pace and neutral pitch read cleanly.
  utterance.rate = 0.98;
  utterance.pitch = 1;
  utterance.volume = 1;
  speechSynthesis.speak(utterance);
}

export function cancelSpeech() {
  if ("speechSynthesis" in globalThis) speechSynthesis.cancel();
}
