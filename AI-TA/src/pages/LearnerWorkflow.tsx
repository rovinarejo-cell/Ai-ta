import { Link, useParams } from "react-router-dom";
import { learners } from "../data/learners";
import type { LearnerProfileData, TeacherObservationData } from "../types";
import { steps } from "../components/Layout";
import { LearnerProfile } from "./LearnerProfile";
import { TeacherObservation } from "./TeacherObservation";
import { IndicatorAnalysis } from "./IndicatorAnalysis";
import { Recommendation } from "./Recommendation";
import { analyzeObservation } from "../services/indicatorAnalysis";
import { PageHeading } from "../components/PageHeading";
export function LearnerWorkflow({
  profiles,
  saveProfile,
  observations,
  saveObservation,
}: {
  profiles: Record<string, LearnerProfileData>;
  saveProfile: (id: string, profile: LearnerProfileData) => void;
  observations: Record<string, TeacherObservationData>;
  saveObservation: (
    id: string,
    observation: TeacherObservationData,
  ) => TeacherObservationData;
}) {
  const { learnerId, stage } = useParams();
  const learner = learners.find((item) => item.id === learnerId);
  if (!learner || !steps.some(([path]) => path === stage))
    return (
      <section className="card">
        <h1>Page not found</h1>
        <Link to="/">Return to dashboard</Link>
      </section>
    );
  const index = steps.findIndex(([path]) => path === stage);
  const observation = observations[learner.id];
  const analysis =
    observation?.learnerId === learner.id
      ? analyzeObservation(observation)
      : undefined;
  return (
    <>
      <Link className="back-link" to="/">
        ← All learners
      </Link>
      <PageHeading
        eyebrow={`${profiles[learner.id].name.toUpperCase()} · ${profiles[learner.id].grade.toUpperCase()}`}
        title={steps[index][1]}
        description={`Step ${index + 1} of 6 · A teacher-led path from observation to activity planning.`}
      />
      <div className="workflow-progress" aria-label="Workflow progress">
        {steps.map(([path, label], i) => (
          <Link
            key={path}
            className={path === stage ? "current" : ""}
            aria-current={path === stage ? "step" : undefined}
            to={`/learners/${learner.id}/${path}`}
          >
            <span>{i + 1}</span>
            <small>{label}</small>
          </Link>
        ))}
      </div>
      {stage === "profile" && (
        <LearnerProfile
          key={learner.id}
          learnerId={learner.id}
          profile={profiles[learner.id]}
          onSave={(profile) => saveProfile(learner.id, profile)}
        />
      )}
      {stage === "observation" && (
        <TeacherObservation
          key={learner.id}
          learnerId={learner.id}
          profile={profiles[learner.id]}
          observation={observation}
          onSave={(data) => saveObservation(learner.id, data)}
        />
      )}
      {stage === "analysis" && (
        <IndicatorAnalysis learnerId={learner.id} analysis={analysis} />
      )}
      {(stage === "recommendation" || stage === "decision") && (
        <Recommendation
          key={`${learner.id}:${stage}`}
          learnerId={learner.id}
          analysis={analysis}
        />
      )}
      {stage === "plan" && (
        <section className="card">
          <span className="pill subtle">Future stage</span>
          <h2>Activity planning is not implemented in V0.3</h2>
          <p>
            No activity plan has been generated or applied. A future stage can
            use teacher-accepted or teacher-modified strategies. Decisions
            remain available for teacher review.
          </p>
          <Link
            className="button secondary"
            to={`/learners/${learner.id}/recommendation`}
          >
            Review recommendations and decisions
          </Link>
        </section>
      )}
    </>
  );
}
