import { useState } from "react";
import type { FormEvent } from "react";
import type { ActivityPlan } from "../services/activityPlans";
import { supportTypes } from "../services/activityPlans";
import { saveActivityPlan } from "../services/activityPlanStorage";
import { PlanTextField } from "./PlanTextField";
import { ActivityPlanEvidence } from "./ActivityPlanEvidence";
export function ActivityPlanEditor({
  initialPlan,
}: {
  initialPlan: ActivityPlan;
}) {
  const [draft, setDraft] = useState(initialPlan);
  const [saved, setSaved] = useState<ActivityPlan | null>(
    initialPlan.savedAt ? initialPlan : null,
  );
  const [message, setMessage] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const change = <K extends keyof ActivityPlan>(
    field: K,
    value: ActivityPlan[K],
  ) => {
    setDraft((previous) => ({
      ...previous,
      [field]: value,
      status: "draft",
      approvedAt: null,
    }));
    setMessage("");
    setConfirmed(false);
  };
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const text = (
    field:
      | "subject"
      | "objective"
      | "targetSkill"
      | "title"
      | "description"
      | "materials"
      | "assessmentObservation"
      | "successCriteria"
      | "assessmentNotes"
      | "positiveFeedback"
      | "constructiveFeedback"
      | "repeatOrModify",
    label: string,
    multiline = false,
    optional = false,
  ) => (
    <PlanTextField
      id={`${draft.id}-${field}`}
      label={label}
      value={draft[field]}
      multiline={multiline}
      optional={optional}
      onChange={(value) => change(field, value)}
    />
  );
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!event.currentTarget.reportValidity()) return;
    const approve =
      (event.nativeEvent as SubmitEvent).submitter?.getAttribute(
        "data-approve",
      ) === "true";
    if (approve && !confirmed) {
      setMessage(
        "Confirm that you have reviewed the plan before approving it.",
      );
      return;
    }
    try {
      const next = saveActivityPlan(draft, approve);
      setDraft(next);
      setSaved(next);
      setConfirmed(false);
      setMessage(
        approve
          ? "Plan explicitly approved and saved for this session. No activity has been assigned."
          : "Teacher-reviewed draft saved for this session. It is not approved or assigned.",
      );
    } catch {
      setMessage(
        "Plan could not be saved. Check required fields and browser storage. If the observation or teacher decision changed, return to Recommendation and reload the current plan. Your edits remain here.",
      );
    }
  };
  return (
    <article
      className="card activity-plan"
      aria-labelledby={`${draft.id}-heading`}
    >
      <div className="plan-status">
        <span className="pill subtle">
          {draft.status === "approved"
            ? "Teacher-approved instructional plan"
            : saved && !dirty
              ? "Teacher-reviewed draft — not approved"
              : saved
                ? "Edited draft — approval required"
                : "Draft suggestions — awaiting teacher review"}
        </span>
      </div>
      <h2 id={`${draft.id}-heading`}>
        Activity for {draft.sourceDecision.recommendation.title}
      </h2>
      <p className="preserve-text">
        <strong>Teacher-selected strategy:</strong>{" "}
        {draft.sourceDecision.strategy}
      </p>
      <p className="profile-help">
        Draft content, materials, timings, and feedback are editable
        suggestions. Approval never assigns the activity to a learner.
      </p>
      <ActivityPlanEvidence plan={draft} />
      <form className="plan-form" onSubmit={submit}>
        <fieldset className="plan-section">
          <legend>A. Learning Objective</legend>
          {text("subject", "Subject")}
          {text("objective", "Specific learning objective", true)}
          {text("targetSkill", "Target skill")}
        </fieldset>
        <fieldset className="plan-section">
          <legend>B. Activity Details</legend>
          {text("title", "Activity title")}
          {text("description", "Activity description", true)}
          {text("materials", "Learning materials required", true)}
          <label htmlFor={`${draft.id}-duration`}>
            Suggested duration (minutes, editable)
          </label>
          <input
            id={`${draft.id}-duration`}
            type="number"
            min={1}
            max={480}
            step={1}
            required
            value={
              Number.isNaN(draft.durationMinutes) ? "" : draft.durationMinutes
            }
            onChange={(event) =>
              change("durationMinutes", event.target.valueAsNumber)
            }
          />
        </fieldset>
        <fieldset className="plan-section">
          <legend>C. Instructional Steps</legend>
          {draft.steps.map((step, index) => (
            <section
              className="plan-step"
              key={step.id}
              aria-label={`Step ${index + 1}`}
            >
              <h3>Step {index + 1}</h3>
              {(
                [
                  "instruction",
                  "teacherGuidance",
                  "learnerParticipation",
                ] as const
              ).map((field) => (
                <PlanTextField
                  key={field}
                  id={`${draft.id}-${step.id}-${field}`}
                  label={`${field === "instruction" ? "Instruction" : field === "teacherGuidance" ? "Teacher guidance" : "Learner participation opportunity"} for step ${index + 1}`}
                  value={step[field]}
                  multiline
                  onChange={(value) =>
                    change(
                      "steps",
                      draft.steps.map((item) =>
                        item.id === step.id
                          ? { ...item, [field]: value }
                          : item,
                      ),
                    )
                  }
                />
              ))}
              <button
                className="button secondary"
                type="button"
                disabled={draft.steps.length === 1}
                onClick={() =>
                  change(
                    "steps",
                    draft.steps.filter((item) => item.id !== step.id),
                  )
                }
              >
                Remove step {index + 1}
              </button>
            </section>
          ))}
          <button
            className="button secondary"
            type="button"
            onClick={() =>
              change("steps", [
                ...draft.steps,
                {
                  id: crypto.randomUUID(),
                  instruction: "",
                  teacherGuidance: "",
                  learnerParticipation: "",
                },
              ])
            }
          >
            Add instructional step
          </button>
          <p className="profile-help">
            Keep at least one complete step. New steps must include instruction,
            guidance, and learner participation.
          </p>
        </fieldset>
        <fieldset className="plan-section">
          <legend>D. Adaptive Support</legend>
          <p>
            Only checked support is included in this plan. Modify or deselect it
            as appropriate. Modified decisions start with no extra supports
            selected so the original suggestion does not override your strategy.
          </p>
          <p>
            <strong>Recorded interests:</strong>{" "}
            {draft.profileContext.interests.join(", ") || "None recorded"}
          </p>
          <p>
            <strong>Recorded communication preferences:</strong>{" "}
            {draft.profileContext.communicationPreferences.join(", ") ||
              "None recorded"}
          </p>
          <div className="plan-supports">
            {draft.supports.map((support) => (
              <div className="plan-support" key={support.type}>
                <label className="selection-option">
                  <input
                    type="checkbox"
                    checked={support.enabled}
                    onChange={(event) =>
                      change(
                        "supports",
                        draft.supports.map((item) =>
                          item.type === support.type
                            ? { ...item, enabled: event.target.checked }
                            : item,
                        ),
                      )
                    }
                  />
                  <span>
                    {supportTypes.find(([type]) => type === support.type)?.[1]}
                  </span>
                </label>
                {support.enabled && (
                  <PlanTextField
                    id={`${draft.id}-support-${support.type}`}
                    label={`How to use ${supportTypes.find(([type]) => type === support.type)?.[1].toLowerCase()}`}
                    value={support.description}
                    multiline
                    onChange={(value) =>
                      change(
                        "supports",
                        draft.supports.map((item) =>
                          item.type === support.type
                            ? { ...item, description: value }
                            : item,
                        ),
                      )
                    }
                  />
                )}
              </div>
            ))}
          </div>
        </fieldset>
        <fieldset className="plan-section">
          <legend>E. Assessment</legend>
          {text(
            "assessmentObservation",
            "How the teacher can observe learning",
            true,
          )}
          {text("successCriteria", "Observable success criteria", true)}
          {text("assessmentNotes", "Teacher assessment notes", true, true)}
        </fieldset>
        <fieldset className="plan-section">
          <legend>F. Feedback</legend>
          {text("positiveFeedback", "Positive feedback suggestion", true)}
          {text(
            "constructiveFeedback",
            "Constructive feedback suggestion",
            true,
          )}
          {text(
            "repeatOrModify",
            "Opportunity to repeat or modify the activity",
            true,
          )}
        </fieldset>
        <div className="note privacy-note">
          <h3>Teacher control and research integrity</h3>
          <p>
            This is an editable instructional draft based on a teacher-approved
            strategy. No diagnosis, ML, autonomous assignment, or claim of
            improved outcomes is made. You remain responsible for judging
            suitability and deciding whether to use the plan.
          </p>
        </div>
        <div className="form-actions">
          <button type="submit" className="button">
            Save activity plan
          </button>
          {saved && (
            <button
              type="button"
              className="button secondary"
              onClick={() => {
                setDraft(saved);
                setConfirmed(false);
                setMessage("Unsaved plan edits discarded.");
              }}
            >
              Discard unsaved edits
            </button>
          )}
        </div>
        <label className="selection-option plan-confirmation">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
          />
          <span>
            I have reviewed the objective, activity, support, and assessment for
            this lesson.
          </span>
        </label>
        <button type="submit" className="button secondary" data-approve="true">
          Approve and save plan
        </button>
        <p role="status" aria-live="polite">
          {message ||
            (dirty
              ? "Unsaved draft changes. Save or explicitly approve after review."
              : draft.status === "approved"
                ? "Approved for teacher use; not assigned."
                : "Saved as a draft, awaiting explicit approval.")}
        </p>
      </form>
    </article>
  );
}
