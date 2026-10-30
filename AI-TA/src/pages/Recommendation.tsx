import { useState } from "react";
import { Link } from "react-router-dom";
import { ObservationSummary } from "../components/ObservationSummary";
import { RecommendationCard } from "../components/RecommendationCard";
import { DecisionHistory } from "../components/DecisionHistory";
import {
  generateRecommendations,
  researchNote,
} from "../services/recommendationRules";
import {
  loadDecisions,
  matchingDecisions,
  saveDecision,
} from "../services/decisionStorage";
import { observationKey } from "../services/observationStorage";
import type { InstructionalAnalysis } from "../services/indicatorAnalysis";
export function Recommendation({
  learnerId,
  analysis,
}: {
  learnerId: string;
  analysis?: InstructionalAnalysis;
}) {
  const [state, setState] = useState(() => {
    try {
      return { history: loadDecisions(), error: "" };
    } catch {
      return {
        history: [],
        error:
          "Decision history could not be read. Existing storage will not be overwritten. New decisions can only be saved when browser storage is accessible and valid.",
      };
    }
  });
  if (!analysis || analysis.observation.learnerId !== learnerId)
    return (
      <section className="card">
        <h2>No valid saved observation</h2>
        <p>
          Save a Teacher Observation for this learner before viewing
          suggestions. No observation or learner data is invented.
        </p>
        <Link className="button" to={`/learners/${learnerId}/observation`}>
          Back to Teacher Observation
        </Link>
      </section>
    );
  const observation = analysis.observation;
  const result = generateRecommendations(analysis);
  const key = observationKey(observation);
  const previous = state.history.filter(
    (entry) => entry.learnerId === learnerId && entry.observationKey !== key,
  );
  return (
    <div className="profile-form">
      <ObservationSummary observation={observation} />
      <div className="note privacy-note">
        <h2>Explainable suggestions for teacher review</h2>
        <p>{researchNote}</p>
        <p>
          Recorded evidence, rule-generated suggestions, and saved teacher
          decisions are presented separately. No activity plan is created in
          V0.3.
        </p>
      </div>
      {state.error && <p role="alert">{state.error}</p>}
      <section className="card">
        <h2>Observed strengths to build upon</h2>
        {result.strengths.length ? (
          <ul>
            {result.strengths.map((entry) => (
              <li key={entry.indicatorId}>
                <strong>{entry.indicator}</strong> — 3 · {entry.ratingLabel}.
                Relative strength in this observed activity only.
                {entry.teacherNote && (
                  <p className="preserve-text">
                    Teacher note: {entry.teacherNote}
                  </p>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p>
            No indicators rated 3 were recorded. No strengths are inferred from
            missing data.
          </p>
        )}
      </section>
      <section aria-label="Suggested teaching strategies">
        <h2>Suggested teaching strategies</h2>
        <p>
          {result.suggestions.length} separate suggestion
          {result.suggestions.length === 1 ? "" : "s"} from the recorded
          indicators. Ratings 0 and missing ratings do not trigger suggestions;
          ratings 3 appear as strengths above. Other indicators without an
          illustrative strategy rule remain available in Indicator Analysis.
        </p>
        <div className="recommendation-list">
          {result.suggestions.map((suggestion) => (
            <RecommendationCard
              key={`${key}:${suggestion.id}`}
              suggestion={suggestion}
              observation={observation}
              history={matchingDecisions(
                state.history,
                observation,
                suggestion,
              )}
              onSave={(action, strategy, reason) => {
                const history = saveDecision(
                  observation,
                  suggestion,
                  action,
                  strategy,
                  reason,
                );
                setState({ history, error: "" });
              }}
            />
          ))}
        </div>
        {!result.suggestions.length && (
          <div className="card">
            <h3>No strategy rules triggered</h3>
            <p>
              No eligible recorded indicators have ratings of 1 or 2. No
              suggestion is inferred from 0 or missing evidence, and no extra
              strategy is forced for a rating of 3.
            </p>
          </div>
        )}
      </section>
      {previous.length > 0 && (
        <details className="card">
          <summary>
            Earlier observation decision history ({previous.length})
          </summary>
          <p>
            These decisions belong to different saved observation evidence for
            this learner. They are retained for review and do not apply to the
            current suggestions.
          </p>
          <DecisionHistory history={previous} />
        </details>
      )}
      <div className="note">
        Saved observations and decision revisions use this tab’s session
        storage, not permanent storage. Changing observation evidence starts a
        separate decision context. Decisions do not automatically create or
        apply an activity plan.
      </div>
      <div className="page-actions">
        <Link
          className="button secondary"
          to={`/learners/${learnerId}/analysis`}
        >
          ← Back to Indicator Analysis
        </Link>
        <Link
          className="button secondary"
          to={`/learners/${learnerId}/decision`}
        >
          Review teacher decisions →
        </Link>
      </div>
    </div>
  );
}
