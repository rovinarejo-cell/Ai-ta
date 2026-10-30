import { Link } from "react-router-dom";
import { AnalysisEvidence } from "../components/AnalysisEvidence";
import { ObservationSummary } from "../components/ObservationSummary";
import type { InstructionalAnalysis } from "../services/indicatorAnalysis";
export function IndicatorAnalysis({
  learnerId,
  analysis,
}: {
  learnerId: string;
  analysis?: InstructionalAnalysis;
}) {
  if (!analysis)
    return (
      <section className="card">
        <h2>No saved observation yet</h2>
        <p>
          No valid observation is available for this learner. Save a Teacher
          Observation to continue.
        </p>
        <Link className="button" to={`/learners/${learnerId}/observation`}>
          Back to Teacher Observation
        </Link>
      </section>
    );
  return (
    <div className="profile-form">
      <ObservationSummary observation={analysis.observation} />
      <div className="note privacy-note">
        <h2>Preliminary instructional summary</h2>
        <p>
          These are preliminary design rules, not clinically validated
          thresholds or a diagnostic or validated assessment. Each
          interpretation applies only to this observed activity; no overall
          score or permanent learner trait is inferred. The teacher remains the
          final decision-maker.
        </p>
        <p>
          0 means Not observed, not a support difficulty. Missing ratings
          receive no interpretation.
        </p>
      </div>
      <AnalysisEvidence analysis={analysis} />
      <div className="page-actions">
        <Link
          className="button secondary"
          to={`/learners/${learnerId}/observation`}
        >
          ← Back to Teacher Observation
        </Link>
        <Link className="button" to={`/learners/${learnerId}/recommendation`}>
          Continue to Recommendation →
        </Link>
      </div>
    </div>
  );
}
