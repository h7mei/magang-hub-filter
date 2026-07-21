const COACH_MARKS_STORAGE_KEY = "maganghub-coach-marks-completed";

export function hasCompletedCoachMarks(): boolean {
  if (typeof window === "undefined") {
    return true;
  }

  try {
    return window.localStorage.getItem(COACH_MARKS_STORAGE_KEY) === "true";
  } catch {
    return true;
  }
}

export function markCoachMarksCompleted(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(COACH_MARKS_STORAGE_KEY, "true");
  } catch {
    // Ignore storage failures.
  }
}

export function resetCoachMarksCompleted(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(COACH_MARKS_STORAGE_KEY);
  } catch {
    // Ignore storage failures.
  }
}

export function getCoachMarksStorageKey(): string {
  return COACH_MARKS_STORAGE_KEY;
}
