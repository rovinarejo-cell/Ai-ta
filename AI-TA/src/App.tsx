import { useState } from "react";
import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { LearnerWorkflow } from "./pages/LearnerWorkflow";
import { mockProfiles } from "./data/profiles";
import {
  loadObservations,
  observationKey,
  storeObservation,
} from "./services/observationStorage";
import type { LearnerProfileData, TeacherObservationData } from "./types";
export default function App() {
  const [profiles, setProfiles] =
    useState<Record<string, LearnerProfileData>>(mockProfiles);
  const saveProfile = (id: string, profile: LearnerProfileData) =>
    setProfiles((previous) => ({ ...previous, [id]: profile }));
  const [observations, setObservations] =
    useState<Record<string, TeacherObservationData>>(loadObservations);
  const saveObservation = (id: string, observation: TeacherObservationData) => {
    const previous = observations[id];
    const saved =
      previous &&
      observationKey(previous) ===
        observationKey({
          ...observation,
          observationId: previous.observationId,
        })
        ? previous
        : { ...observation, observationId: crypto.randomUUID() };
    storeObservation(saved);
    setObservations((current) => ({ ...current, [id]: saved }));
    return saved;
  };
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route
            path="learners/:learnerId/:stage"
            element={
              <LearnerWorkflow
                profiles={profiles}
                saveProfile={saveProfile}
                observations={observations}
                saveObservation={saveObservation}
              />
            }
          />
          <Route
            path="*"
            element={
              <section className="card">
                <h1>Page not found</h1>
                <Link to="/">Return to dashboard</Link>
              </section>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
