import type { Localized } from "../i18n";
import type { GameType } from "../types";

export type GameInfo = {
  type: GameType;
  name: Localized;
  icon: string;
  /** Patient-friendly description of what we enjoy (never a clinical skill label). */
  focus: Localized;
  intro: Localized;
  /** Shown to caregivers only. */
  caregiverFocus: string;
  needs: string;
  color: string;
};

export const GAMES: Record<GameType, GameInfo> = {
  "memory-reveal": {
    type: "memory-reveal",
    name: { en: "Memory Reveal", te: "జ్ఞాపకం ఆవిష్కరణ" },
    icon: "🌫️",
    focus: { en: "Looking closely", te: "జాగ్రత్తగా చూడటం" },
    intro: {
      en: "Let's peek at a picture that slowly becomes clearer. Tap “Show me more” whenever you like.",
      te: "మెల్లగా స్పష్టమయ్యే ఒక ఫోటోని చూద్దాం. కావలసినప్పుడు “ఇంకా చూపించండి” తాకండి.",
    },
    caregiverFocus: "Visual recognition of personal photographs (progressive blur reveal)",
    needs: "Approved photos with a short title",
    color: "var(--color-lavender)",
  },
  "who-is-this": {
    type: "who-is-this",
    name: { en: "Who Is This?", te: "ఇది ఎవరు?" },
    icon: "🙂",
    focus: { en: "Familiar faces", te: "తెలిసిన ముఖాలు" },
    intro: {
      en: "Let's look at some lovely faces from your photos.",
      te: "మీ ఫోటోల్లోని ఆత్మీయ ముఖాలను చూద్దాం.",
    },
    caregiverFocus: "Recognising loved ones (face-focused crops, caregiver-labelled identities only)",
    needs: "At least 2 people labelled in approved photos",
    color: "var(--color-peach)",
  },
  "remember-scene": {
    type: "remember-scene",
    name: { en: "Remember the Scene", te: "దృశ్యాన్ని గుర్తుచేసుకుందాం" },
    icon: "🖼️",
    focus: { en: "Noticing details", te: "వివరాలు గమనించడం" },
    intro: {
      en: "We'll look at a picture together, then talk about what we saw.",
      te: "ముందు ఒక ఫోటోని కలిసి చూద్దాం, తర్వాత అందులో ఏం చూశామో మాట్లాడుకుందాం.",
    },
    caregiverFocus: "Short-term visual recall of caregiver-verified details",
    needs: "Approved photos with at least 2 labelled things in them",
    color: "var(--color-sky)",
  },
  "memory-match": {
    type: "memory-match",
    name: { en: "Memory Match", te: "జతలు కలుపుదాం" },
    icon: "🃏",
    focus: { en: "Finding pairs", te: "జతలు వెతకడం" },
    intro: { en: "Let's find the things that go together.", te: "కలిసే వాటిని వెతుకుదాం." },
    caregiverFocus: "Matching pictures, faces ↔ names, people ↔ relationships, events ↔ photos",
    needs: "At least 2 approved photos (more variety with labelled people and events)",
    color: "var(--color-coral)",
  },
  "find-memory": {
    type: "find-memory",
    name: { en: "Find the Memory", te: "జ్ఞాపకాన్ని వెతుకుదాం" },
    icon: "🔍",
    focus: { en: "Exploring memories", te: "జ్ఞాపకాల్లో విహారం" },
    intro: {
      en: "Let's go on a little treasure hunt through your memories.",
      te: "మీ జ్ఞాపకాల్లో ఒక చిన్న నిధి వేట చేద్దాం.",
    },
    caregiverFocus: "Category-based exploration powered by Cloudinary Search (tags & metadata)",
    needs: "Approved photos with tags or categories (at least 2 photos)",
    color: "var(--color-gold)",
  },
  "whats-missing": {
    type: "whats-missing",
    name: { en: "What's Missing?", te: "ఏది దాక్కుంది?" },
    icon: "🫣",
    focus: { en: "Spotting changes", te: "మార్పు గుర్తించడం" },
    intro: {
      en: "Something in the picture likes to play hide and seek!",
      te: "ఫోటోలో ఏదో దాగుడుమూతలు ఆడుతోంది!",
    },
    caregiverFocus: "Noticing a hidden object (Cloudinary region blur on caregiver-marked objects)",
    needs: "Approved photos with at least 2 things marked with a box",
    color: "var(--color-sage)",
  },
  "picture-puzzle": {
    type: "picture-puzzle",
    name: { en: "Picture Puzzle", te: "ఫోటో ముక్కలు" },
    icon: "🧩",
    focus: { en: "Putting pieces together", te: "ముక్కలు కలపడం" },
    intro: {
      en: "Let's put a picture back together, piece by piece.",
      te: "ఒక ఫోటోని ముక్క ముక్కగా మళ్ళీ కలుపుదాం.",
    },
    caregiverFocus: "Visuospatial play with a few large pieces (Cloudinary tile crops)",
    needs: "At least 1 approved photo",
    color: "var(--color-peach)",
  },
  "memory-story": {
    type: "memory-story",
    name: { en: "Memory Story", te: "జ్ఞాపకాల కథ" },
    icon: "📖",
    focus: { en: "Enjoying stories", te: "కథలు ఆస్వాదించడం" },
    intro: {
      en: "Let's enjoy a story made from your memories.",
      te: "మీ జ్ఞాపకాలతో చేసిన కథను ఆస్వాదిద్దాం.",
    },
    caregiverFocus: "Reminiscence through caregiver-captioned stories and life timelines",
    needs: "A caregiver story, or approved photos with approved captions (timelines need years)",
    color: "var(--color-lavender)",
  },
  "sound-memory": {
    type: "sound-memory",
    name: { en: "Sound and Memory", te: "శబ్దం - జ్ఞాపకం" },
    icon: "🎵",
    focus: { en: "Listening", te: "వినడం" },
    intro: { en: "Let's listen to a familiar sound.", te: "తెలిసిన ఒక శబ్దాన్ని విందాం." },
    caregiverFocus: "Auditory reminiscence with caregiver-approved music and recorded greetings",
    needs: "An audio clip linked to a photo, plus 1 more approved photo",
    color: "var(--color-sky)",
  },
  "daily-life": {
    type: "daily-life",
    name: { en: "Daily Life Match", te: "రోజువారీ జతలు" },
    icon: "☕",
    focus: { en: "Everyday life", te: "రోజువారీ జీవితం" },
    intro: {
      en: "Let's match things we use every day.",
      te: "రోజూ వాడే వస్తువులను జత చేద్దాం.",
    },
    caregiverFocus: "Everyday routines and object–place associations",
    needs: "Starter cards enabled, or caregiver-made pairs from personal photos",
    color: "var(--color-cream-deep)",
  },
};

export const GAME_LIST = Object.values(GAMES);
