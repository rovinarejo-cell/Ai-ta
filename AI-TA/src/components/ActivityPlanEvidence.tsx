import type { ActivityPlan } from "../services/activityPlans";
export function ActivityPlanEvidence({ plan }: { plan: ActivityPlan }) {
  const source = plan.sourceDecision;
  return (
    <details className="plan-evidence">
      <summary>Why was this activity created? Source evidence</summary>
      <dl className="observation-context">
        <div>
          <dt>Learner ID</dt>
          <dd>
            {plan.learnerId} · {source.observation.context.name}
          </dd>
        </div>
        <div>
          <dt>Source observation ID</dt>
          <dd>
            {plan.sourceObservationId ??
              "Legacy record: no observation ID; exact snapshot key retained below."}
          </dd>
        </div>
        <div>
          <dt>Observation date</dt>
          <dd>{source.observation.date}</dd>
        </div>
        <div>
          <dt>Teacher decision</dt>
          <dd>
            {source.action.toUpperCase()} · {source.savedAt}
          </dd>
        </div>
        <div>
          <dt>Source decision ID</dt>
          <dd>{source.id}</dd>
        </div>
        <div>
          <dt>Recommendation rule/version</dt>
          <dd>
            {source.recommendation.ruleId} · {source.recommendation.version}
          </dd>
        </div>
      </dl>
      <p>
        <strong>Source activity:</strong> {source.observation.activity}
      </p>
      <p className="preserve-text">
        <strong>Original recommendation:</strong>{" "}
        {source.recommendation.strategy}
      </p>
      <p className="preserve-text">
        <strong>Teacher’s final accepted/modified strategy:</strong>{" "}
        {source.strategy}
      </p>
      <p>
        <strong>Exact rule:</strong> {source.recommendation.condition}
      </p>
      <ul>
        {source.recommendation.evidence.map((entry) => (
          <li key={entry.indicatorId}>
            <strong>{entry.indicator}</strong> — {entry.rating} ·{" "}
            {entry.ratingLabel}
            {entry.teacherNote && (
              <p className="preserve-text">Teacher note: {entry.teacherNote}</p>
            )}
          </li>
        ))}
      </ul>
      <p className="preserve-text">
        <strong>General observation:</strong>{" "}
        {source.observation.additionalObservation || "None recorded."}
      </p>
      <details>
        <summary>Exact source snapshot key</summary>
        <p className="snapshot-key">{plan.sourceObservationKey}</p>
      </details>
    </details>
  );
}
