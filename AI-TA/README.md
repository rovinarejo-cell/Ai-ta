# AI-TA V0.3 — Explainable Recommendation Prototype

React + TypeScript + Vite teacher workspace using fictional learners. There is no backend, database, machine learning, diagnosis, overall learner score, ranking, or autonomous intervention. Recommendation rules are illustrative preliminary design hypotheses, not validated interventions or clinically established thresholds. Teacher judgment remains final; outcomes are not guaranteed.

## Run and validate

Use Node.js 24 LTS (also compatible with the Vite requirement of Node 20.19+ or 22.12+).

```sh
# Open a terminal in the AI-TA folder containing package.json.
npm ci
npm run dev
```

Open the address Vite prints, normally http://localhost:5173, on the same computer. This cloud onboarding UI does not provide a live preview. In this cloud machine the project directory is `/workspace/Ai-ta/AI-TA`; use `npm ci --cache /tmp/ai-ta-npm-cache` if the default npm cache is unwritable.

```sh
npm test
npm run typecheck
npm run build
npm run preview
```

`npm test` runs the repository's ten rule/storage tests without additional test dependencies. Production hosting must serve `index.html` for frontend routes.

## Existing workflow

Dashboard → select learner → Learner Profile → Teacher Observation → Indicator Analysis → Recommendation / Teacher Decision.

The Activity Plan route is explicitly a future-stage placeholder. No plan is created when a strategy is suggested or accepted. Teacher Decision reuses the recommendation-specific decision controls rather than maintaining a second conflicting decision.

Profiles contain the existing eight editable research sections. Profile edits stay in React memory and reset on refresh. Save/Cancel behavior is unchanged. Recommendations do not infer needs from profile strengths, interests, or notes.

Teacher Observation keeps the existing context, 18 indicators, optional notes, summary, and teacher-selected strengths/barriers. Teacher, date, and activity are required. New ratings default to 0 = Not observed. A missing/null rating remains distinct from an explicit 0. Clear confirms resetting only the unsaved draft; saved observations and decisions remain intact. Leaving the form discards unsaved edits. Use Add observation before saving any custom evidence text.

## Evidence and analysis

`src/services/indicatorAnalysis.ts` derives a separate, activity-specific summary:

- 0: not observed; no interpretation.
- 1: may require substantial instructional support.
- 2: may benefit from occasional support.
- 3: relative strength in this observed activity, not a permanent learner trait.
- Missing/null: no interpretation and no inferred need.

Every analysis entry retains the indicator ID, original rating/label, teacher note, and explicit baseline rule. No overall score is calculated. The saved observation is the source of truth; analysis is recomputed from it rather than stored as a stale duplicate.

## V0.3 recommendation rules

`src/services/recommendationRules.ts` is a pure module, separate from storage, teacher decisions, and future activity-plan generation. A strategy is triggered only by a recorded rating of 1 or 2:

| Rule | Recorded indicator | Suggested teaching strategy |
| --- | --- | --- |
| A | Task initiation | Smaller steps and a clear starting prompt |
| B | Following instructions | Short sequential instructions; demonstrate/explain the next step |
| C | Sustained attention | Manageable task segment, clear goal, planned pause/check-in |
| D | Task completion | Smaller milestones with feedback |
| E | Reading/meaning-making OR understanding the task | Clear language, relevant visual support, check understanding |
| F | Problem solving | Worked example and graduated hints before independent practice |

Rule E produces one suggestion with both evidence records when both indicators trigger. Every suggestion displays the strategy, original indicator(s) and rating(s), exact condition, rationale, indicator-specific notes (or an explicit missing-note message), and a teacher-consideration statement. All indicators rated 3 are listed separately as observed strengths, with no forced strategy. Zero, missing data, and indicators without a strategy rule generate no suggestion. Teacher-selected evidence and general notes are shown as recorded context, not interpreted as diagnoses or additional triggers.

## Decisions and session storage

- Observations: `ai-ta.observations.v1` in browser `sessionStorage`.
- Decisions/history: `ai-ta.recommendation-decisions.v1` in the same tab's `sessionStorage`.
- Accept retains the proposed strategy; Modify requires a nonempty teacher adaptation; Reject retains an optional reason and does not adopt the strategy.
- Nothing is accepted merely by generating a suggestion. Each decision requires Save decision and can later be revised.
- Each revision appends a timestamped record containing the learner ID, exact observation identity/content, recommendation ID/version, original observation snapshot, original indicator/rating/note, rule condition, strategy, and teacher action. Latest decision and earlier revisions are shown separately.
- Refresh/navigation in the same tab retain saved observations and decisions. This is not permanent storage; closing the tab ends the session. Use fictional data only.
- Saving unchanged evidence retains the decision context. Changed context, ratings, or notes starts a different context, so previous decisions are not silently reused. Earlier decisions remain auditable under Earlier observation decision history for that learner.
- Storage write failures display an error, preserve edits, and do not report false success. Invalid decision history is not silently overwritten. There is no database or multi-user synchronization.
- One current observation per learner is retained. Prior observation snapshots survive only when referenced by decision history; a full observation archive/export is outside V0.3.

## Manual review

1. Select a learner and open Recommendation before saving an observation. Check the empty state and Teacher Observation link.
2. Enter teacher/activity, use ratings 1/2 on the seven indicators mapped to rules A–F, and rate Participation 3. Add an indicator note and a general note. Save and continue via Indicator Analysis.
3. Verify six separate suggestions. E should show both reading/understanding evidence without duplication. Verify source ratings, conditions, reasons, and notes. Participation should appear as an observed strength only.
4. Accept one suggestion, Modify another with a teacher-written strategy, and Reject another with an optional reason. Save each decision.
5. Refresh and navigate via Teacher Decision; saved decisions and modified text must remain. Revise a decision and expand its history.
6. Switch learners; no observation or decision should leak across learners.
7. Change and save the original learner’s activity or rating. New suggestions must not inherit previous decisions; previous records appear in separately labeled history.
8. Set strategy indicators to 0 (or use no recorded ratings): no strategy is inferred. Rating 3 remains a strength only. Missing notes have an explicit message, not invented content.
9. Open Activity Plan: it must remain unimplemented. Try at laptop/mobile widths; rating cards use four desktop columns and two smaller-screen columns without horizontal page overflow.

## Architecture

- `src/pages`: existing dashboard/profile/observation, restored analysis, and V0.3 recommendation screen.
- `src/components`: shared layout, observation summary, analysis evidence, recommendation card, decision history, and existing form controls.
- `src/services`: pure analysis/recommendation generation and separate session-storage adapters.
- `src/types.ts`, `src/data`: existing typed model and fictional learner/indicator definitions.
- `tests/recommendation-rules.test.mjs`: reproducible rules, storage, isolation, revisions, and failure-path tests.

An eventual API adapter can replace session storage without changing rule generation. Django/PostgreSQL and any later interpretable model are not part of this version.
