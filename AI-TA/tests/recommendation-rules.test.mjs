import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
const server = await createServer({
  optimizeDeps: { noDiscovery: true, entries: [] },
  server: { middlewareMode: true },
});
const { analyzeObservation } = await server.ssrLoadModule(
  "/src/services/indicatorAnalysis.ts",
);
const { generateRecommendations } = await server.ssrLoadModule(
  "/src/services/recommendationRules.ts",
);
const { validObservation, observationKey, loadObservations, storeObservation } =
  await server.ssrLoadModule("/src/services/observationStorage.ts");
const { loadDecisions, saveDecision, matchingDecisions, decisionStorageKey } =
  await server.ssrLoadModule("/src/services/decisionStorage.ts");
const { indicatorGroups } = await server.ssrLoadModule(
  "/src/data/observationIndicators.ts",
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
const make = (ratings = {}) => ({
  learnerId: "maya",
  context: {
    name: "Maya",
    learnerCode: "L-001",
    grade: "Year 4",
    subject: "English",
  },
  date: "2026-10-30",
  teacher: "Teacher",
  activity: "Read and discuss",
  ratings,
  additionalObservation: "General context",
  observedStrengths: [],
  observedBarriers: [],
});
const run = (ratings) =>
  generateRecommendations(analyzeObservation(make(ratings)));
test("all zero, missing, and explicit null ratings generate no strategy or inferred strength", () => {
  for (const rating of [0, null]) {
    const ratings = Object.fromEntries(
      indicatorGroups.flatMap((group) =>
        group.indicators.map(({ id }) => [id, { rating, note: "" }]),
      ),
    );
    assert.deepEqual(run(ratings), { suggestions: [], strengths: [] });
  }
  assert.deepEqual(run({}), { suggestions: [], strengths: [] });
});
test("all six rules trigger for both 1 and 2, retaining exact source rating and note", () => {
  for (const rating of [1, 2]) {
    const indicators = [
      "taskInitiation",
      "followingInstructions",
      "sustainedAttention",
      "taskCompletion",
      "readingMeaning",
      "understandingTask",
      "problemSolving",
    ];
    const result = run(
      Object.fromEntries(
        indicators.map((id) => [id, { rating, note: `Evidence for ${id}` }]),
      ),
    );
    assert.deepEqual(
      result.suggestions.map((item) => item.ruleId),
      ["A", "B", "C", "D", "E", "F"],
    );
    assert.equal(
      result.suggestions.find((item) => item.ruleId === "E").evidence.length,
      2,
    );
    for (const item of result.suggestions)
      for (const entry of item.evidence) {
        assert.equal(entry.rating, rating);
        assert.equal(entry.teacherNote, `Evidence for ${entry.indicatorId}`);
      }
  }
});
test("reading or task understanding can independently trigger E without duplicate strategy", () => {
  for (const id of ["readingMeaning", "understandingTask"])
    assert.equal(
      run({ [id]: { rating: 1, note: "" } }).suggestions[0].ruleId,
      "E",
    );
});
test("3 yields observed strengths only, including indicators without strategy rules", () => {
  const result = run({
    taskInitiation: { rating: 3, note: "Independent start" },
    communication: { rating: 3, note: "" },
    expressingNeeds: { rating: 3, note: "" },
  });
  assert.equal(result.suggestions.length, 0);
  assert.deepEqual(
    result.strengths.map((item) => item.indicatorId),
    ["taskInitiation", "expressingNeeds"],
  );
});
test("unmapped support indicators do not invent recommendations", () =>
  assert.equal(
    run({ participation: { rating: 1, note: "" } }).suggestions.length,
    0,
  ));
test("missing and explicit 0 are separate analysis evidence statuses", () => {
  const entries = analyzeObservation(
    make({ taskInitiation: { rating: 0, note: "" } }),
  ).groups.flatMap((group) => group.entries);
  assert.equal(
    entries.find((item) => item.indicatorId === "taskInitiation").rating,
    0,
  );
  assert.equal(
    entries.find((item) => item.indicatorId === "taskCompletion").rating,
    null,
  );
});
test("observation validation rejects invalid context, dates, ratings, and learner mismatch", () => {
  assert.equal(validObservation(make(), "maya"), true);
  assert.equal(validObservation(make(), "leo"), false);
  for (const patch of [
    { teacher: " " },
    { activity: "" },
    { date: "2026-02-30" },
    { ratings: { taskInitiation: { rating: 4, note: "" } } },
  ])
    assert.equal(validObservation({ ...make(), ...patch }, "maya"), false);
  assert.deepEqual(loadObservations(), {});
  storeObservation(make());
  assert.equal(loadObservations().maya.context.name, "Maya");
});
test("accept, modify, reject, and revisions append history with source snapshots", () => {
  const observation = make({
    taskInitiation: { rating: 1, note: "Needs a starting cue" },
  });
  const suggestion = generateRecommendations(analyzeObservation(observation))
    .suggestions[0];
  saveDecision(observation, suggestion, "accept", "ignored", "");
  saveDecision(
    observation,
    suggestion,
    "modify",
    "Teacher adapted strategy",
    "",
  );
  const all = saveDecision(
    observation,
    suggestion,
    "reject",
    "",
    "Not suitable for this task",
  );
  assert.equal(all.length, 3);
  assert.equal(all[0].strategy, suggestion.strategy);
  assert.equal(all[1].strategy, "Teacher adapted strategy");
  assert.equal(all[2].reason, "Not suitable for this task");
  assert.equal(all[2].strategy, "");
  assert.equal(loadDecisions().length, 3);
  assert.equal(
    all[0].recommendation.evidence[0].teacherNote,
    "Needs a starting cue",
  );
  assert.equal(matchingDecisions(all, observation, suggestion).length, 3);
  assert.throws(() =>
    saveDecision(observation, suggestion, "modify", "   ", ""),
  );
  assert.equal(loadDecisions().length, 3);
});
test("learner and observation isolation; changed notes or source invalidate current decisions", () => {
  const source = make({ taskInitiation: { rating: 1, note: "" } });
  const suggestion = generateRecommendations(analyzeObservation(source))
    .suggestions[0];
  const history = saveDecision(source, suggestion, "accept", "", "");
  for (const observation of [
    { ...source, learnerId: "leo" },
    { ...source, activity: "Another activity" },
    { ...source, ratings: { taskInitiation: { rating: 2, note: "" } } },
    { ...source, additionalObservation: "Changed context" },
  ]) {
    assert.notEqual(observationKey(observation), observationKey(source));
    assert.equal(matchingDecisions(history, observation, suggestion).length, 0);
  }
  assert.equal(loadDecisions().length, 1);
});
test("storage write failure and corrupt history do not silently claim or overwrite decisions", () => {
  const source = make({ taskInitiation: { rating: 1, note: "" } });
  const suggestion = generateRecommendations(analyzeObservation(source))
    .suggestions[0];
  sessionStorage.setItem = () => {
    throw new Error("Storage full");
  };
  assert.throws(() => saveDecision(source, suggestion, "accept", "", ""));
  assert.equal(loadDecisions().length, 0);
  data.set(decisionStorageKey, "broken json");
  assert.throws(() => saveDecision(source, suggestion, "accept", "", ""));
  assert.equal(data.get(decisionStorageKey), "broken json");
});
