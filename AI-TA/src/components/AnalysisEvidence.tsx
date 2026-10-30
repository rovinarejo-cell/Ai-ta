import type { InstructionalAnalysis } from "../services/indicatorAnalysis";
export function AnalysisEvidence({
  analysis,
}: {
  analysis: InstructionalAnalysis;
}) {
  return (
    <div className="analysis-evidence">
      {analysis.groups.map((group) => (
        <section className="card" key={group.title}>
          <h2>{group.title}</h2>
          {group.entries.map((entry) => (
            <article className="analysis-entry" key={entry.indicatorId}>
              <h3>{entry.indicator}</h3>
              <span className="pill subtle">
                {entry.rating === null
                  ? entry.ratingLabel
                  : `${entry.rating} — ${entry.ratingLabel}`}
              </span>
              <p>{entry.summary}</p>
              <p className="analysis-rule">{entry.rule}</p>
              {entry.teacherNote && (
                <p className="preserve-text">
                  <strong>Teacher note:</strong> {entry.teacherNote}
                </p>
              )}
            </article>
          ))}
        </section>
      ))}
    </div>
  );
}
