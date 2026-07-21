import { Check, ChevronRight, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const LARGE_OPTION_THRESHOLD = 100;

interface MultiSelectFilterProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}

export function MultiSelectFilter({
  label,
  options,
  selected,
  onChange,
  placeholder = "Choose options...",
}: MultiSelectFilterProps) {
  const [open, setOpen] = useState(false);
  const [contentReady, setContentReady] = useState(false);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<string[]>(selected);

  const isLargeList = options.length > LARGE_OPTION_THRESHOLD;

  useEffect(() => {
    if (!open) {
      setContentReady(false);
      return;
    }

    setDraft(selected);
    setQuery("");

    if (!isLargeList) {
      setContentReady(true);
      return;
    }

    let cancelled = false;
    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!cancelled) {
          setContentReady(true);
        }
      });
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [open, selected, isLargeList]);

  const filteredOptions = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return options;
    }
    return options.filter((option) => option.toLowerCase().includes(needle));
  }, [options, query]);

  const toggleValue = (value: string) => {
    setDraft((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  };

  const applyDraft = () => {
    onChange(draft);
    setOpen(false);
  };

  const summary =
    selected.length === 0
      ? placeholder
      : `${selected.length} selected of ${options.length.toLocaleString("id-ID")}`;

  return (
    <div className="min-w-0 space-y-2">
      <Label>{label}</Label>
      <Button
        type="button"
        variant="outline"
        className="h-auto min-h-10 w-full justify-between px-3 py-2 font-normal"
        onClick={() => setOpen(true)}
      >
        <span className="truncate text-left">{summary}</span>
        <ChevronRight className="ml-2 size-4 shrink-0 opacity-50" />
      </Button>

      {selected.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {selected.slice(0, 3).map((value) => (
            <Badge key={value} variant="secondary" className="max-w-full truncate">
              {value}
            </Badge>
          ))}
          {selected.length > 3 ? (
            <Badge variant="outline">+{selected.length - 3} more</Badge>
          ) : null}
        </div>
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton
          className="!flex h-[85vh] max-h-[85vh] w-[calc(100vw-2rem)] max-w-4xl flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl"
        >
          <DialogHeader className="shrink-0 space-y-1 border-b px-6 py-4 text-left">
            <DialogTitle>{label}</DialogTitle>
            <DialogDescription>
              {options.length.toLocaleString("id-ID")} options available
              {draft.length > 0
                ? ` • ${draft.length.toLocaleString("id-ID")} selected`
                : ""}
              {isLargeList ? " • use search to narrow down" : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="shrink-0 space-y-3 border-b px-6 py-4">
            <Input
              autoFocus={contentReady}
              disabled={!contentReady}
              placeholder={
                contentReady
                  ? isLargeList
                    ? `Search among ${options.length.toLocaleString("id-ID")} ${label.toLowerCase()}...`
                    : `Search ${label.toLowerCase()}...`
                  : `Preparing ${options.length.toLocaleString("id-ID")} ${label.toLowerCase()} options...`
              }
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={!contentReady || filteredOptions.length === 0}
                onClick={() => {
                  setDraft((current) => {
                    const next = new Set(current);
                    for (const option of filteredOptions) {
                      next.add(option);
                    }
                    return Array.from(next);
                  });
                }}
              >
                Select visible ({filteredOptions.length.toLocaleString("id-ID")})
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={!contentReady}
                onClick={() => setDraft([])}
              >
                Clear all
              </Button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-2">
            {!contentReady ? (
              <div className="flex h-full min-h-[240px] flex-col items-center justify-center gap-3 py-16">
                <Loader2 className="size-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Loading {options.length.toLocaleString("id-ID")} options...
                </p>
              </div>
            ) : filteredOptions.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                No options found.
              </p>
            ) : (
              <div className="grid gap-1 pb-4 sm:grid-cols-2">
                {filteredOptions.map((option) => {
                  const checked = draft.includes(option);
                  return (
                    <div
                      key={option}
                      role="button"
                      tabIndex={0}
                      aria-pressed={checked}
                      className={cn(
                        "flex w-full cursor-pointer items-start gap-3 rounded-md border px-3 py-3 text-left text-sm transition-colors hover:bg-accent",
                        checked && "border-primary/30 bg-accent/60",
                      )}
                      onClick={() => toggleValue(option)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          toggleValue(option);
                        }
                      }}
                    >
                      <Checkbox
                        checked={checked}
                        tabIndex={-1}
                        aria-hidden
                        className="pointer-events-none mt-0.5"
                      />
                      <span className="min-w-0 flex-1 wrap-break-word">{option}</span>
                      {checked ? <Check className="mt-0.5 size-4 shrink-0" /> : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <DialogFooter className="shrink-0 border-t px-6 py-4 sm:justify-between">
            <p className="text-sm text-muted-foreground">
              {contentReady ? (
                <>
                  Showing {filteredOptions.length.toLocaleString("id-ID")} of{" "}
                  {options.length.toLocaleString("id-ID")} options
                </>
              ) : (
                <>Preparing options...</>
              )}
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="button" disabled={!contentReady} onClick={applyDraft}>
                Apply
                {draft.length > 0 ? ` (${draft.length.toLocaleString("id-ID")})` : ""}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
