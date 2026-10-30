import { indicatorGroups } from "../data/observationIndicators";
import type { TeacherObservationData } from "../types";
export const observationStorageKey = "ai-ta.observations.v1";
export const isObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);
const strings = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");
export function validObservation(
  value: unknown,
  id: string,
): value is TeacherObservationData {
  if (
    !isObject(value) ||
    value.learnerId !== id ||
    !isObject(value.context) ||
    !isObject(value.ratings)
  )
    return false;
  if (
    value.observationId !== undefined &&
    typeof value.observationId !== "string"
  )
    return false;
  if (
    !["name", "learnerCode", "grade", "subject"].every(
      (key) =>
        typeof (value.context as Record<string, unknown>)[key] === "string",
    )
  )
    return false;
  if (
    !["date", "teacher", "activity", "additionalObservation"].every(
      (key) => typeof value[key] === "string",
    )
  )
    return false;
  if (
    ![value.date, value.teacher, value.activity].every(
      (item) => typeof item === "string" && item.trim(),
    )
  )
    return false;
  const date = new Date(`${value.date}T00:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value.date as string) ||
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value.date
  )
    return false;
  if (!strings(value.observedStrengths) || !strings(value.observedBarriers))
    return false;
  return indicatorGroups.every((group) =>
    group.indicators.every((indicator) => {
      const entry = (value.ratings as Record<string, unknown>)[indicator.id];
      return (
        entry === undefined ||
        (isObject(entry) &&
          (entry.rating === null ||
            [0, 1, 2, 3].includes(entry.rating as number)) &&
          typeof entry.note === "string")
      );
    }),
  );
}
export function loadObservations(): Record<string, TeacherObservationData> {
  try {
    const raw: unknown = JSON.parse(
      sessionStorage.getItem(observationStorageKey) ?? "{}",
    );
    return isObject(raw)
      ? (Object.fromEntries(
          Object.entries(raw).filter(([id, value]) =>
            validObservation(value, id),
          ),
        ) as Record<string, TeacherObservationData>)
      : {};
  } catch {
    return {};
  }
}
export function storeObservation(observation: TeacherObservationData): void {
  if (!validObservation(observation, observation.learnerId))
    throw new Error("Invalid observation");
  sessionStorage.setItem(
    observationStorageKey,
    JSON.stringify({
      ...loadObservations(),
      [observation.learnerId]: observation,
    }),
  );
}
/** Stable snapshot identity also supports records created before observationId existed. */
export function observationKey(observation: TeacherObservationData): string {
  // Include source content even for records with IDs: changed evidence never reuses a decision.
  return JSON.stringify([
    observation.observationId ?? "legacy",
    observation.learnerId,
    observation.context.name,
    observation.context.learnerCode,
    observation.context.grade,
    observation.context.subject,
    observation.date,
    observation.teacher,
    observation.activity,
    observation.additionalObservation,
    observation.observedStrengths,
    observation.observedBarriers,
    indicatorGroups.flatMap((group) =>
      group.indicators.map(({ id }) => [
        id,
        observation.ratings[id]?.rating ?? null,
        observation.ratings[id]?.note ?? "",
      ]),
    ),
  ]);
}
