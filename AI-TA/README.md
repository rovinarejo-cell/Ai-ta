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

The Learner Profile page contains Basic Information, Learning Strengths, Areas Requiring Support, Learner Interests, Communication Preferences, Previous Support / Strategies, Teacher Notes, and the research/privacy note. Native checkboxes support multiple selections. Custom strengths, support observations, and interests can be recorded. Save commits edits to session state; Cancel restores the last saved profile. Refresh clears edits. Saved profiles are separate per learner. No analysis is performed on these fields. Save or cancel pending edits before using the profile’s Continue to Teacher Observation button. Leaving via other navigation discards unsaved edits. The pre-existing observation demo remains available; this update adds no observation functionality.
