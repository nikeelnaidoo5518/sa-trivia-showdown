export const CATEGORIES = [
  ["places", "Places & provinces", "MapPin"],
  ["sport", "Sport", "Trophy"],
  ["music", "Music & entertainment", "Music2"],
  ["food", "Food & everyday life", "Flame"],
  ["history", "History & culture", "Landmark"],
  ["nature", "Nature & wildlife", "Leaf"],
  ["languages", "Languages & sayings", "MessagesSquare"],
  ["science", "Science & inventions", "Lightbulb"],
  ["childhood", "Schools & childhood", "Backpack"],
  ["mixed", "Mixed Mzansi", "Sparkles"],
];
export const DEFAULT_SETTINGS = {
  mode: "solo",
  length: 10,
  difficulty: "mixed",
  age: "all",
  events: true,
  autoAdvance: true,
  sound: true,
  readQuestions: true,
  reducedMotion: false,
  largeText: false,
  vibration: true,
  categories: CATEGORIES.map((c) => c[0]),
  seconds: 25,
};
export const ROUNDS = [
  {
    id: "warmup",
    name: "Warm-Up",
    eyebrow: "LET’S GET THE CASH FLOWING",
    icon: "Sun",
    description:
      "Five easy questions from one category. Pick answers on your phone.",
    kind: "question",
    count: 5,
  },
  {
    id: "province",
    name: "Pick Your Province",
    eyebrow: "HOME GROUND ADVANTAGE",
    icon: "MapPin",
    description:
      "Vote on a province, then take five questions from one local category.",
    kind: "question",
    provinceVote: true,
    count: 5,
  },
  {
    id: "picture",
    name: "Picture This",
    eyebrow: "A LITTLE LOCAL KNOW-HOW",
    icon: "Image",
    description:
      "Five questions from one category, with picture clues when available.",
    kind: "question",
    count: 5,
  },
  {
    id: "map",
    name: "Mzansi Map Sprint",
    eyebrow: "PUT YOUR PLACE ON THE MAP",
    icon: "Map",
    description:
      "Five city challenges. Tap the map close to each place to earn more.",
    kind: "map",
    count: 5,
  },
  {
    id: "sound",
    name: "Sound It Out",
    eyebrow: "LISTEN UP, MZANSI",
    icon: "Volume2",
    description:
      "Five questions from one category. Play spoken clues where available; a written clue is always there.",
    kind: "question",
    count: 5,
  },
  {
    id: "risk",
    name: "Case Crackers",
    eyebrow: "PICK THE RIGHT CASE",
    icon: "BriefcaseBusiness",
    description:
      "Five questions from one category. Pick an answer case, watch for decoy traps, and lock a secret wager.",
    kind: "question",
    wager: true,
    caseMode: true,
    formatGroup: "choice",
    count: 5,
  },
  {
    id: "huddle",
    name: "Team Huddle",
    eyebrow: "GREAT MINDS, ONE ANSWER",
    icon: "Users",
    description:
      "Five questions from one category. Teams discuss and submit one shared answer each time.",
    kind: "question",
    count: 5,
  },
  {
    id: "braai",
    name: "Braai Battle",
    eyebrow: "BRING THE HEAT",
    icon: "Flame",
    description:
      "Follow the visible recipe and tap the ingredients in order. Everyone can play.",
    kind: "braai",
    count: 1,
  },
  {
    id: "mix",
    name: "The Mzansi Mix",
    eyebrow: "FIVE QUESTIONS. BIG ENERGY.",
    icon: "Shuffle",
    description: "Five quick questions from one category, with varied formats.",
    kind: "question",
    count: 5,
  },
  {
    id: "final",
    name: "Final Showdown",
    eyebrow: "THE CASH-CLIMB FINALE",
    icon: "Crown",
    description:
      "Seven questions from one category. Rewards climb from R300 to R900, then lock a secret wager on the last question.",
    kind: "question",
    count: 7,
  },
];
export const QUICK_ROUNDS = ["warmup", "picture", "map", "braai", "final"];
const LONG_ROUNDS = [
  {
    id: "soundEncore",
    name: "Sound Stage Encore",
    eyebrow: "LISTEN CLOSE, ANSWER LOUD",
    icon: "Headphones",
    description:
      "Five questions from one category, with spoken clues where available.",
    kind: "question",
    format: "audio",
    count: 5,
  },
  {
    id: "quickfire",
    name: "Quickfire Rally",
    eyebrow: "FIVE QUESTIONS. NO WARM-UP",
    icon: "Zap",
    description:
      "Five rapid questions from one category. Keep your phone ready.",
    kind: "question",
    formatGroup: "choice",
    fast: true,
    count: 5,
  },
  {
    id: "picturePuzzle",
    name: "Picture Puzzle",
    eyebrow: "LOOK AGAIN",
    icon: "ScanEye",
    description:
      "Five questions from one category, with illustrated clues where available.",
    kind: "question",
    format: "image",
    count: 5,
  },
  {
    id: "homeground",
    name: "Homeground Return",
    eyebrow: "PICK YOUR PROVINCE",
    icon: "MapPinned",
    description:
      "Vote for a province, then take on five questions from one regional category.",
    kind: "question",
    provinceVote: true,
    count: 5,
  },
  {
    id: "drum",
    name: "Drum Beat Duel",
    eyebrow: "FEEL THE RHYTHM",
    icon: "Drum",
    description: "Copy the bright drum pattern on your phone to score points.",
    kind: "drum",
    count: 1,
  },
  {
    id: "mixEncore",
    name: "The Mzansi Remix",
    eyebrow: "A FRESH MIX OF LOCAL KNOW-HOW",
    icon: "Shuffle",
    description: "Five varied questions from one category.",
    kind: "question",
    count: 5,
  },
  {
    id: "riskEncore",
    name: "Risk & Reward",
    eyebrow: "BACK YOUR KNOWLEDGE",
    icon: "Coins",
    description:
      "Five case questions from one category. Wager before each pick.",
    kind: "question",
    wager: true,
    caseMode: true,
    formatGroup: "choice",
    count: 5,
  },
  {
    id: "mapEncore",
    name: "Map Mzansi: Rematch",
    eyebrow: "PUT A PIN IN IT",
    icon: "Map",
    description:
      "Five more city challenges. Place every pin as accurately as you can.",
    kind: "map",
    count: 5,
  },
  {
    id: "braaiEncore",
    name: "Braai Battle: Second Serving",
    eyebrow: "BACK TO THE BRAAI",
    icon: "Flame",
    description: "A new visible recipe sequence. Tap the ingredients in order.",
    kind: "braai",
    count: 1,
  },
  {
    id: "soundFinale",
    name: "One More Sound",
    eyebrow: "TRUST YOUR EARS",
    icon: "AudioLines",
    description:
      "Five questions from one category, with spoken clues where available.",
    kind: "question",
    format: "audio",
    count: 5,
  },
];
export function roundsForLength(length = 10) {
  const requested = Number(length);
  const rounds = new Map(ROUNDS.map((round) => [round.id, round]));
  if (requested === 5) return QUICK_ROUNDS.map((id) => rounds.get(id));
  const size = [10, 15, 20].includes(requested) ? requested : 10;
  const standard = ROUNDS.filter((round) => round.id !== "final");
  return [...standard, ...LONG_ROUNDS.slice(0, size - 10), rounds.get("final")];
}
export const CARDS = [
  {
    id: "steal",
    name: "Steal",
    icon: "HandCoins",
    effect:
      "After a wrong answer, take up to R100 from the leading opponent. Their shield blocks it.",
  },
  {
    id: "shield",
    name: "Cash Shield",
    icon: "Shield",
    effect:
      "Protect yourself from the next steal or event loss, up to R100. Stays active until used.",
  },
  {
    id: "hint",
    name: "Extra Hint",
    icon: "Lightbulb",
    effect:
      "Remove one wrong option from your phone. Use before submitting a multiple-choice answer.",
  },
  {
    id: "double",
    name: "Double Down",
    icon: "ChevronsUp",
    effect:
      "Add R200 to a correct answer. Lose R100 if incorrect. Use before submitting.",
  },
  {
    id: "repair",
    name: "Robot Repair",
    icon: "Bot",
    effect:
      "Complete a four-button repair sequence during a question to earn R100. One attempt.",
  },
  {
    id: "backup",
    name: "Power Backup",
    icon: "BatteryCharging",
    effect:
      "Use during Load-shedding: complete just the first three switches instead of four.",
  },
];
export const EVENTS = [
  {
    id: "power",
    name: "Load-shedding",
    icon: "BatteryCharging",
    kind: "repair",
    instruction:
      "Keep the party powered: follow the visible four-switch backup sequence.",
    reward: 100,
  },
  {
    id: "robots",
    name: "Broken Robots",
    icon: "Bot",
    kind: "repair",
    instruction:
      "Our fictional traffic robot needs a tune-up. Follow the visible repair code.",
    reward: 100,
  },
  {
    id: "municipal",
    name: "Municipal Mayhem",
    icon: "Building2",
    kind: "puzzle",
    instruction:
      "The imaginary town of Puzzlefontein misplaced its petty cash. Find the missing amount.",
    reward: 100,
  },
  {
    id: "taxi",
    name: "Taxi Detour",
    icon: "Bus",
    kind: "route",
    instruction:
      "Safe route: R50. Shortcut: solve the route puzzle for R150, or lose R50.",
    reward: 150,
  },
  {
    id: "envelope",
    name: "Mystery Envelope",
    icon: "Mail",
    kind: "catch",
    instruction: "Catch the surprise token, then solve its quick sum for R100.",
    reward: 100,
  },
  {
    id: "cash",
    name: "Cash-in-Transit Chaos",
    icon: "Banknote",
    kind: "catch",
    instruction:
      "Tap the rolling game-money bag, then solve a quick sum to keep R100.",
    reward: 100,
  },
];
export const AVATARS = [
  "Sun",
  "Flame",
  "Zap",
  "Flower2",
  "Rocket",
  "Music2",
  "Palmtree",
  "Star",
];
export const COLOURS = [
  "#41e3f5",
  "#ffd64a",
  "#ff50c7",
  "#a855f7",
  "#61baff",
  "#ee84dc",
];
export const PROVINCES = [
  "Eastern Cape",
  "Free State",
  "Gauteng",
  "KwaZulu-Natal",
  "Limpopo",
  "Mpumalanga",
  "North West",
  "Northern Cape",
  "Western Cape",
];
export const MAP_CITIES = [
  { name: "Cape Town", x: 15, y: 82 },
  { name: "Durban", x: 83, y: 58 },
  { name: "Johannesburg", x: 65, y: 32 },
  { name: "Pretoria", x: 67, y: 24 },
  { name: "Bloemfontein", x: 52, y: 53 },
  { name: "Gqeberha", x: 57, y: 85 },
  { name: "Polokwane", x: 75, y: 12 },
  { name: "Mbombela", x: 85, y: 29 },
  { name: "Kimberley", x: 39, y: 49 },
  { name: "Upington", x: 20, y: 40 },
];
export const cash = (n) => `R${Math.round(n || 0).toLocaleString("en-ZA")}`;
export const questionReward = (round, questionIndex = 0) =>
  round?.id === "final" ? 300 + Math.max(0, questionIndex) * 100 : 300;
