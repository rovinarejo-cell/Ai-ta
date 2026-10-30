import type { TeacherObservationData } from "../types";
export function ObservationSummary({
  observation,
}: {
  observation: TeacherObservationData;
}) {
  return (
    <section className="card">
      <span className="pill subtle">Recorded teacher evidence</span>
      <h2>Observation context</h2>
      <dl className="observation-context">
        <div>
          <dt>Learner</dt>
          <dd>
            {observation.context.name} · {observation.context.learnerCode}
          </dd>
        </div>
        <div>
          <dt>Class/grade · Subject</dt>
          <dd>
            {observation.context.grade || "Not recorded"} ·{" "}
            {observation.context.subject || "Not recorded"}
          </dd>
        </div>
        <div>
          <dt>Date · Teacher</dt>
          <dd>
            {observation.date} · {observation.teacher}
          </dd>
        </div>
        <div>
          <dt>Activity/task</dt>
          <dd>{observation.activity}</dd>
        </div>
      </dl>
      <h3>Additional teacher observation</h3>
      <p className="preserve-text">
        {observation.additionalObservation ||
          "No additional observation recorded."}
      </p>
    </section>
  );
}
