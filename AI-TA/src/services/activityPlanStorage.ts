import type { ActivityPlan } from "./activityPlans";
import { approvedDecisions, supportTypes } from "./activityPlans";
import {
  isObject,
  loadObservations,
  observationKey,
} from "./observationStorage";
import { loadDecisions, validDecision } from "./decisionStorage";
export const activityPlanStorageKey = "ai-ta.activity-plans.v1";
const textFields = [
  "id",
  "learnerId",
  "sourceObservationKey",
  "subject",
  "objective",
  "targetSkill",
  "title",
  "description",
  "materials",
  "assessmentObservation",
  "successCriteria",
  "assessmentNotes",
  "positiveFeedback",
  "constructiveFeedback",
  "repeatOrModify",
] as const;
function validPlan(value: unknown): value is ActivityPlan {
  if (
    !isObject(value) ||
    !textFields.every((key) => typeof value[key] === "string")
  )
    return false;
  if (
    !validDecision(value.sourceDecision) ||
    !["accept", "modify"].includes(value.sourceDecision.action)
  )
    return false;
  const decision = value.sourceDecision;
  if (
    value.id !== `plan:${decision.id}` ||
    value.learnerId !== decision.learnerId ||
    value.sourceObservationKey !== decision.observationKey ||
    value.sourceObservationId !== (decision.observation.observationId ?? null)
  )
    return false;
  if (
    !isObject(value.profileContext) ||
    !["interests", "communicationPreferences"].every(
      (key) =>
        Array.isArray((value.profileContext as Record<string, unknown>)[key]) &&
        (
          (value.profileContext as Record<string, unknown>)[key] as unknown[]
        ).every((item) => typeof item === "string"),
    )
  )
    return false;
  if (
    typeof value.durationMinutes !== "number" ||
    !Number.isInteger(value.durationMinutes) ||
    value.durationMinutes < 1 ||
    value.durationMinutes > 480
  )
    return false;
  if (
    !Array.isArray(value.steps) ||
    !value.steps.length ||
    !value.steps.every(
      (step) =>
        isObject(step) &&
        ["id", "instruction", "teacherGuidance", "learnerParticipation"].every(
          (key) =>
            typeof step[key] === "string" && (step[key] as string).trim(),
        ),
    )
  )
    return false;
  if (new Set(value.steps.map((step) => step.id)).size !== value.steps.length)
    return false;
  if (
    !Array.isArray(value.supports) ||
    value.supports.length !== supportTypes.length ||
    !supportTypes.every(
      ([type]) =>
        (value.supports as unknown[]).filter(
          (item) =>
            isObject(item) &&
            item.type === type &&
            typeof item.enabled === "boolean" &&
            typeof item.description === "string",
        ).length === 1,
    )
  )
    return false;
  if (
    !["draft", "approved"].includes(value.status as string) ||
    (value.savedAt !== null && typeof value.savedAt !== "string")
  )
    return false;
  return value.status === "approved"
    ? typeof value.approvedAt === "string" && Boolean(value.approvedAt)
    : value.approvedAt === null;
}
export function loadActivityPlans(): ActivityPlan[] {
  const raw: unknown = JSON.parse(
    sessionStorage.getItem(activityPlanStorageKey) ?? "[]",
  );
  if (!Array.isArray(raw) || !raw.every(validPlan))
    throw new Error("Unreadable activity plan storage");
  return raw;
}
/** Recheck live source decisions at the write boundary to block stale/rejected approvals. */
export function saveActivityPlan(
  plan: ActivityPlan,
  approve = false,
): ActivityPlan {
  if (!validPlan(plan)) throw new Error("Invalid activity plan");
  const required = [
    "subject",
    "objective",
    "targetSkill",
    "title",
    "description",
    "materials",
    "assessmentObservation",
    "successCriteria",
    "positiveFeedback",
    "constructiveFeedback",
    "repeatOrModify",
  ] as const;
  if (
    !required.every((key) => plan[key].trim()) ||
    plan.supports.some(
      (support) => support.enabled && !support.description.trim(),
    )
  )
    throw new Error("Complete the required plan fields.");
  const observation = loadObservations()[plan.learnerId];
  if (!observation || observationKey(observation) !== plan.sourceObservationKey)
    throw new Error("Observation evidence has changed.");
  const current = approvedDecisions(observation, loadDecisions()).find(
    (decision) => decision.id === plan.sourceDecision.id,
  );
  if (
    !current ||
    JSON.stringify(current) !== JSON.stringify(plan.sourceDecision)
  )
    throw new Error("The source decision is no longer approved.");
  const history = loadActivityPlans();
  const saved: ActivityPlan = {
    ...plan,
    status: approve ? "approved" : "draft",
    approvedAt: approve ? new Date().toISOString() : null,
    savedAt: new Date().toISOString(),
  };
  sessionStorage.setItem(
    activityPlanStorageKey,
    JSON.stringify([...history.filter((item) => item.id !== plan.id), saved]),
  );
  return saved;
}
