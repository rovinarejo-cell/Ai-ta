import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
const server = await createServer({
  optimizeDeps: { noDiscovery: true, entries: [] },
  server: { middlewareMode: true, hmr: false, ws: false },
});
const { approvedDecisions, createActivityPlan } = await server.ssrLoadModule(
  "/src/services/activityPlans.ts",
);
const { loadActivityPlans, saveActivityPlan, activityPlanStorageKey } =
  await server.ssrLoadModule("/src/services/activityPlanStorage.ts");
const { saveDecision, loadDecisions } = await server.ssrLoadModule(
  "/src/services/decisionStorage.ts",
);
const { storeObservation, observationKey } = await server.ssrLoadModule(
  "/src/services/observationStorage.ts",
);
const { analyzeObservation } = await server.ssrLoadModule(
  "/src/services/indicatorAnalysis.ts",
);
const { generateRecommendations } = await server.ssrLoadModule(
  "/src/services/recommendationRules.ts",
);
await server.close();
let data;
beforeEach(() => {
  data = new Map();
  globalThis.sessionStorage = {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
  };
});
const profile = {
  learnerCode: "L-001",
  name: "Maya",
  grade: "Year 4",
  age: 9,
  subject: "English",
  strengths: [],
  otherStrength: "",
  supportNeeds: [],
  otherSupportNeed: "",
  interests: ["Stories", "Animals"],
  communicationPreferences: ["Visual instructions"],
  previousStrategies: [],
  teacherNotes: "",
};
const observation = (id = "maya") => ({
  observationId: `observation-${id}`,
  learnerId: id,
  context: { name: id, learnerCode: id, grade: "Year 4", subject: "English" },
  date: "2026-10-30",
  teacher: "Teacher",
  activity: "Read a story",
  ratings: {
    taskInitiation: { rating: 1, note: "Needed a starting cue." },
    followingInstructions: { rating: 2, note: "" },
    readingMeaning: { rating: 1, note: "" },
  },
  additionalObservation: "General context",
  observedStrengths: [],
  observedBarriers: [],
});
function approve(
  obs = observation(),
  action = "accept",
  index = 0,
  strategy = "Use a learner-chosen cue only.",
) {
  storeObservation(obs);
  const suggestion = generateRecommendations(analyzeObservation(obs))
    .suggestions[index];
  const history = saveDecision(obs, suggestion, action, strategy, "");
  return { obs, suggestion, decision: history.at(-1) };
}
test("accepted recommendation creates an unapproved draft with traceable original evidence", () => {
  const { obs, decision } = approve();
  const plan = createActivityPlan(decision, profile);
  assert.equal(plan.status, "draft");
  assert.equal(plan.savedAt, null);
  assert.equal(plan.sourceObservationId, obs.observationId);
  assert.equal(plan.sourceObservationKey, observationKey(obs));
  assert.equal(plan.sourceDecision.id, decision.id);
  assert.equal(plan.sourceDecision.recommendation.evidence[0].rating, 1);
  assert.equal(
    plan.sourceDecision.recommendation.evidence[0].teacherNote,
    "Needed a starting cue.",
  );
  assert.equal(plan.steps[1].teacherGuidance, decision.strategy);
});
test("modified strategy is used verbatim with no automatic original scaffolding", () => {
  const { decision } = approve(observation(), "modify");
  const plan = createActivityPlan(decision, profile);
  assert(plan.description.includes("Use a learner-chosen cue only."));
  assert.equal(plan.steps[1].teacherGuidance, "Use a learner-chosen cue only.");
  assert(!plan.description.includes(decision.recommendation.strategy));
  assert(plan.supports.every((s) => !s.enabled));
});
test("latest rejection excludes a previously accepted strategy; rejected drafts are refused", () => {
  const { obs, suggestion, decision } = approve();
  assert.equal(approvedDecisions(obs, loadDecisions()).length, 1);
  saveDecision(obs, suggestion, "reject", "", "Not appropriate");
  assert.equal(approvedDecisions(obs, loadDecisions()).length, 0);
  assert.throws(() => createActivityPlan(loadDecisions().at(-1), profile));
  assert.throws(() => saveActivityPlan(createActivityPlan(decision, profile)));
});
test("multiple current approvals yield one separate plan per accepted or modified decision", () => {
  const { obs } = approve();
  approve(obs, "modify", 1);
  approve(obs, "reject", 2);
  const eligible = approvedDecisions(obs, loadDecisions());
  assert.equal(eligible.length, 2);
  assert.equal(
    new Set(eligible.map((d) => createActivityPlan(d, profile).id)).size,
    2,
  );
});
test("no decisions, other learners, or changed observations cannot produce eligible plans", () => {
  const { obs } = approve();
  assert.equal(approvedDecisions(obs, []).length, 0);
  assert.equal(
    approvedDecisions(observation("leo"), loadDecisions()).length,
    0,
  );
  assert.equal(
    approvedDecisions({ ...obs, activity: "Different task" }, loadDecisions())
      .length,
    0,
  );
});
test("recorded interests and preferences are retained without enabling every support", () => {
  const { decision } = approve(observation(), "accept", 2);
  const plan = createActivityPlan(decision, profile);
  assert.deepEqual(plan.profileContext.interests, ["Stories", "Animals"]);
  assert(plan.supports.find((s) => s.type === "visual").enabled);
  assert(!plan.supports.find((s) => s.type === "practice").enabled);
  assert(!plan.supports.find((s) => s.type === "interests").enabled);
  assert(
    plan.supports
      .find((s) => s.type === "interests")
      .description.includes("Animals"),
  );
});
test("edits and saved plans survive reload independently by learner", () => {
  const maya = approve();
  const edited = {
    ...createActivityPlan(maya.decision, profile),
    objective: "Identify the first event in the story.",
    title: "Story sequence",
    durationMinutes: 15,
    assessmentNotes: "Teacher record",
  };
  const saved = saveActivityPlan(edited);
  assert.equal(saved.status, "draft");
  assert(saved.savedAt);
  assert.equal(loadActivityPlans()[0].objective, edited.objective);
  const leo = approve(observation("leo"));
  saveActivityPlan(createActivityPlan(leo.decision, profile));
  assert.equal(loadActivityPlans().length, 2);
  assert.equal(
    loadActivityPlans().find((p) => p.learnerId === "maya").title,
    "Story sequence",
  );
});
test("approval is explicit and a subsequent draft save clears approval", () => {
  const { decision } = approve();
  const draft = createActivityPlan(decision, profile);
  const approved = saveActivityPlan(draft, true);
  assert.equal(approved.status, "approved");
  assert(approved.approvedAt);
  const revised = saveActivityPlan({
    ...approved,
    title: "Revised activity",
    status: "draft",
    approvedAt: null,
  });
  assert.equal(revised.status, "draft");
  assert.equal(revised.approvedAt, null);
});
test("invalid plan fields and missing steps cannot save; source evidence cannot be replaced", () => {
  const { decision } = approve();
  const draft = createActivityPlan(decision, profile);
  for (const patch of [
    { objective: " " },
    { durationMinutes: 0 },
    { durationMinutes: NaN },
    { steps: [] },
    { sourceObservationId: "another" },
    { learnerId: "leo" },
    { supports: [] },
  ])
    assert.throws(() => saveActivityPlan({ ...draft, ...patch }));
  assert.equal(loadActivityPlans().length, 0);
});
test("a newer modification or changed source blocks stale plan saving without deleting saved drafts", () => {
  const { obs, suggestion, decision } = approve();
  const plan = createActivityPlan(decision, profile);
  saveActivityPlan(plan);
  saveDecision(obs, suggestion, "modify", "New strategy", "");
  assert.throws(() => saveActivityPlan(plan, true));
  assert.equal(loadActivityPlans().length, 1);
  storeObservation({ ...obs, activity: "Different task" });
  assert.throws(() => saveActivityPlan(plan));
});
test("storage failures and corrupt saved data do not claim success or overwrite plans", () => {
  const { decision } = approve();
  const plan = createActivityPlan(decision, profile);
  sessionStorage.setItem = () => {
    throw new Error("Storage full");
  };
  assert.throws(() => saveActivityPlan(plan));
  assert.equal(loadActivityPlans().length, 0);
  data.set(activityPlanStorageKey, "corrupt");
  assert.throws(() => loadActivityPlans());
  assert.throws(() => saveActivityPlan(plan));
  assert.equal(data.get(activityPlanStorageKey), "corrupt");
});
