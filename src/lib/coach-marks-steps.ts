export type CoachMarkPlacement = "top" | "bottom" | "left" | "right";

export interface CoachMarkStep {
  id: string;
  target: string;
  title: string;
  description: string;
  placement?: CoachMarkPlacement;
}

export const COACH_MARK_STEPS: CoachMarkStep[] = [
  {
    id: "filters",
    target: '[data-coach-mark="filters"]',
    title: "Filter instantly",
    description:
      "Open Filters to search by keyword, location, education level, quota, and more. Everything runs in your browser — no waiting on MagangHub.",
    placement: "bottom",
  },
  {
    id: "bookmark",
    target: '[data-coach-mark="bookmark"]',
    title: "Save listings",
    description: "Tap the bookmark icon on any listing to save it. Bookmarks stay in this browser — no account needed.",
    placement: "left",
  },
  {
    id: "bookmarks-nav",
    target: '[data-coach-mark="bookmarks-nav"]',
    title: "Find saved listings",
    description: "Open Bookmarks anytime to review positions you saved. Your list syncs only on this device.",
    placement: "bottom",
  },
];
