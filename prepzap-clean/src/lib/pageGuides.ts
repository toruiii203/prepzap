import { TUTORIAL_CONTENT, type TutorialFeature } from "@/lib/tutorialContent";

export const OWNED_GUIDE_ROUTES = new Set([
  "/dashboard",
  "/ai-tutor",
  "/flashcards",
  "/practice",
  "/math",
  "/teach-it",
  "/quick-study",
  "/planner",
  "/arena",
  "/sources",
  "/mistakes",
  "/notes",
  "/arcade",
  "/visual-learner",
]);
const ALIASES: Record<string, string> = {
  "/leaderboard": "/arena",
  "/source-library": "/sources",
};
const EXTRA: Record<string, { title: string; steps: TutorialFeature[] }> = {
  "/rooms": {
    title: "Live battles",
    steps: [
      {
        icon: "swords",
        title: "Choose your battle",
        desc: "Create a live room or join an existing one here. Arena now focuses on the daily challenge.",
      },
      {
        icon: "groups",
        title: "Get everyone ready",
        desc: "Share the room code with your classmates, then follow the room's ready and start controls.",
      },
    ],
  },
  "/profile": {
    title: "Profile",
    steps: [
      {
        icon: "person",
        title: "Make your profile yours",
        desc: "Use Customize Profile to change your picture, banner and study details.",
      },
      {
        icon: "palette",
        title: "Preview before saving",
        desc: "Choose a Studenius portrait or upload your own image. Select Save Profile when you are ready.",
      },
    ],
  },
  "/settings": {
    title: "Settings",
    steps: [
      {
        icon: "contrast",
        title: "Choose your appearance",
        desc: "Follow your device or choose light or dark mode.",
        target: 'select[aria-label="Appearance"]',
      },
      {
        icon: "volume_up",
        title: "Set feedback your way",
        desc: "Sound and vibration are optional. iOS Safari relies on visual feedback instead of browser vibration.",
        target: ".interface-settings",
      },
    ],
  },
  "/timer": {
    title: "Focus timer",
    steps: [
      {
        icon: "timer",
        title: "Set one focus session",
        desc: "Choose a study duration and start when you are ready.",
      },
      {
        icon: "pause",
        title: "Keep control of your session",
        desc: "Use the timer's pause and finish controls when your study session changes.",
      },
    ],
  },
  "/tools": {
    title: "Study tools",
    steps: [
      {
        icon: "widgets",
        title: "Pick a way to study",
        desc: "Choose a tool for the task you have now: recall, explanation, notes or practice.",
      },
      {
        icon: "help",
        title: "Find help in context",
        desc: "Open Page guide inside a tool to learn how its main controls work.",
      },
    ],
  },
  "/friends": {
    title: "Friends",
    steps: [
      {
        icon: "person_search",
        title: "Find a classmate",
        desc: "Use the search and request controls to connect with someone you know.",
      },
      {
        icon: "groups",
        title: "Study together",
        desc: "Use Live battles when you want to create or join a study room.",
      },
    ],
  },
  "/community": {
    title: "Community",
    steps: [
      {
        icon: "forum",
        title: "Explore the community",
        desc: "Read what students have shared and open a post to see more.",
      },
      {
        icon: "edit_note",
        title: "Share with care",
        desc: "Use the posting controls when you have something useful to contribute. Review what you are sharing first.",
      },
    ],
  },
  "/campus-vault": {
    title: "Campus Vault",
    steps: [
      {
        icon: "search",
        title: "Find shared material",
        desc: "Browse or search for notes, decks and quizzes relevant to your class.",
      },
      {
        icon: "content_copy",
        title: "Make it your own",
        desc: "Open an item to review it before using the available save or copy action.",
      },
    ],
  },
};
export function guideForPage(path: string) {
  const key = ALIASES[path] || path;
  if (EXTRA[key]) return { key, ...EXTRA[key] };
  const raw =
    key.split("/").filter(Boolean)[0]?.replace(/-/g, " ") || "This page";
  const title = raw.charAt(0).toUpperCase() + raw.slice(1);
  return {
    key,
    title,
    steps: TUTORIAL_CONTENT[key] || [
      {
        icon: "explore",
        title: "Find your next action",
        desc: "Start with the main action on this page. Open a card or section to see its details.",
      },
      {
        icon: "arrow_back",
        title: "Keep your place",
        desc: "Use the page navigation to return to your study space. Close dialogs before moving to another task.",
      },
    ],
  };
}
