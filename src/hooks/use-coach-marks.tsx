import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { useListingsData } from "@/hooks/use-listings-data";
import { COACH_MARK_STEPS, type CoachMarkStep } from "@/lib/coach-marks-steps";
import {
  hasCompletedCoachMarks,
  markCoachMarksCompleted,
  resetCoachMarksCompleted,
} from "@/lib/coach-marks-storage";

interface CoachMarksContextValue {
  active: boolean;
  stepIndex: number;
  step: CoachMarkStep | null;
  totalSteps: number;
  dataReady: boolean;
  awaitingDataLoad: boolean;
  startTour: () => void;
  skipTour: () => void;
  nextStep: () => void;
  previousStep: () => void;
  resetTour: () => void;
}

const CoachMarksContext = createContext<CoachMarksContextValue | null>(null);

const TARGET_WAIT_MS = 8000;
const TARGET_POLL_MS = 200;
const AUTO_START_DELAY_MS = 900;
const DATA_AWAITING_DELAY_MS = 2500;

function findStepTarget(selector: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(selector);
}

export function CoachMarksProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { loading: dataLoading, dataset } = useListingsData();
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [dataLoadingSlow, setDataLoadingSlow] = useState(false);
  const dataReady = !dataLoading && dataset !== null;
  const awaitingDataLoad =
    !dataReady && dataLoadingSlow && !hasCompletedCoachMarks();

  const step = active ? (COACH_MARK_STEPS[stepIndex] ?? null) : null;
  const totalSteps = COACH_MARK_STEPS.length;

  const finishTour = useCallback(() => {
    markCoachMarksCompleted();
    setActive(false);
    setStepIndex(0);
  }, []);

  const startTour = useCallback(() => {
    if (location.pathname !== "/") {
      navigate("/");
    }
    setStepIndex(0);
    setActive(true);
  }, [location.pathname, navigate]);

  const skipTour = useCallback(() => {
    finishTour();
  }, [finishTour]);

  const nextStep = useCallback(() => {
    if (stepIndex >= COACH_MARK_STEPS.length - 1) {
      finishTour();
      return;
    }

    setStepIndex((current) => current + 1);
  }, [finishTour, stepIndex]);

  const previousStep = useCallback(() => {
    setStepIndex((current) => Math.max(0, current - 1));
  }, []);

  const resetTour = useCallback(() => {
    resetCoachMarksCompleted();
    startTour();
  }, [startTour]);

  const navigateRef = useRef(navigate);
  const locationRef = useRef(location);
  navigateRef.current = navigate;
  locationRef.current = location;

  useEffect(() => {
    if (dataReady) {
      setDataLoadingSlow(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setDataLoadingSlow(true);
    }, DATA_AWAITING_DELAY_MS);

    return () => {
      window.clearTimeout(timer);
      setDataLoadingSlow(false);
    };
  }, [dataReady]);

  useEffect(() => {
    if (hasCompletedCoachMarks() || !dataReady) {
      return;
    }

    const timer = window.setTimeout(() => {
      if (locationRef.current.pathname !== "/") {
        navigateRef.current("/");
      }
      setStepIndex(0);
      setActive(true);
    }, AUTO_START_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [dataReady]);

  const value = useMemo(
    () => ({
      active,
      stepIndex,
      step,
      totalSteps,
      dataReady,
      awaitingDataLoad,
      startTour,
      skipTour,
      nextStep,
      previousStep,
      resetTour,
    }),
    [
      active,
      awaitingDataLoad,
      dataReady,
      nextStep,
      previousStep,
      resetTour,
      skipTour,
      startTour,
      step,
      stepIndex,
      totalSteps,
    ],
  );

  return <CoachMarksContext.Provider value={value}>{children}</CoachMarksContext.Provider>;
}

export function useCoachMarks() {
  const context = useContext(CoachMarksContext);
  if (!context) {
    throw new Error("useCoachMarks must be used within CoachMarksProvider");
  }
  return context;
}

export function useCoachMarkTarget(step: CoachMarkStep | null, active: boolean) {
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!active || !step) {
      setTarget(null);
      return;
    }

    let cancelled = false;
    const startedAt = Date.now();

    const resolveTarget = () => {
      const element = findStepTarget(step.target);
      if (element) {
        setTarget(element);
        return true;
      }
      return false;
    };

    if (resolveTarget()) {
      return;
    }

    const timer = window.setInterval(() => {
      if (cancelled) {
        return;
      }

      if (resolveTarget()) {
        window.clearInterval(timer);
        return;
      }

      if (Date.now() - startedAt >= TARGET_WAIT_MS) {
        window.clearInterval(timer);
        setTarget(null);
      }
    }, TARGET_POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [active, step]);

  return target;
}
