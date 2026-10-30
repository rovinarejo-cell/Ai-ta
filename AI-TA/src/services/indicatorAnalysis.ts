import {
  indicatorGroups,
  observationScale,
} from "../data/observationIndicators";
import type { IndicatorId } from "../data/observationIndicators";
import type { ObservationRating, TeacherObservationData } from "../types";
export const analysisRules = {
  0: {
    rule: "R0: Rating 0 → not observed; no interpretation.",
    summary: "Not observed; no interpretation is made.",
  },
  1: {
    rule: "R1: Rating 1 → may require substantial instructional support.",
    summary:
      "May require substantial instructional support in this observed activity.",
  },
  2: {
    rule: "R2: Rating 2 → may benefit from occasional support.",
    summary: "May benefit from occasional support in this observed activity.",
  },
  3: {
    rule: "R3: Rating 3 → relative strength in this observed activity.",
    summary:
      "Relative strength in this observed activity; not a permanent learner trait.",
  },
} as const;
export interface AnalysisEntry {
  indicatorId: IndicatorId;
  indicator: string;
  rating: ObservationRating | null;
  ratingLabel: string;
  teacherNote: string;
  rule: string;
  summary: string;
}
export interface InstructionalAnalysis {
  observation: TeacherObservationData;
  groups: { title: string; entries: AnalysisEntry[] }[];
}
export function analyzeObservation(
  observation: TeacherObservationData,
): InstructionalAnalysis {
  return {
    observation,
    groups: indicatorGroups.map((group) => ({
      title: group.title,
      entries: group.indicators.map((indicator) => {
        const entry = observation.ratings[indicator.id];
        const rating = entry?.rating ?? null;
        return {
          indicatorId: indicator.id,
          indicator: indicator.label,
          rating,
          ratingLabel:
            rating === null
              ? "Missing rating — not recorded"
              : observationScale[rating].label,
          teacherNote: entry?.note ?? "",
          ...(rating === null
            ? {
                rule: "No rating → no rule applied.",
                summary: "No interpretation is made.",
              }
            : analysisRules[rating]),
        };
      }),
    })),
  };
}
