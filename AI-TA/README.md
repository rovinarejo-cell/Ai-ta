# AI-TA frontend MVP

React + TypeScript + Vite teacher workspace. All learners are fictional. There is no backend, database, diagnosis, rule engine, or ML model.

## Run

Requires Node.js 20.19+ or 22.12+ and npm.

```sh
cd /workspace/Ai-ta/AI-TA
npm ci --cache /tmp/ai-ta-npm-cache
npm run dev -- --host 0.0.0.0 --port 5173
```

Open http://localhost:5173 on the machine running Vite. For a remote workspace, forward port 5173 using your workspace provider.

```sh
npm run build
npm run preview -- --host 0.0.0.0 --port 4173
```

## Workflow

Dashboard → select learner → profile → observation → indicator analysis → explainable recommendation → teacher decision → adaptive activity plan.

Navigation is functional. Observations and decisions remain in React memory for the current session and are cleared on refresh. Accept uses a fixed example activity; Modify lets the teacher supply an adaptation; Reject prevents adoption. Analysis and recommendations are explicitly illustrative and do not infer anything from observations.

## Structure

- `src/components`: shared layout, workflow navigation, headings.
- `src/pages`: dashboard and learner workflow views.
- `src/data`: fictional learners.
- `src/types.ts`: domain types for later API integration.
- `src/App.tsx`: routing and session state.

A later API/service layer can replace local data with Django/PostgreSQL. Any future rule engine or interpretable model must expose its evidence and limitations and retain teacher approval. Production hosting must serve `index.html` for frontend routes.

## Editable learner profiles

The Learner Profile page contains Basic Information, Learning Strengths, Areas Requiring Support, Learner Interests, Communication Preferences, Previous Support / Strategies, Teacher Notes, and the research/privacy note. Native checkboxes support multiple selections. Custom strengths, support observations, and interests can be recorded. Save commits edits to session state; Cancel restores the last saved profile. Refresh clears edits. Saved profiles are separate per learner. No analysis is performed on these fields. Save or cancel pending edits before using the profile’s Continue to Teacher Observation button. Leaving via other navigation discards unsaved edits. Continue opens the Teacher Observation page.

## Teacher Observation

Teacher Observation records one activity per learner in session memory. Date, teacher, and activity/task are required. The saved profile name, code, grade, and subject are captured with the observation. Its 18 stable indicator IDs each store a numeric rating (0–3) and an optional note. All ratings begin at 0, meaning Not observed; this is not low ability. Optional strengths, barriers, custom evidence, and a narrative summary remain teacher observations.

Save Observation stores the current entries. Continue to Indicator Analysis validates and saves pending entries, then opens a summary of the exact recorded ratings, notes, and evidence. No scoring, rule engine, interpretation, or new recommendations are applied. Clear asks for confirmation and removes the draft and saved observation for that learner, including the analysis input. Navigation retains saved entries; leaving without saving discards unsaved edits. Refresh clears all session data. Each new save replaces that learner’s previous observation; there is no history yet.

Manual review: select Maya, save an edited profile, continue to Teacher Observation, enter teacher and activity, choose ratings 1/2/3 on several indicators, add notes and custom evidence, and Continue. Check the summary matches the entries; return to edit, test Clear/Keep observation and Confirm clear, and verify another learner has no observation. Profile fields captured in an existing observation remain a snapshot; clear and start again to capture updated profile context. Existing recommendation/decision/activity-plan demos remain independent placeholders.
