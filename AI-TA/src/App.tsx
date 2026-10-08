import { useState } from 'react';
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { LearnerWorkflow } from './pages/LearnerWorkflow';
import { mockProfiles } from './data/profiles';
import type { LearnerProfileData, LearnerWork } from './types';
export default function App() {
  const [profiles, setProfiles] = useState<Record<string, LearnerProfileData>>(mockProfiles);
  const saveProfile = (id: string, profile: LearnerProfileData) => setProfiles(previous => ({ ...previous, [id]: profile }));
  const [work, setWork] = useState<Record<string, LearnerWork>>({});
  const update = (id: string, patch: Partial<LearnerWork>) => setWork(previous => ({ ...previous, [id]: { ...(previous[id] ?? { observation: '', modification: '' }), ...patch } }));
  return <BrowserRouter><Routes><Route element={<Layout />}><Route index element={<Dashboard />} /><Route path="learners/:learnerId/:stage" element={<LearnerWorkflow work={work} update={update} profiles={profiles} saveProfile={saveProfile} />} /><Route path="*" element={<section className="card"><h1>Page not found</h1><Link to="/">Return to dashboard</Link></section>} /></Route></Routes></BrowserRouter>;
}
