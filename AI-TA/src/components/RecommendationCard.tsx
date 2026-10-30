import { useState } from "react";
import type { FormEvent } from "react";
import type { Decision, TeacherObservationData } from "../types";
import type { SuggestedRecommendation } from "../services/recommendationRules";
import type { RecommendationDecision } from "../services/decisionStorage";
import { DecisionHistory } from "./DecisionHistory";
export function RecommendationCard({
  suggestion,
  observation,
  history,
  onSave,
}: {
  suggestion: SuggestedRecommendation;
  observation: TeacherObservationData;
  history: RecommendationDecision[];
  onSave: (action: Decision, strategy: string, reason: string) => void;
}) {
  const latest = history.at(-1);
  const [editing, setEditing] = useState(!latest);
  const [action, setAction] = useState<Decision>(latest?.action ?? "accept");
  const [strategy, setStrategy] = useState(
    latest?.strategy || suggestion.strategy,
  );
  const [reason, setReason] = useState(latest?.reason ?? "");
  const [message, setMessage] = useState("");
  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (action === "modify" && !strategy.trim()) {
      setMessage("Enter an adapted strategy before saving.");
      return;
    }
    try {
      onSave(action, strategy, reason);
      setEditing(false);
      setMessage("Teacher decision saved in browser session storage.");
    } catch {
      setMessage(
        "Decision could not be saved. Check browser session storage permissions or available space. Your edits remain here; no decision was applied.",
      );
    }
  };
  const id = suggestion.ruleId;
  return (
    <article
      className="card recommendation-card"
      aria-labelledby={`suggestion-${id}`}
    >
      <span className="pill subtle">Generated suggestion · Rule {id}</span>
      <h2 id={`suggestion-${id}`}>{suggestion.title}</h2>
      <p className="suggested-strategy">{suggestion.strategy}</p>
      <h3>Recorded evidence</h3>
      <p>
        {observation.context.name} · {observation.date} · {observation.activity}
      </p>
      <ul className="recommendation-evidence">
        {suggestion.evidence.map((entry) => (
          <li key={entry.indicatorId}>
            <strong>{entry.indicator}</strong> — {entry.rating} ·{" "}
            {entry.ratingLabel}
            <p className="preserve-text">
              Teacher note:{" "}
              {entry.teacherNote.trim() ||
                "No indicator-specific note recorded."}
            </p>
          </li>
        ))}
      </ul>
      <h3>Exact trigger</h3>
      <p className="analysis-rule">{suggestion.condition}</p>
      <h3>Why it may be relevant</h3>
      <p>{suggestion.explanation}</p>
      <p className="profile-help">
        Suggestion for teacher consideration only. No strategy is applied
        automatically and improvement is not guaranteed.
      </p>
      <section
        className="teacher-decision"
        aria-label={`Teacher decision for ${suggestion.title}`}
      >
        <h3>Teacher decision</h3>
        {latest && (
          <div className="saved-decision">
            <strong>Saved decision: {latest.action.toUpperCase()}</strong>
            {latest.strategy && (
              <p className="preserve-text">{latest.strategy}</p>
            )}
            {latest.reason && (
              <p className="preserve-text">Reason: {latest.reason}</p>
            )}
          </div>
        )}
        {editing ? (
          <form onSubmit={save}>
            <fieldset className="decision-choice">
              <legend>Select your decision</legend>
              <div className="decision-options">
                {(["accept", "modify", "reject"] as const).map((value) => (
                  <label className="selection-option" key={value}>
                    <input
                      type="radio"
                      name={`decision-${id}`}
                      checked={action === value}
                      onChange={() => {
                        setAction(value);
                        setMessage("");
                      }}
                    />
                    <span>{value[0].toUpperCase() + value.slice(1)}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            {action === "modify" && (
              <>
                <label htmlFor={`strategy-${id}`}>Your adapted strategy</label>
                <textarea
                  id={`strategy-${id}`}
                  required
                  maxLength={5000}
                  rows={4}
                  value={strategy}
                  onChange={(event) => setStrategy(event.target.value)}
                />
              </>
            )}
            {action === "reject" && (
              <>
                <label htmlFor={`reason-${id}`}>
                  Reason for rejecting (optional)
                </label>
                <textarea
                  id={`reason-${id}`}
                  maxLength={2000}
                  rows={3}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                />
              </>
            )}
            <div className="form-actions">
              <button className="button" type="submit">
                Save decision
              </button>
              {latest && (
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => {
                    setEditing(false);
                    setAction(latest.action);
                    setStrategy(latest.strategy || suggestion.strategy);
                    setReason(latest.reason);
                    setMessage("Unsaved decision edits discarded.");
                  }}
                >
                  Cancel revision
                </button>
              )}
            </div>
          </form>
        ) : (
          <button
            className="button secondary"
            onClick={() => {
              setEditing(true);
              setMessage("");
            }}
          >
            Revise decision
          </button>
        )}
        <p role="status">
          {message || (!latest ? "No teacher decision saved." : "")}
        </p>
      </section>
      {history.length > 0 && (
        <details>
          <summary>Decision history ({history.length})</summary>
          <DecisionHistory history={history} />
        </details>
      )}
    </article>
  );
}
