import { useState } from "react";
import { Link } from "react-router-dom";
import type { LearnerProfileData, TeacherObservationData } from "../types";
import {
  approvedDecisions,
  createActivityPlan,
} from "../services/activityPlans";
import { loadActivityPlans } from "../services/activityPlanStorage";
import { loadDecisions } from "../services/decisionStorage";
import { ActivityPlanEditor } from "../components/ActivityPlanEditor";
import { ObservationSummary } from "../components/ObservationSummary";
export function AdaptiveActivityPlan({
  learnerId,
  observation,
  profile,
}: {
  learnerId: string;
  observation?: TeacherObservationData;
  profile: LearnerProfileData;
}) {
  const [state] = useState(() => {
    try {
      return {
        decisions: loadDecisions(),
        plans: loadActivityPlans(),
        error: "",
      };
    } catch {
      return {
        decisions: [],
        plans: [],
        error:
          "Saved decisions or plans could not be read. Check browser session storage. Existing records have not been overwritten.",
      };
    }
  });
  const back = (
    <Link
      className="button secondary"
      to={`/learners/${learnerId}/recommendation`}
    >
      ← Return to Recommendation
    </Link>
  );
  if (state.error)
    return (
      <section className="card">
        <h2>Activity plans unavailable</h2>
        <p role="alert">{state.error}</p>
        {back}
      </section>
    );
  const eligible =
    observation?.learnerId === learnerId
      ? approvedDecisions(observation, state.decisions)
      : [];
  if (!observation || !eligible.length)
    return (
      <section className="card">
        <h2>No approved strategies for this observation</h2>
        <p>
          Return to Recommendation and save an Accept or Modify decision for
          this learner’s current observation. Rejected, superseded, and other
          learners’ decisions are never included.
        </p>
        {back}
      </section>
    );
  return (
    <div className="profile-form">
      <ObservationSummary observation={observation} />
      <div className="note privacy-note">
        <h2>Adaptive Activity Plan · Teacher-led drafts</h2>
        <p>
          Each activity below uses one latest accepted or modified
          recommendation for this observation. Modified strategies use the
          teacher’s wording. All generated details are editable draft
          suggestions, not assigned activities. Save a reviewed draft, or
          explicitly approve it after review.
        </p>
        <p>
          Saved plans remain available during this browser session, including
          after refresh. They are not permanently stored. A new decision
          revision starts a separate plan; stale or rejected strategies are not
          included.
        </p>
      </div>
      {eligible.map((decision) => (
        <ActivityPlanEditor
          key={decision.id}
          initialPlan={
            state.plans.find((plan) => plan.id === `plan:${decision.id}`) ??
            createActivityPlan(decision, profile)
          }
        />
      ))}
      <div className="page-actions">{back}</div>
    </div>
  );
}
