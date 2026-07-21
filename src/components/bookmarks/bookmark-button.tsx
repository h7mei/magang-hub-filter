import { Bookmark, BookmarkCheck, Loader2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useBookmarks } from "@/hooks/use-bookmarks";
import { cn } from "@/lib/utils";
import type { ListingRecord } from "@/types";

interface BookmarkButtonProps {
  listingId: string;
  listing?: ListingRecord;
  variant?: "ghost" | "outline" | "secondary";
  size?: "default" | "sm" | "icon" | "icon-sm";
  showLabel?: boolean;
  className?: string;
  onToggle?: (bookmarked: boolean) => void;
}

export function BookmarkButton({
  listingId,
  listing,
  variant = "ghost",
  size = "icon-sm",
  showLabel = false,
  className,
  onToggle,
}: BookmarkButtonProps) {
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const [pending, setPending] = useState(false);
  const saved = isBookmarked(listingId);

  const handleClick = async () => {
    setPending(true);
    try {
      await toggleBookmark(listingId, listing);
      onToggle?.(!saved);
    } finally {
      setPending(false);
    }
  };

  const Icon = saved ? BookmarkCheck : Bookmark;

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={cn(saved && "text-primary", className)}
      onClick={() => void handleClick()}
      disabled={pending}
      aria-label={saved ? "Remove bookmark" : "Add bookmark"}
      title={saved ? "Remove bookmark" : "Add bookmark"}
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Icon className={cn("size-4", saved && "fill-current")} />
      )}
      {showLabel ? <span>{saved ? "Saved" : "Save"}</span> : null}
    </Button>
  );
}
