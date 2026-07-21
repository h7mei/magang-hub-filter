import { useLayoutEffect, useState, type CSSProperties } from "react";

import { Button } from "@/components/ui/button";
import { useCoachMarkTarget, useCoachMarks } from "@/hooks/use-coach-marks";
import type { CoachMarkPlacement } from "@/lib/coach-marks-steps";
import { cn } from "@/lib/utils";

const SPOTLIGHT_PADDING = 8;
const TOOLTIP_GAP = 12;
const VIEWPORT_MARGIN = 16;

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function measureTarget(element: HTMLElement): TargetRect {
  const rect = element.getBoundingClientRect();
  return {
    top: rect.top - SPOTLIGHT_PADDING,
    left: rect.left - SPOTLIGHT_PADDING,
    width: rect.width + SPOTLIGHT_PADDING * 2,
    height: rect.height + SPOTLIGHT_PADDING * 2,
  };
}

function getTooltipStyle(
  targetRect: TargetRect,
  placement: CoachMarkPlacement,
  tooltipSize: { width: number; height: number },
): CSSProperties {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  let top = 0;
  let left = 0;

  switch (placement) {
    case "top":
      top = targetRect.top - TOOLTIP_GAP - tooltipSize.height;
      left = targetRect.left + targetRect.width / 2 - tooltipSize.width / 2;
      break;
    case "bottom":
      top = targetRect.top + targetRect.height + TOOLTIP_GAP;
      left = targetRect.left + targetRect.width / 2 - tooltipSize.width / 2;
      break;
    case "left":
      top = targetRect.top + targetRect.height / 2 - tooltipSize.height / 2;
      left = targetRect.left - TOOLTIP_GAP - tooltipSize.width;
      break;
    case "right":
      top = targetRect.top + targetRect.height / 2 - tooltipSize.height / 2;
      left = targetRect.left + targetRect.width + TOOLTIP_GAP;
      break;
    default: {
      const unreachable: never = placement;
      throw new Error(`Unhandled coach mark placement: ${String(unreachable)}`);
    }
  }

  top = Math.max(
    VIEWPORT_MARGIN,
    Math.min(top, viewportHeight - tooltipSize.height - VIEWPORT_MARGIN),
  );
  left = Math.max(
    VIEWPORT_MARGIN,
    Math.min(left, viewportWidth - tooltipSize.width - VIEWPORT_MARGIN),
  );

  return { top, left };
}

export function CoachMarksOverlay() {
  const { active, step, stepIndex, totalSteps, dataReady, nextStep, previousStep, skipTour } =
    useCoachMarks();
  const target = useCoachMarkTarget(step, active);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [tooltipSize, setTooltipSize] = useState({ width: 320, height: 180 });

  useLayoutEffect(() => {
    if (!active || !target || !step) {
      setTargetRect(null);
      return;
    }

    const update = () => {
      setTargetRect(measureTarget(target));
    };

    target.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
    update();

    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);

    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [active, step, target]);

  if (!active || !step) {
    return null;
  }

  const isLastStep = stepIndex >= totalSteps - 1;
  const placement = step.placement ?? "bottom";
  const tooltipStyle =
    targetRect !== null
      ? getTooltipStyle(targetRect, placement, tooltipSize)
      : {
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        };

  return (
    <div className="fixed inset-0 z-[100]" aria-live="polite">
      {targetRect ? (
        <div
          className="pointer-events-none absolute rounded-lg ring-2 ring-primary ring-offset-2 ring-offset-transparent"
          style={{
            top: targetRect.top,
            left: targetRect.left,
            width: targetRect.width,
            height: targetRect.height,
            boxShadow: "0 0 0 9999px rgb(0 0 0 / 0.55)",
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-black/55" />
      )}

      <div
        ref={(node) => {
          if (!node) {
            return;
          }

          const nextSize = {
            width: node.offsetWidth,
            height: node.offsetHeight,
          };

          if (
            nextSize.width !== tooltipSize.width ||
            nextSize.height !== tooltipSize.height
          ) {
            setTooltipSize(nextSize);
          }
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="coach-mark-title"
        aria-describedby="coach-mark-description"
        className={cn(
          "absolute w-[min(20rem,calc(100vw-2rem))] rounded-lg border bg-popover p-4 text-popover-foreground shadow-lg",
          targetRect === null && "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
        )}
        style={targetRect !== null ? tooltipStyle : undefined}
      >
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Tip {stepIndex + 1} of {totalSteps}
        </p>
        <h2 id="coach-mark-title" className="mt-1 text-base font-semibold">
          {step.title}
        </h2>
        <p id="coach-mark-description" className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {step.description}
        </p>
        {!target ? (
          <p className="mt-2 text-xs text-muted-foreground">
            {!dataReady
              ? "Loading listings data before tips can continue..."
              : "Waiting for this part of the page to load..."}
          </p>
        ) : null}

        <div className="mt-4 flex items-center justify-between gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={skipTour}>
            Skip tour
          </Button>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={stepIndex === 0}
              onClick={previousStep}
            >
              Back
            </Button>
            <Button type="button" size="sm" onClick={nextStep} disabled={!target}>
              {isLastStep ? "Got it" : "Next"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
