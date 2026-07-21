import { Loader2 } from "lucide-react";

import { useCoachMarks } from "@/hooks/use-coach-marks";

export function CoachMarksDataAwaiting() {
  const { awaitingDataLoad } = useCoachMarks();

  if (!awaitingDataLoad) {
    return null;
  }

  return (
    <div
      className="fixed bottom-4 left-1/2 z-50 flex max-w-[min(24rem,calc(100vw-2rem))] -translate-x-1/2 items-center gap-2 rounded-lg border bg-background/95 px-4 py-3 text-sm text-muted-foreground shadow-lg backdrop-blur"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden="true" />
      <p>Still loading listings data — quick tips will show when ready.</p>
    </div>
  );
}
