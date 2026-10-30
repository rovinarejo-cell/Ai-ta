import type { Decision, TeacherObservationData } from "../types";
import {
  observationKey,
  isObject,
  validObservation,
} from "./observationStorage";
import { analyzeObservation } from "./indicatorAnalysis";
import { generateRecommendations } from "./recommendationRules";
import type { SuggestedRecommendation } from "./recommendationRules";
export const decisionStorageKey = "ai-ta.recommendation-decisions.v1";
export interface RecommendationDecision {
  id: string;
  learnerId: string;
  observationKey: string;
  recommendationId: string;
  savedAt: string;
  action: Decision;
  strategy: string;
  reason: string;
  observation: TeacherObservationData;
  recommendation: SuggestedRecommendation;
}
function validDecision(value: unknown): value is RecommendationDecision {
  if (
    !isObject(value) ||
    typeof value.learnerId !== "string" ||
    !validObservation(value.observation, value.learnerId)
  )
    return false;
  if (
    ![
      "id",
      "observationKey",
      "recommendationId",
      "savedAt",
      "strategy",
      "reason",
    ].every((key) => typeof value[key] === "string")
  )
    return false;
  if (
    !["accept", "modify", "reject"].includes(value.action as string) ||
    !isObject(value.recommendation)
  )
    return false;
  const expected = generateRecommendations(
    analyzeObservation(value.observation),
  ).suggestions.find((item) => item.id === value.recommendationId);
  return (
    Boolean(expected) &&
    JSON.stringify(expected) === JSON.stringify(value.recommendation) &&
    value.observationKey === observationKey(value.observation) &&
    (value.action === "reject" || Boolean((value.strategy as string).trim()))
  );
}
export function loadDecisions(): RecommendationDecision[] {
  const raw: unknown = JSON.parse(
    sessionStorage.getItem(decisionStorageKey) ?? "[]",
  );
  if (!Array.isArray(raw) || !raw.every(validDecision))
    throw new Error("Unreadable decision history");
  return raw;
}
export function saveDecision(
  observation: TeacherObservationData,
  recommendation: SuggestedRecommendation,
  action: Decision,
  strategy: string,
  reason: string,
): RecommendationDecision[] {
  const selected =
    action === "accept"
      ? recommendation.strategy
      : action === "modify"
        ? strategy.trim()
        : "";
  if (action === "modify" && !selected)
    throw new Error("An adapted strategy is required.");
  const entry: RecommendationDecision = {
    id: crypto.randomUUID(),
    learnerId: observation.learnerId,
    observationKey: observationKey(observation),
    recommendationId: recommendation.id,
    savedAt: new Date().toISOString(),
    action,
    strategy: selected,
    reason: action === "reject" ? reason.trim() : "",
    observation,
    recommendation,
  };
  if (!validDecision(entry)) throw new Error("Invalid decision evidence");
  const next = [...loadDecisions(), entry];
  sessionStorage.setItem(decisionStorageKey, JSON.stringify(next));
  return next;
}
export function matchingDecisions(
  history: RecommendationDecision[],
  observation: TeacherObservationData,
  recommendation: SuggestedRecommendation,
): RecommendationDecision[] {
  return history.filter(
    (entry) =>
      entry.learnerId === observation.learnerId &&
      entry.observationKey === observationKey(observation) &&
      entry.recommendationId === recommendation.id,
  );
}
