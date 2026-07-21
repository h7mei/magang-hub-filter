import { Bookmark } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function BookmarkCoachDemo() {
  return (
    <div className="w-full space-y-4 px-4">
      <p className="text-xs text-muted-foreground">
        Example — click a map marker to see real positions
      </p>
      <div className="rounded-lg border border-dashed border-primary/30 bg-muted/30 p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="font-medium">Marketing Intern</p>
            <p className="text-sm text-muted-foreground">Jakarta Selatan</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="pointer-events-none shrink-0"
            data-coach-mark="bookmark"
            aria-hidden="true"
            tabIndex={-1}
          >
            <Bookmark className="size-4" />
          </Button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge variant="secondary">Quota 2</Badge>
          <Badge variant="outline">Sarjana</Badge>
        </div>
      </div>
    </div>
  );
}
