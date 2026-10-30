import type { RecommendationDecision } from "../services/decisionStorage";
export function DecisionHistory({
  history,
}: {
  history: RecommendationDecision[];
}) {
  return (
    <ol className="decision-history">
      {[...history].reverse().map((entry) => (
        <li key={entry.id}>
          <strong>{entry.action.toUpperCase()}</strong> ·{" "}
          <time dateTime={entry.savedAt}>
            {new Date(entry.savedAt).toLocaleString()}
          </time>
          <p>
            {entry.recommendation.title} · {entry.observation.context.name} ·{" "}
            {entry.observation.date}
          </p>
          <p>
            <strong>Activity:</strong> {entry.observation.activity}
          </p>
          {entry.strategy && (
            <p className="preserve-text">
              <strong>Teacher-selected strategy:</strong> {entry.strategy}
            </p>
          )}
          {entry.reason && (
            <p className="preserve-text">
              <strong>Reason:</strong> {entry.reason}
            </p>
          )}
          <p>{entry.recommendation.condition}</p>
          <ul>
            {entry.recommendation.evidence.map((evidence) => (
              <li key={evidence.indicatorId}>
                {evidence.indicator}: {evidence.rating} — {evidence.ratingLabel}
                {evidence.teacherNote && (
                  <p className="preserve-text">
                    Teacher note: {evidence.teacherNote}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}
