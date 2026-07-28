/**
 * progressions.ts
 *
 * The curated half of Week 4's hybrid architecture. Every progression
 * here is a real, well-known chord loop, written down as scale-degree
 * indices (0 = I/i, 1 = ii, ... 6 = vii) rather than fixed note names —
 * so the same entry works in any key, once mapped through
 * musicTheory.ts's getDiatonicChords() for the actual key the user
 * picked.
 *
 * The AI's only job (see app/api/tag-vibe/route.ts) is to read the
 * user's freeform vibe text and classify it into fixed tags. It never
 * invents a progression — selectProgression.ts does that, deterministically,
 * by scoring these entries against the tags. This is what protects the
 * app from ever suggesting a progression that doesn't musically make sense.
 */

export const GENRES = [
  "pop",
  "rock",
  "indie",
  "folk",
  "blues",
  "ballad",
  "punk",
  "metal",
  "jazz-influenced",
  "lo-fi",
] as const;

export const MOODS = [
  "melancholy",
  "hopeful",
  "triumphant",
  "dreamy",
  "aggressive",
  "nostalgic",
  "romantic",
  "tense",
  "playful",
  "dark",
] as const;

export const ENERGY_LEVELS = ["low", "medium", "high"] as const;

export type Genre = (typeof GENRES)[number];
export type Mood = (typeof MOODS)[number];
export type Energy = (typeof ENERGY_LEVELS)[number];

export type ModeName = "major" | "minor" | "dorian" | "mixolydian";

export type Progression = {
  name: string;
  degrees: number[]; // 0-indexed scale degrees, e.g. [0,5,2,6] = i-VI-III-VII
  requiredMode: ModeName; // the mode this progression is written for
  genres: Genre[];
  moods: Mood[];
  energy: Energy;
  explanation: string; // curator-written, not AI-generated
};

