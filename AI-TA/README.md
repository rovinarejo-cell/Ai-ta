# AI-TA — V0.4 Frontend and V0.5 Backend Foundation

React + TypeScript + Vite teacher workspace using fictional learners. V0.5 adds a separate Django REST Framework foundation under `backend/`; the frontend still uses local/session data and is not connected to the API. There is no learner database, machine learning, diagnosis, overall learner score, ranking, or autonomous intervention. Recommendation rules are illustrative preliminary design hypotheses, not validated interventions or clinically established thresholds. Teacher judgment remains final; outcomes are not guaranteed.

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

`npm test` runs 21 recommendation/activity-plan rule and storage tests without additional test dependencies. Production hosting must serve `index.html` for frontend routes.

## Existing workflow

Dashboard → select learner → Learner Profile → Teacher Observation → Indicator Analysis → Recommendation / Teacher Decision.

The Adaptive Activity Plan route drafts one editable activity for each latest accepted or modified recommendation in the current observation. Rejected and superseded decisions are excluded. Teacher Decision reuses the recommendation-specific controls rather than maintaining a second conflicting decision. No activity is automatically assigned.

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
9. Continue to Adaptive Activity Plan and follow the V0.4 review steps below. Try at laptop/mobile widths; rating cards use four desktop columns and two smaller-screen columns without horizontal page overflow.

## Architecture

- `src/pages`: existing dashboard/profile/observation, restored analysis, and V0.3 recommendation screen.
- `src/components`: shared layout, observation summary, analysis evidence, recommendation card, decision history, and existing form controls.
- `src/services`: pure analysis/recommendation generation and separate session-storage adapters.
- `src/types.ts`, `src/data`: existing typed model and fictional learner/indicator definitions.
- `tests/recommendation-rules.test.mjs`, `tests/activity-plans.test.mjs`: reproducible rules, storage, isolation, revisions, plan generation/approval, and failure-path tests.

An eventual API adapter can replace session storage without changing rule generation. The V0.5 backend currently exposes only a versioned health endpoint, with empty domain applications and no migration of frontend data. PostgreSQL is the intended production backend; SQLite is a temporary development option. See [backend setup instructions](backend/README.md). No interpretable model is implemented.

## V0.4 Adaptive Activity Plan

Plan generation (`src/services/activityPlans.ts`) is separate from recommendation generation. It first selects only the latest decision for each recommendation in the exact current learner/observation context, then includes Accept/Modify decisions only. The source decision, original observation ID (or an explicitly labeled legacy snapshot key), original indicator(s), rating(s), rule, original recommendation, and teacher's final strategy are retained in every plan. Modified strategies are used verbatim. Earlier or rejected strategies never appear as active plans.

Each approved strategy has a separate editable activity: subject, specific objective, target skill, title, description, materials, suggested duration, instruction/guidance/participation steps, optional adaptive supports, observation/assessment criteria and notes, positive/constructive feedback, and a repeat/modify opportunity. Defaults are preliminary draft suggestions, not validated activities or promises of improved outcomes. Teachers must refine lesson-specific goals, criteria, materials, and timing.

Only selected supports are included. Accepted-strategy drafts preselect a limited set of supports relevant to that strategy; visual support for E is selected only when the profile records visual instructions. Interests and communication preferences are displayed from a profile snapshot; interest-based examples are optional and require teacher selection. Modified strategies start with all extra supports off so the original recommendation's scaffolding cannot override the teacher's modification. Teachers can enable, disable, and edit any support.

Save activity plan stores a teacher-reviewed **draft**, not an approved or assigned activity. To approve it, check the review confirmation and click **Approve and save plan**. Approval never assigns an activity. Any subsequent field edit returns the editor to draft; save and explicitly approve again if desired. At least one complete instructional step is required. Add/remove steps and use Discard unsaved edits to restore the last saved plan.

Plans use `ai-ta.activity-plans.v1` in browser sessionStorage, with separate records per learner/observation/decision revision. Save-time checks reread the current observation and latest decisions: an out-of-date, changed, rejected, or superseded source cannot be saved or approved. Saved drafts/approvals survive navigation and refresh in this tab. A later decision revision creates a new plan context; earlier records remain stored but are excluded from current plans. There is no plan revision history, automatic migration/export, assignment, or permanent storage. Profile edits still reset on refresh, but a saved plan retains the interests/preferences snapshot used to draft it. Unsaved plan edits reset when leaving or refreshing.

### V0.4 manual review

1. Save a learner observation with several eligible indicators rated 1/2.
2. On Recommendation, Accept one strategy, Modify another with different teacher wording, and Reject a third. Save each decision.
3. Continue to Adaptive Activity Plan: only two activities should appear; the modified strategy must use your wording. With no current approved decisions, the page instead links back to Recommendation.
4. Edit the objective/title/description, duration, instructional steps, supports, success criteria, and assessment notes. Save activity plan and refresh; edits must remain and the status must be draft.
5. Check the review confirmation and Approve and save plan. Refresh and verify the approval remains. Edit any field and verify it returns to draft.
6. Expand Why was this activity created? and inspect the observation ID, source decision, original recommendation, recorded ratings, triggering rule, and final selected strategy.
7. Switch learners: plans must not leak between learners. Return to Recommendation and reject a formerly accepted strategy: its activity must disappear from current plans, and stale saves must fail.
8. Check multiple accepted/modified activities save independently. Closing the tab ends the storage session; no permanent research record is claimed.

## V0.5 initial backend foundation

See [backend/README.md](backend/README.md) for Python installation, separate development/production settings, Django startup, configuration variables, CORS, and validation. Health: `http://127.0.0.1:8000/api/v1/health/`. Run Django and the existing Vite frontend in separate terminals. The frontend components, types, rules, and browser-storage workflow are unchanged by this foundation. No authentication, learner models, data migration, backend recommendation logic, deployment, or PostgreSQL connectivity claim is included.

## V0.5.2 database configuration

PostgreSQL remains an explicit opt-in through `DATABASE_ENGINE=postgresql`; temporary SQLite development is the default. Backend configuration tests now cover required PostgreSQL fields, ports, driver compatibility, and production guards. See [PostgreSQL setup and verification](backend/README.md#v052--postgresql-local-setup-and-connection-verification) for installation, database creation, migration, safe configuration, and live connection checks. PostgreSQL has not been connected in this workspace; settings tests and health success do not prove database readiness.
