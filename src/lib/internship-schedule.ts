const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
] as const;

export const INTERNSHIP_BATCH = {
  number: 1,
  year: 2026,
  label: "BATCH 1 · 2026",
} as const;

const SCHEDULE_PHASES = [
  {
    title: "Pendaftaran Perusahaan dan K/L",
    start: "2026-06-29",
    end: "2026-07-15",
  },
  {
    title: "Pendaftaran Peserta",
    start: "2026-07-16",
    end: "2026-07-28",
  },
  {
    title: "Rekrutmen dan Pengusulan Peserta",
    start: "2026-07-29",
    end: "2026-08-05",
  },
  {
    title: "Seleksi Nasional dan Pengumuman Peserta",
    start: "2026-08-07",
    end: "2026-08-07",
  },
  {
    title: "1st Day Magang",
    start: "2026-08-10",
    end: "2026-08-10",
  },
] as const;

export type SchedulePhaseStatus = "upcoming" | "ongoing" | "completed";

export type CurrentSchedulePhase = {
  title: string;
  status: SchedulePhaseStatus;
  statusLabel: string;
  dateLabel: string;
};

function parseLocalDate(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatScheduleDate(date: Date): string {
  return `${date.getDate()} ${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

function formatDateRange(start: Date, end: Date): string {
  if (start.getTime() === end.getTime()) {
    return formatScheduleDate(start);
  }

  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();

  if (sameMonth) {
    return `${start.getDate()} - ${end.getDate()} ${MONTH_NAMES[start.getMonth()]} ${start.getFullYear()}`;
  }

  return `${formatScheduleDate(start)} - ${formatScheduleDate(end)}`;
}

function statusLabelFor(status: SchedulePhaseStatus): string {
  switch (status) {
    case "ongoing":
      return "Berlangsung";
    case "upcoming":
      return "Akan datang";
    case "completed":
      return "Selesai";
    default: {
      const exhaustiveCheck: never = status;
      return exhaustiveCheck;
    }
  }
}

function toCurrentPhase(phase: (typeof SCHEDULE_PHASES)[number], status: SchedulePhaseStatus): CurrentSchedulePhase {
  const start = parseLocalDate(phase.start);
  const end = parseLocalDate(phase.end);

  return {
    title: phase.title,
    status,
    statusLabel: statusLabelFor(status),
    dateLabel: formatDateRange(start, end),
  };
}

export function getCurrentSchedulePhase(referenceDate: Date = new Date()): CurrentSchedulePhase {
  const today = startOfDay(referenceDate);

  for (const phase of SCHEDULE_PHASES) {
    const start = parseLocalDate(phase.start);
    const end = parseLocalDate(phase.end);

    if (today >= start && today <= end) {
      return toCurrentPhase(phase, "ongoing");
    }
  }

  for (const phase of SCHEDULE_PHASES) {
    const start = parseLocalDate(phase.start);

    if (today < start) {
      return toCurrentPhase(phase, "upcoming");
    }
  }

  const lastPhase = SCHEDULE_PHASES[SCHEDULE_PHASES.length - 1];
  return toCurrentPhase(lastPhase, "completed");
}

export function scheduleStatusBadgeClassName(status: SchedulePhaseStatus): string {
  switch (status) {
    case "ongoing":
      return "border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300";
    case "completed":
      return "border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300";
    case "upcoming":
      return "border-sky-200 bg-sky-100 text-sky-800 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-300";
    default: {
      const exhaustiveCheck: never = status;
      return exhaustiveCheck;
    }
  }
}