export const PROGRESSIONS: Progression[] = [
  {
    name: "Sensitive singer-songwriter",
    degrees: [0, 5, 2, 6],
    requiredMode: "minor",
    genres: ["pop", "indie", "folk"],
    moods: ["melancholy", "hopeful", "nostalgic"],
    energy: "medium",
    explanation:
      "The i–VI–III–VII pull — melancholy resolving into something almost triumphant, without ever fully landing home.",
  },
  {
    name: "Classic pop-punk drive",
    degrees: [0, 4, 5, 3],
    requiredMode: "major",
    genres: ["pop", "punk", "rock"],
    moods: ["hopeful", "triumphant", "playful"],
    energy: "high",
    explanation:
      "I–V–vi–IV — one of the most-recorded loops in modern pop, built for momentum and singalong choruses.",
  },
  {
    name: "12-bar-style blues turnaround",
    degrees: [0, 0, 3, 3, 0, 0, 4, 3],
    requiredMode: "major",
    genres: ["blues", "rock"],
    moods: ["tense", "dark", "playful"],
    energy: "medium",
    explanation:
      "A simplified I–IV–V blues turnaround, built around tension and release rather than a fixed hook. Real blues uses dominant 7th chords; this is the triad-only shape of the same idea.",
  },
  {
    name: "Dreamy 4-chord loop",
    degrees: [3, 4, 0, 5],
    requiredMode: "major",
    genres: ["indie", "lo-fi", "pop"],
    moods: ["dreamy", "hopeful"],
    energy: "low",
    explanation:
      "IV–V–I–vi glides forward without much tension — good for a hazy, floating feel.",
  },
  {
    name: "Andalusian cadence",
    degrees: [0, 6, 5, 4],
    requiredMode: "minor",
    genres: ["rock", "blues", "jazz-influenced"],
    moods: ["dark", "tense"],
    energy: "medium",
    explanation:
      "i–VII–VI–V, the descending 'Andalusian cadence' — dramatic and slightly ominous, common in flamenco and rock alike.",
  },
  {
    name: "50s doo-wop loop",
    degrees: [0, 5, 3, 4],
    requiredMode: "major",
    genres: ["pop", "ballad"],
    moods: ["romantic", "nostalgic", "hopeful"],
    energy: "low",
    explanation:
      "I–vi–IV–V, the doo-wop progression behind countless slow-dance classics.",
  },
  {
    name: "Folk campfire turn",
    degrees: [0, 3, 4, 0],
    requiredMode: "major",
    genres: ["folk", "ballad"],
    moods: ["hopeful", "nostalgic", "playful"],
    energy: "low",
    explanation:
      "I–IV–V–I, plain and sturdy — the backbone of thousands of folk and campfire songs.",
  },
  {
    name: "Moody rock climb",
    degrees: [5, 3, 0, 4],
    requiredMode: "major",
    genres: ["rock", "indie"],
    moods: ["tense", "hopeful", "dark"],
    energy: "medium",
    explanation:
      "vi–IV–I–V — a climbing loop that keeps arriving at home (I) without ever starting there.",
  },
  {
    name: "Minor key ballad",
    degrees: [0, 3, 4, 0],
    requiredMode: "minor",
    genres: ["ballad", "pop"],
    moods: ["melancholy", "romantic", "dark"],
    energy: "low",
    explanation:
      "i–iv–v–i in a minor key — a sparse, aching loop common in torch-song ballads.",
  },
  {
    name: "Dorian vamp",
    degrees: [0, 3],
    requiredMode: "dorian",
    genres: ["jazz-influenced", "rock", "lo-fi"],
    moods: ["dreamy", "tense", "playful"],
    energy: "medium",
    explanation:
      "i–IV in Dorian mode — a two-chord vamp with a brighter edge than natural minor, a favourite in modal jazz and funk.",
  },
  {
    name: "Mixolydian rock riff",
    degrees: [0, 6, 3],
    requiredMode: "mixolydian",
    genres: ["rock", "punk"],
    moods: ["playful", "hopeful", "aggressive"],
    energy: "high",
    explanation:
      "I–VII–IV in Mixolydian — the flattened seventh gives it a raw edge the plain major scale doesn't have.",
  },
  {
    name: "Lo-fi drift",
    degrees: [3, 0, 5, 4],
    requiredMode: "major",
    genres: ["lo-fi", "indie"],
    moods: ["dreamy", "nostalgic", "melancholy"],
    energy: "low",
    explanation:
      "IV–I–vi–V, looped slowly — an unhurried, wandering feel common in lo-fi and bedroom pop.",
  },
  {
    name: "Aggressive power drive",
    degrees: [0, 3, 5, 4],
    requiredMode: "minor",
    genres: ["metal", "punk", "rock"],
    moods: ["aggressive", "dark", "tense"],
    energy: "high",
    explanation:
      "i–iv–VI–V in a minor key, built for palm-muted urgency rather than resolution.",
  },
  {
    name: "Dorian folk lift",
    degrees: [0, 3, 4, 0],
    requiredMode: "dorian",
    genres: ["folk", "indie", "pop"],
    moods: ["hopeful", "dreamy", "nostalgic"],
    energy: "medium",
    explanation:
      "i–IV–v–i in Dorian — the natural major IV gives a folk-modal lift that plain minor doesn't have, without fully resolving to major.",
  },
  {
    name: "Dorian moody groove",
    degrees: [0, 6, 3],
    requiredMode: "dorian",
    genres: ["rock", "blues", "lo-fi"],
    moods: ["dark", "dreamy", "tense"],
    energy: "medium",
    explanation:
      "i–VII–IV in Dorian — a groove-based vamp closer to modal rock/funk than a resolving progression.",
  },
  {
    name: "Mixolydian pop bounce",
    degrees: [0, 3, 4, 0],
    requiredMode: "mixolydian",
    genres: ["pop", "folk", "indie"],
    moods: ["hopeful", "playful", "nostalgic"],
    energy: "medium",
    explanation:
      "I–IV–V–I in Mixolydian — the same sturdy folk shape as a major I–IV–V, but the flattened seventh keeps it from feeling fully resolved.",
  },
  {
    name: "Mixolydian bluesy vamp",
    degrees: [0, 6],
    requiredMode: "mixolydian",
    genres: ["blues", "rock", "jazz-influenced"],
    moods: ["playful", "dreamy", "tense"],
    energy: "low",
    explanation:
      "I–VII in Mixolydian — a laid-back two-chord vamp, the same flattened-seventh color that defines blues-rock riffing.",
  },
];
