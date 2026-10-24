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
  sound: true,
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
    description: "An easy opener. Pick the answer on your phone.",
    kind: "question",
    count: 1,
  },
  {
    id: "province",
    name: "Pick Your Province",
    eyebrow: "HOME GROUND ADVANTAGE",
    icon: "MapPin",
    description: "Vote for a province, then tackle a regional question.",
    kind: "question",
    count: 1,
  },
  {
    id: "picture",
    name: "Picture This",
    eyebrow: "A LITTLE LOCAL KNOW-HOW",
    icon: "Image",
    description: "Use the illustration and clues to find the answer.",
    kind: "question",
    count: 1,
  },
  {
    id: "map",
    name: "Mzansi Map Sprint",
    eyebrow: "PUT YOUR PLACE ON THE MAP",
    icon: "Map",
    description:
      "Tap the map as close to the named city as possible. Accuracy wins.",
    kind: "map",
    count: 1,
  },
  {
    id: "sound",
    name: "Sound It Out",
    eyebrow: "LISTEN UP, MZANSI",
    icon: "Volume2",
    description:
      "Listen to the spoken clue. A written clue is always available.",
    kind: "question",
    count: 1,
  },
  {
    id: "risk",
    name: "Risk It",
    eyebrow: "BACK YOUR KNOWLEDGE",
    icon: "Coins",
    description: "Secretly wager up to R300 in game cash, then answer.",
    kind: "question",
    count: 1,
  },
  {
    id: "huddle",
    name: "Team Huddle",
    eyebrow: "GREAT MINDS, ONE ANSWER",
    icon: "Users",
    description:
      "Teams discuss and vote: majority answer wins. Solo players solve two linked challenges.",
    kind: "question",
    count: 2,
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
    eyebrow: "THREE QUESTIONS. BIG ENERGY.",
    icon: "Shuffle",
    description: "Three quick questions from a mix of categories.",
    kind: "question",
    count: 3,
  },
  {
    id: "final",
    name: "Final Showdown",
    eyebrow: "ONE LAST CHANCE FOR GLORY",
    icon: "Crown",
    description:
      "Secretly wager up to R500. A correct final answer earns R500 plus your wager.",
    kind: "question",
    count: 1,
  },
];
export const QUICK_ROUNDS = ["warmup", "picture", "map", "braai", "final"];
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
  "#50d5c0",
  "#ffcb60",
  "#ff8b80",
  "#b5a0ff",
  "#80c9ff",
  "#e8a6d0",
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
