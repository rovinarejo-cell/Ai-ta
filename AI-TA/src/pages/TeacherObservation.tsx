import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ObservationRatingField } from '../components/ObservationRatingField';
import { ObservationEvidence } from '../components/ObservationEvidence';
import { indicatorGroups, observationPrinciple, observationScale } from '../data/observationIndicators';
import { strengthOptions, supportOptions } from '../data/profileOptions';
import { createObservation } from '../data/observations';
import type { LearnerProfileData, TeacherObservationData } from '../types';

export function TeacherObservation({ learnerId, profile, observation, onSave, onClear }: { learnerId: string; profile: LearnerProfileData; observation?: TeacherObservationData; onSave: (data: TeacherObservationData) => void; onClear: () => void }) {
  const [draft, setDraft] = useState(() => observation ?? createObservation(learnerId, profile));
  const [message, setMessage] = useState('');
  const [clearRequested, setClearRequested] = useState(false);
  const [evidenceKey, setEvidenceKey] = useState(0);
  const navigate = useNavigate();
  const dirty = !observation || JSON.stringify(draft) !== JSON.stringify(observation);
  const change = <K extends keyof TeacherObservationData>(field: K, value: TeacherObservationData[K]) => { setDraft(previous => ({ ...previous, [field]: value })); setMessage(''); setClearRequested(false); };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft.teacher.trim() || !draft.activity.trim()) { setMessage('Enter the teacher and activity/task before saving.'); return; }
    const saved = { ...draft, teacher: draft.teacher.trim(), activity: draft.activity.trim(), additionalObservation: draft.additionalObservation.trim() };
    onSave(saved); setDraft(saved); setMessage('Observation saved for this learner in the current session.');
    if ((event.nativeEvent as SubmitEvent).submitter?.getAttribute('data-continue') === 'true') navigate(`/learners/${learnerId}/analysis`);
  };
  const clear = () => { onClear(); setDraft(createObservation(learnerId, profile)); setEvidenceKey(previous => previous + 1); setClearRequested(false); setMessage('Observation cleared for this learner. All ratings reset to 0 — Not observed.'); };
  return <form className="profile-form observation-form" onSubmit={submit}>
    <section className="card profile-section" aria-labelledby="observation-context"><h2 id="observation-context">Observation Context</h2><p>Record one classroom activity. Teacher and activity/task are required.</p>
      <dl className="observation-context"><div><dt>Learner name/code</dt><dd>{draft.context.name} · {draft.context.learnerCode}</dd></div><div><dt>Class/grade</dt><dd>{draft.context.grade}</dd></div><div><dt>Subject</dt><dd>{draft.context.subject}</dd></div></dl>
      <div className="profile-fields"><div><label htmlFor="observation-date">Date of observation</label><input id="observation-date" type="date" required value={draft.date} onChange={e => change('date', e.target.value)} /></div><div><label htmlFor="observation-teacher">Teacher</label><input id="observation-teacher" required maxLength={100} value={draft.teacher} onChange={e => change('teacher', e.target.value)} /></div><div className="full-width"><label htmlFor="observation-activity">Learning activity/task being observed</label><input id="observation-activity" required maxLength={250} placeholder="For example: Read a short story and discuss the main idea" value={draft.activity} onChange={e => change('activity', e.target.value)} /></div></div>
      <p className="profile-help">Context is captured from the saved learner profile when an observation begins.</p>
    </section>
    <section className="note scale-guide" aria-labelledby="scale-title"><h2 id="scale-title">Observation Scale</h2><div className="scale-levels">{observationScale.map(level => <div key={level.value}><strong>{level.value}</strong><span>{level.label}</span></div>)}</div><p>0 means no observation was recorded, not low ability. Leave an indicator at 0 if it was not relevant or there was no opportunity to observe it; explain context in an optional note. Do not combine these ratings into a diagnostic score.</p></section>
    <div className="indicator-sections">{indicatorGroups.map((group, index) => <section className="card observation-group" key={group.title} aria-labelledby={`group-${index}`}><h2 id={`group-${index}`}>{group.title}</h2><p>Rate each indicator using the same 0–3 scale. Expand a teacher note when context is useful.</p>{group.indicators.map(indicator => <ObservationRatingField key={indicator.id} id={indicator.id} label={indicator.label} value={draft.ratings[indicator.id]} onChange={value => change('ratings', { ...draft.ratings, [indicator.id]: value })} />)}</section>)}</div>
    <section className="card profile-section"><h2>Observation Summary</h2><label htmlFor="additional-observation">Additional teacher observation</label><textarea id="additional-observation" rows={5} maxLength={5000} placeholder="Describe what happened during the activity, including support offered and the learner’s response." value={draft.additionalObservation} onChange={e => change('additionalObservation', e.target.value)} /></section>
    <ObservationEvidence key={`strengths-${evidenceKey}`} id="activity-strength" legend="Observed strengths during this activity" options={strengthOptions.filter(value => value !== 'Other strength')} selected={draft.observedStrengths} onChange={value => change('observedStrengths', value)} />
    <ObservationEvidence key={`barriers-${evidenceKey}`} id="activity-barrier" legend="Observed barriers/difficulties" options={supportOptions.filter(value => value !== 'Other support need')} selected={draft.observedBarriers} onChange={value => change('observedBarriers', value)} />
    <section className="note privacy-note"><h2>Research Principle</h2><p>{observationPrinciple}</p><p>Session-only prototype. Use fictional classroom information; refreshing the page clears saved data.</p></section>
    <div className="profile-actions"><div className="form-actions"><button type="submit" className="button">Save Observation</button><button type="button" className="button secondary" onClick={() => setClearRequested(true)}>Clear</button></div>
      {clearRequested && <div className="note" role="group" aria-label="Confirm clearing observation"><p>Clear the draft and saved observation for this learner? This removes its Indicator Analysis summary too.</p><div className="form-actions"><button type="button" className="button secondary" onClick={clear}>Confirm clear</button><button type="button" className="button secondary" onClick={() => setClearRequested(false)}>Keep observation</button></div></div>}
      <p role="status" aria-live="polite">{message || (dirty ? 'Unsaved observation. Continue saves your current entries before opening the ratings summary.' : 'Saved observation is available during this session.')}</p>
      <div className="page-actions"><Link className="button secondary" to={`/learners/${learnerId}/profile`}>← Learner Profile</Link><button type="submit" data-continue="true" className="button">Continue to Indicator Analysis →</button></div>
    </div>
  </form>;
}
